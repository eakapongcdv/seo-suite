// app/api/google-ads/oauth/callback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthTokenResp = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function abs(req: Request, path: string) {
  const origin = new URL(req.url).origin;
  return new URL(path, origin).toString();
}

function decodeState(stateRaw: string | null): { projectId?: string } {
  try {
    return stateRaw ? JSON.parse(stateRaw) : {};
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = decodeState(url.searchParams.get("state"));
  const projectId = String(state.projectId || "");

  const redirectHome = abs(req, projectId ? `/app/projects/${projectId}/integrations` : "/");

  // Missing code -> back with error
  if (!code) {
    return NextResponse.redirect(`${redirectHome}?oauth=error&reason=no_code`);
  }

  // Load current integration (to read client_id/client_secret saved earlier)
  const existing = projectId
    ? await prisma.projectIntegration.findUnique({
        where: { projectId_type: { projectId, type: "RANK_API" } },
        select: { config: true },
      })
    : null;

  const cfg = (existing?.config ?? {}) as any;
  const vendor = String(cfg.vendor || "google").toLowerCase();

  if (vendor !== "google") {
    return NextResponse.redirect(`${redirectHome}?oauth=error&reason=vendor_not_google`);
  }

  // Prefer client credentials from DB; fallback to env for local testing
  const client_id =
    cfg?.secret?.client_id ||
    process.env.GADS_OAUTH_CLIENT_ID ||
    process.env.GOOGLE_ADS_CLIENT_ID ||
    "";
  const client_secret =
    cfg?.secret?.client_secret ||
    process.env.GADS_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_ADS_CLIENT_SECRET ||
    "";

  if (!client_id || !client_secret) {
    return NextResponse.redirect(
      `${redirectHome}?oauth=error&reason=missing_client&hint=set_client_id_secret_first`
    );
  }

  // The redirect URI must EXACT-MATCH what you configured in Google Cloud console.
  // Use the same one as /oauth/start built.
  const redirect_uri =
    process.env.NEXT_PUBLIC_GOOGLE_ADS_REDIRECT_URI ||
    abs(req, "/api/google-ads/oauth/callback");

  // Exchange code → tokens
  let tokenJson: OAuthTokenResp | null = null;
  try {
    const body = new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: "authorization_code",
    });

    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    tokenJson = (await resp.json()) as OAuthTokenResp;

    if (!resp.ok || tokenJson?.error) {
      const reason = tokenJson?.error || `http_${resp.status}`;
      const desc = tokenJson?.error_description || "";
      // Persist error on the integration for easier debugging
      if (projectId) {
        await prisma.projectIntegration.upsert({
          where: { projectId_type: { projectId, type: "RANK_API" } },
          create: {
            projectId,
            type: "RANK_API",
            status: "INACTIVE",
            errorMsg: `OAuth exchange failed: ${reason} ${desc}`,
            config: { vendor: "google", secret: { client_id, client_secret } },
          },
          update: {
            status: "INACTIVE",
            errorMsg: `OAuth exchange failed: ${reason} ${desc}`,
          },
        });
      }
      return NextResponse.redirect(
        `${redirectHome}?oauth=error&reason=${encodeURIComponent(reason)}`
      );
    }
  } catch (e: any) {
    const msg = e?.message || "token_request_failed";
    if (projectId) {
      await prisma.projectIntegration.upsert({
        where: { projectId_type: { projectId, type: "RANK_API" } },
        create: {
          projectId,
          type: "RANK_API",
          status: "INACTIVE",
          errorMsg: `OAuth exchange error: ${msg}`,
          config: { vendor: "google", secret: { client_id, client_secret } },
        },
        update: {
          status: "INACTIVE",
          errorMsg: `OAuth exchange error: ${msg}`,
        },
      });
    }
    return NextResponse.redirect(`${redirectHome}?oauth=error&reason=${encodeURIComponent(msg)}`);
  }

  // Save tokens to integration.config.secret (merge with existing)
  const access_token = tokenJson?.access_token || "";
  const refresh_token = tokenJson?.refresh_token || ""; // important for offline
  const expires_in = tokenJson?.expires_in || null;

  try {
    // make sure we keep previous fields (developer_token, login_customer_id, customer_id)
    const prevSecret = (cfg?.secret ?? {}) as any;
    const mergedSecret = {
      ...prevSecret,
      client_id,
      client_secret,
      access_token,
      refresh_token: refresh_token || prevSecret.refresh_token || "",
      expires_in,
      obtained_at: new Date().toISOString(),
    };

    await prisma.projectIntegration.upsert({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      create: {
        projectId,
        type: "RANK_API",
        status: refresh_token ? "ACTIVE" : "INACTIVE", // require refresh_token to mark active
        connectedAt: refresh_token ? new Date() : null,
        connectedBy: null,
        propertyUri: cfg?.propertyUri ?? null,
        config: { ...(cfg || {}), vendor: "google", secret: mergedSecret },
        errorMsg: refresh_token ? null : "OAuth succeeded without refresh_token (prompt=consent?).",
      },
      update: {
        status: refresh_token ? "ACTIVE" : "INACTIVE",
        connectedAt: refresh_token ? new Date() : null,
        config: { ...(cfg || {}), vendor: "google", secret: mergedSecret },
        errorMsg: refresh_token ? null : "OAuth succeeded without refresh_token (prompt=consent?).",
      },
    });

    const q = refresh_token ? "oauth=ok" : "oauth=partial_no_refresh";
    return NextResponse.redirect(`${redirectHome}?${q}`);
  } catch (e: any) {
    const msg = e?.message || "save_tokens_failed";
    try {
      await prisma.projectIntegration.upsert({
        where: { projectId_type: { projectId, type: "RANK_API" } },
        create: {
          projectId,
          type: "RANK_API",
          status: "INACTIVE",
          errorMsg: `Save tokens failed: ${msg}`,
          config: { vendor: "google", secret: { client_id, client_secret } },
        },
        update: {
          status: "INACTIVE",
          errorMsg: `Save tokens failed: ${msg}`,
        },
      });
    } catch {}
    return NextResponse.redirect(`${redirectHome}?oauth=error&reason=${encodeURIComponent(msg)}`);
  }
}
