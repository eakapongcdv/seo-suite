// lib/googleAds.ts
import { prisma } from "@/lib/db";
import { GoogleAdsApi, enums } from "google-ads-api";

/** Credentials structure expected in projectIntegration.config.secret (JSON) */
type GoogleAdsSecret = {
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  login_customer_id?: string;            // MCC (no dashes)
  customer_id: string;                   // main account ID (with/without dashes)
  keyword_planner_customer_id?: string;  // optional: child CID for Keyword Planner (with/without dashes)
};

const mask = (s?: string) => (s ? `${String(s).slice(0, 3)}***${String(s).slice(-3)}` : "(none)");

/** Build Google Ads client for the ACTIVE RANK_API (vendor=google) integration of this project */
export async function getGoogleAdsClientForProject(projectId: string) {
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "RANK_API", status: "ACTIVE" },
    select: { config: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  if (!cfg?.vendor || String(cfg.vendor).toLowerCase() !== "google") {
    throw new Error("RANK_API is not set to vendor=google.");
  }

  const secret: GoogleAdsSecret =
    typeof cfg.secret === "string" ? JSON.parse(cfg.secret) : cfg.secret;

  if (!secret?.developer_token || !secret.client_id || !secret.client_secret || !secret.refresh_token) {
    throw new Error("Google Ads: missing OAuth credentials (developer_token/client_id/client_secret/refresh_token).");
  }

  const customerId = String(secret.customer_id || "").replace(/-/g, "").trim();
  const loginCustomerIdRaw = secret.login_customer_id
    ? String(secret.login_customer_id).replace(/-/g, "").trim()
    : undefined;

  if (!customerId) {
    throw new Error("Google Ads: customer_id is empty. Please enter a 10-digit Ads Account ID (no dashes).");
  }
  if (!/^\d{10}$/.test(customerId)) {
    throw new Error(`Google Ads: customer_id must be 10 digits (got "${customerId}").`);
  }

  // Don’t send login_customer_id if it equals customerId (avoid odd header behavior)
  const loginCustomerId =
    loginCustomerIdRaw && loginCustomerIdRaw !== customerId ? loginCustomerIdRaw : undefined;

  const client = new GoogleAdsApi({
    developer_token: secret.developer_token,
    client_id: secret.client_id,
    client_secret: secret.client_secret,
  });

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: secret.refresh_token,
    login_customer_id: loginCustomerId,
  });

  // Safe debug (masked)
  console.log("[GOOGADS][CLIENT]", {
    cid: customerId,
    mcc: loginCustomerId || "(none)",
    dev_token: mask(secret.developer_token),
    client_id: mask(secret.client_id),
  });

  return { customer, customerId, loginCustomerId, client, refreshToken: secret.refresh_token };
}

/** OPTIONAL: list accounts the current token can access (helps diagnose INVALID_VALUE vs access scope) */
export async function listAccessibleCustomers(client: any): Promise<string[]> {
  try {
    if (typeof client?.getService === "function") {
      const svc = client.getService("CustomerService");
      const res = await (svc as any).listAccessibleCustomers({});
      const ids = (res?.resourceNames || [])
        .map((r: string) => r.split("/")[1])
        .filter(Boolean);
      console.log("[ADS][ACCESSIBLE_CUSTOMERS]", { count: ids.length, ids });
      return ids as string[];
    }
  } catch (e: any) {
    console.warn("[ADS][ACCESSIBLE_CUSTOMERS][FAILED]", { message: e?.message });
  }
  return [];
}

/** Is current account a Manager (MCC)? */
async function isManagerAccount(customer: any): Promise<boolean> {
  const rows = await customer.query(`
    SELECT customer.id, customer.descriptive_name, customer.manager
    FROM customer
    LIMIT 1
  `);
  const c = rows?.[0]?.customer;
  return !!c?.manager;
}

