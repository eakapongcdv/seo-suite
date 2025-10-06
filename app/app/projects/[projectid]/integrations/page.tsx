// app/app/projects/[projectid]/integrations/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  upsertGscIntegration,
  upsertFigmaIntegration,
  upsertRankApiIntegration,
  disconnectIntegration,
  triggerSyncIntegration,
  IntegrationTypeLiteral,
  testRankApiGoogleFormAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Params = { projectid: string };

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, siteName: true, siteUrl: true, targetLocale: true },
  });
  if (!project || project.ownerId !== session.user.id) return null;
  return project;
}

async function getData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      integrations: {
        select: {
          id: true,
          type: true,
          status: true,
          connectedAt: true,
          connectedBy: true,
          accountId: true,
          propertyUri: true,
          config: true,
          lastSyncAt: true,
          errorMsg: true,
        },
        orderBy: { type: "asc" },
      },
    },
  });
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      <XCircle className="h-3.5 w-3.5" /> Inactive
    </span>
  );
}

export default async function IntegrationsPage({ params }: { params: Params }) {
  const { projectid } = params;
  const project = await ensureOwner(projectid);
  if (!project) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-gray-600">You may not have access to this project.</p>
      </div>
    );
  }

  const data = await getData(projectid);
  if (!data) return <div className="p-6">Project not found.</div>;

  const byType = (t: IntegrationTypeLiteral) => data.integrations.find((i) => i.type === t);
  const gsc = byType("GSC");
  const figma = byType("FIGMA");
  const rank = byType("RANK_API");
  const vendor = String((rank?.config as any)?.vendor || "google").toLowerCase();
  const secret = (rank?.config as any)?.secret || {};
  const isGoogle = vendor === "google";

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="shrink-0">
          <Link
            href={`/app/projects/${projectid}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <div className="ml-auto min-w-0 text-right">
          <div className="truncate text-2xl font-bold">{project.siteName}</div>
          <div className="text-sm text-gray-500">Integrations</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* GSC */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Google Search Console</h2>
            <StatusBadge ok={gsc?.status === "ACTIVE"} />
          </div>

          {/* Save form */}
          <form action={upsertGscIntegration} className="space-y-3">
            <input type="hidden" name="projectId" value={projectid} />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Property URL / Domain</label>
              <input
                name="propertyUri"
                defaultValue={gsc?.propertyUri ?? ""}
                placeholder="https://example.com/ or sc-domain:example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {gsc?.connectedAt ? `Connected: ${new Date(gsc.connectedAt).toLocaleString()}` : "Not connected"}
                {gsc?.lastSyncAt ? ` • Last Sync: ${new Date(gsc.lastSyncAt).toLocaleString()}` : ""}
              </div>
              <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
                Save
              </button>
            </div>

            {gsc?.errorMsg && <p className="text-xs text-red-600">Error: {gsc.errorMsg}</p>}
          </form>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            <form action={triggerSyncIntegration}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="GSC" />
              <button className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </button>
            </form>
            <form action={disconnectIntegration}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="GSC" />
              <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">
                Disconnect
              </button>
            </form>
          </div>
        </section>

        {/* FIGMA */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Figma</h2>
            <StatusBadge ok={figma?.status === "ACTIVE"} />
          </div>

          {/* Save form */}
          <form action={upsertFigmaIntegration} className="space-y-3">
            <input type="hidden" name="projectId" value={projectid} />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Figma File Key</label>
              <input
                name="fileKey"
                defaultValue={(figma?.config as any)?.fileKey ?? ""}
                placeholder="abcdef1234567890"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Figma Access Token</label>
              <input
                name="token"
                defaultValue={(figma?.config as any)?.token ?? ""}
                placeholder="figd_xxx"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Scale</label>
                <input
                  name="scale"
                  type="number"
                  min={0.1}
                  step={0.1}
                  defaultValue={(figma?.config as any)?.scale ?? 1}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Format</label>
                <input
                  name="format"
                  defaultValue={(figma?.config as any)?.format ?? "png"}
                  placeholder="png | jpg"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {figma?.connectedAt ? `Connected: ${new Date(figma.connectedAt).toLocaleString()}` : "Not connected"}
                {figma?.lastSyncAt ? ` • Last Sync: ${new Date(figma.lastSyncAt).toLocaleString()}` : ""}
              </div>
              <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
                Save
              </button>
            </div>

            {figma?.errorMsg && <p className="text-xs text-red-600">Error: {figma.errorMsg}</p>}
          </form>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            <form action={triggerSyncIntegration}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="FIGMA" />
              <button className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </button>
            </form>
            <form action={disconnectIntegration}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="FIGMA" />
              <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">
                Disconnect
              </button>
            </form>
          </div>
        </section>

        {/* RANK API / Google Ads */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Rank API / Google Ads (Keyword Planner)</h2>
            <StatusBadge ok={rank?.status === "ACTIVE"} />
          </div>

          {/* Save form */}
          <form action={upsertRankApiIntegration} className="space-y-3">
            <input type="hidden" name="projectId" value={projectid} />

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Vendor</label>
              <select
                name="vendor"
                defaultValue={vendor}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="google">Google Ads (Keyword Planner)</option>
                <option value="bing">Bing</option>
                <option value="baidu">Baidu</option>
              </select>
            </div>

            {/* Google Ads block */}
            {isGoogle && (
              <div className="rounded-md border p-3 bg-gray-50">
                <div className="mb-2 text-xs font-semibold text-gray-700">Google Ads Credentials</div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Developer Token</label>
                      <input
                        name="developer_token"
                        defaultValue={secret?.developer_token ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Client ID</label>
                      <input
                        name="client_id"
                        defaultValue={secret?.client_id ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Client Secret</label>
                      <input
                        name="client_secret"
                        defaultValue={secret?.client_secret ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Refresh Token</label>
                      <input
                        name="refresh_token"
                        defaultValue={secret?.refresh_token ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Manager (Login) CID (optional)</label>
                      <input
                        name="login_customer_id"
                        defaultValue={secret?.login_customer_id ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="no dashes"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Customer ID</label>
                      <input
                        name="customer_id"
                        defaultValue={secret?.customer_id ?? ""}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="no dashes"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Property / Domain (optional)</label>
                    <input
                      name="propertyUri"
                      defaultValue={rank?.propertyUri ?? ""}
                      placeholder="https://example.com"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Generic vendor secret: แสดงเฉพาะที่ไม่ใช่ Google */}
            {!isGoogle && (
              <div className="rounded-md border p-3">
                <div className="mb-2 text-xs font-semibold text-gray-700">Generic Vendor Secret</div>
                <input
                  name="secret"
                  defaultValue={typeof secret === "string" ? secret : ""}
                  placeholder="provider-specific secret"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {rank?.connectedAt ? `Connected: ${new Date(rank.connectedAt).toLocaleString()}` : "Not connected"}
                {rank?.lastSyncAt ? ` • Last Sync: ${new Date(rank.lastSyncAt).toLocaleString()}` : ""}
              </div>
              <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
                Save
              </button>
            </div>

            {rank?.errorMsg && <p className="text-xs text-red-600">Error: {rank.errorMsg}</p>}
          </form>

          {/* Actions (ฟอร์มแยก ไม่ซ้อน) */}
          <div className="mt-2 flex items-center gap-2">
            <a
              href={`/api/google-ads/oauth/start?projectId=${projectid}`}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
            >
              Connect Google Ads
            </a>

            {/* ห้ามใส่ method/encType กับ server action form */}
            <form action={testRankApiGoogleFormAction}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="RANK_API" />
              <button
                type="submit"
                formNoValidate
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                title="Test Google Ads credentials (no save)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check API
              </button>
            </form>
      

            <form action={disconnectIntegration}>
              <input type="hidden" name="projectId" value={projectid} />
              <input type="hidden" name="type" value="RANK_API" />
              <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">
                Disconnect
              </button>
            </form>
          </div>
        </section>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>} />
    </div>
  );
}