/** Pick a ready child client under MCC for Keyword Planner (non-hidden, non-manager, non-test, has currency & timezone) */
async function resolveChildClientForKeywordIdeas(customer: any): Promise<string | null> {
  const rows = await customer.query(`
    SELECT
      customer_client.client_customer,
      customer_client.level,
      customer_client.hidden,
      customer_client.manager,
      customer_client.test_account,
      customer_client.currency_code,
      customer_client.time_zone
    FROM customer_client
    WHERE customer_client.level = 1
    LIMIT 500
  `);

  const pick = (rows || [])
    .map((r: any) => r?.customer_client)
    .filter(Boolean)
    .filter((cc: any) => !cc.hidden && !cc.manager && !cc.test_account && !!cc.currency_code && !!cc.time_zone)
    .map((cc: any) => String(cc.client_customer?.split("/")[1] || "").replace(/-/g, ""))
    .find((id: string) => /^\d{10}$/.test(id));

  return pick || null;
}

/** Resolve a language constant resource name via GAQL (avoid hard-coding IDs) */
async function resolveLanguageConstant(customer: any, code: string): Promise<string> {
  const lang = String(code || "").trim().toLowerCase();
  if (!lang) throw new Error("language_code is empty");

  // Try by exact code first (best)
  const rowsByCode = await customer.query(`
    SELECT language_constant.resource_name, language_constant.code, language_constant.id, language_constant.name
    FROM language_constant
    WHERE language_constant.code = '${lang}'
    LIMIT 1
  `);
  const foundByCode = rowsByCode?.[0]?.language_constant?.resource_name;
  if (foundByCode) return foundByCode;

  // Fallback by name contains (e.g., zh → Chinese)
  const rowsByName = await customer.query(`
    SELECT language_constant.resource_name, language_constant.code, language_constant.id, language_constant.name
    FROM language_constant
    WHERE LOWER(language_constant.name) LIKE '%${lang}%'
    LIMIT 1
  `);
  const foundByName = rowsByName?.[0]?.language_constant?.resource_name;
  if (foundByName) return foundByName;

  // Final fallback: English
  return "languageConstants/1000";
}

/** Log account readiness signals for debugging Keyword Planner access */
async function peekCustomerReadiness(customer: any, baseCustomerId: string) {
  const me = await customer.query(`
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.manager,
      customer.status
    FROM customer
    LIMIT 1
  `);

  const cc = await customer.query(`
    SELECT
      customer_client.client_customer,
      customer_client.level,
      customer_client.hidden,
      customer_client.manager,
      customer_client.test_account,
      customer_client.currency_code,
      customer_client.time_zone
    FROM customer_client
    WHERE customer_client.client_customer = 'customers/${baseCustomerId}'
    LIMIT 1
  `);

  console.log("[KWIDEA][PREFLIGHT]", {
    me: {
      id: me?.[0]?.customer?.id || null,
      name: me?.[0]?.customer?.descriptive_name || null,
      currency: me?.[0]?.customer?.currency_code || null,
      tz: me?.[0]?.customer?.time_zone || null,
      manager: !!me?.[0]?.customer?.manager,
      status: me?.[0]?.customer?.status || null,
    },
    cc: {
      level: cc?.[0]?.customer_client?.level ?? null,
      hidden: cc?.[0]?.customer_client?.hidden ?? null,
      manager: cc?.[0]?.customer_client?.manager ?? null,
      test_account: cc?.[0]?.customer_client?.test_account ?? null,
      currency: cc?.[0]?.customer_client?.currency_code ?? null,
      tz: cc?.[0]?.customer_client?.time_zone ?? null,
    },
  });
}

/**
 * Fetch avg_monthly_searches for given keywords with locale + geo using Keyword Plan Idea Service.
 * - If account is MCC: use keyword_planner_customer_id (if provided) OR auto-resolve a ready child client.
 * - Compatible with both property wrapper and getService() paths of google-ads-api.
 */
export async function fetchAvgMonthlySearches(
  projectId: string,
  keywords: string[],
  opts?: {
    language_code?: "th" | "en" | "zh"; // zh = Simplified (resolved via GAQL anyway)
    geo_target_constants?: string[];    // default: ["geoTargetConstants/2764"] Thailand
  }
): Promise<Array<{ keyword: string; avgMonthlySearches: number }>> {
  const { customer, customerId, loginCustomerId } = await getGoogleAdsClientForProject(projectId);

  // Read config again to get keyword_planner_customer_id
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "RANK_API", status: "ACTIVE" },
    select: { config: true },
  });
  const cfg = (integ?.config ?? {}) as any;
  const secret: GoogleAdsSecret = typeof cfg?.secret === "string" ? JSON.parse(cfg.secret) : cfg?.secret || {};

  // Choose CID to use for Keyword Planner
  let kpCustomerId =
    secret?.keyword_planner_customer_id
      ? String(secret.keyword_planner_customer_id).replace(/-/g, "").trim()
      : "";

  if (!/^\d{10}$/.test(kpCustomerId)) {
    const isMcc = await isManagerAccount(customer);
    kpCustomerId = isMcc ? (await resolveChildClientForKeywordIdeas(customer)) || "" : customerId;
  }

  if (!/^\d{10}$/.test(kpCustomerId)) {
    throw new Error(
      "No eligible child client found for Keyword Planner. Please set `keyword_planner_customer_id` to a non-manager 10-digit Ads Account under the MCC."
    );
  }

  // Preflight readiness info (debug only)
  await peekCustomerReadiness(customer, kpCustomerId);

  const language_code = opts?.language_code ?? "th";
  const geo_target_constants = opts?.geo_target_constants ?? ["geoTargetConstants/2764"]; // Thailand

  // Resolve language constant via GAQL (avoid hard-coded IDs)
  const language = await resolveLanguageConstant(customer, language_code);
  console.log("[KWIDEA][LANG]", { input: language_code, resolved: language });

  // Keywords: de-dupe, trim, cap at 100
  const seedKeywords = Array.from(new Set(keywords.map((s) => s.trim()).filter(Boolean))).slice(0, 100);
  if (seedKeywords.length === 0) return [];

  // Build payload: include both customerId & customer_id for compatibility
  const payload: any = {
    customerId: kpCustomerId,
    customer_id: kpCustomerId,
    language,
    geoTargetConstants: geo_target_constants,
    keywordPlanNetwork: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    keywordSeed: { keywords: seedKeywords },
    includeAdultKeywords: false,
  };

  console.log("[KWIDEA][REQ]", {
    cid_base: customerId,                 // customer() bound id
    mcc: loginCustomerId || "(none)",
    cid_for_kw: kpCustomerId,             // id used for Keyword Ideas
    has_customerId: !!payload.customerId,
    has_customer_id: !!payload.customer_id,
    language,
    geoTargets: geo_target_constants,
    seeds: seedKeywords,
  });

  try {
    const anyCustomer = customer as any;
    let resp: any;

    // Property wrapper path (some versions)
    if (anyCustomer?.keywordPlanIdeas?.generateKeywordIdeas) {
      resp = await anyCustomer.keywordPlanIdeas.generateKeywordIdeas(payload);

    // Service path (other versions)
    } else if (typeof anyCustomer?.getService === "function") {
      const svc = anyCustomer.getService("KeywordPlanIdeaService", {
        customer_id: kpCustomerId,
        login_customer_id: loginCustomerId,
      });
      resp = await (svc as any).generateKeywordIdeas(payload);

    } else {
      throw new TypeError("KeywordPlanIdeaService is not available in the current google-ads-api client.");
    }

    const ideas =
      resp?.results?.map((r: any) => ({
        keyword: String(r.text || ""),
        avgMonthlySearches: Number(r.keywordIdeaMetrics?.avgMonthlySearches ?? 0),
      })) ?? [];

    const requested = new Set(seedKeywords.map((k) => k.toLowerCase()));
    return ideas
      .filter((r) => requested.has(r.keyword.toLowerCase()))
      .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
  } catch (e: any) {
    // If INVALID_VALUE, try a one-shot fallback (EN + ascii seed) to distinguish param vs. account restriction
    let bodyObj: any = null;
    try { bodyObj = e?.meta?.body || e; } catch {}
    const codeStr = (() => { try { return JSON.stringify(bodyObj); } catch { return String(bodyObj); }})();
    const isInvalidValue = /INVALID_VALUE/i.test(codeStr);

    if (isInvalidValue) {
      console.warn("[KWIDEA][FALLBACK] retry with EN + ascii seed");
      const languageEN = "languageConstants/1000";
      const seedsEN = ["iphone"];
      const payload2: any = { ...payload, language: languageEN, keywordSeed: { keywords: seedsEN } };

      try {
        const anyCustomer2 = customer as any;
        let resp2: any;

        if (anyCustomer2?.keywordPlanIdeas?.generateKeywordIdeas) {
          resp2 = await anyCustomer2.keywordPlanIdeas.generateKeywordIdeas(payload2);
        } else if (typeof anyCustomer2?.getService === "function") {
          const svc2 = anyCustomer2.getService("KeywordPlanIdeaService", {
            customer_id: kpCustomerId,
            login_customer_id: loginCustomerId,
          });
          resp2 = await (svc2 as any).generateKeywordIdeas(payload2);
        } else {
          throw new TypeError("KeywordPlanIdeaService is not available in the current google-ads-api client.");
        }

        const ideas2 =
          resp2?.results?.map((r: any) => ({
            keyword: String(r.text || ""),
            avgMonthlySearches: Number(r.keywordIdeaMetrics?.avgMonthlySearches ?? 0),
          })) ?? [];

        console.log("[KWIDEA][FALLBACK][OK]", {
          language: languageEN,
          seeds: seedsEN,
          count: ideas2.length,
        });

        const requested2 = new Set(seedsEN.map((k) => k.toLowerCase()));
        return ideas2
          .filter((r) => requested2.has(r.keyword.toLowerCase()))
          .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
      } catch (e2: any) {
        console.error("[KWIDEA][FALLBACK][FAIL]", {
          message: e2?.message,
          body: (() => {
            try {
              let s = JSON.stringify(e2?.meta?.body || e2, null, 2);
              return s.length > 3000 ? s.slice(0, 3000) + "…(truncated)" : s;
            } catch { return String(e2); }
          })(),
        });
        // fallthrough to report original error below
      }
    }

    // Rich error log with hints & field path (if any)
    const firstError = Array.isArray(bodyObj?.errors) ? bodyObj.errors[0] : undefined;
    const fieldPath = firstError?.location?.field_path_elements
      ? firstError.location.field_path_elements.map((x: any) => x?.field_name).filter(Boolean).join(".")
      : undefined;

    let body = "";
    try {
      body = JSON.stringify(bodyObj || e, null, 2);
      if (body.length > 3000) body = body.slice(0, 3000) + "…(truncated)";
    } catch { body = String(e); }

    console.error("[KWIDEA][ERROR]", {
      cid_base: customerId,
      mcc: loginCustomerId || "(none)",
      cid_for_kw: kpCustomerId,
      hint:
        "INVALID_VALUE commonly means the child account isn't ready for Keyword Planner (billing/currency/timezone) or language/geo mismatch. We now resolve language via GAQL; please verify the child's billing readiness and developer-token access scope.",
      field: fieldPath || "(unknown)",
      request_id:
        e?.meta?.request_id || e?.response?.data?.request_id || e?.request_id || null,
      message: e?.message,
      code: e?.code,
      status: e?.status,
      body,
    });

    throw e;
  }
}
