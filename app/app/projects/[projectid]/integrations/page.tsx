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

  const byType = (t: IntegrationTypeLiteral) =>
    data.integrations.find((i) => i.type === t);

  const gsc = byType("GSC");
  const figma = byType("FIGMA");
  const rank = byType("RANK_API");

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

      {/* GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* GSC */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Google Search Console</h2>
            <StatusBadge ok={gsc?.status === "ACTIVE"} />
          </div>

          {/* ฟอร์มหลัก (inputs) — ไม่มีปุ่มอยู่ข้างใน */}
          <form id="gsc-form">
            <input type="hidden" name="projectId" value={projectid} />
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Property URL / Domain
                </label>
                <input
                  name="propertyUri"
                  defaultValue={gsc?.propertyUri ?? ""}
                  placeholder="https://example.com/ or sc-domain:example.com"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </form>

          {/* แถวปุ่ม (ฟอร์มแยกกัน, ไม่มี nested form) */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {gsc?.connectedAt ? `Connected: ${new Date(gsc.connectedAt).toLocaleString()}` : "Not connected"}
              {gsc?.lastSyncAt ? ` • Last Sync: ${new Date(gsc.lastSyncAt).toLocaleString()}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <form action={triggerSyncIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="GSC" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Sync GSC"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync
                </button>
              </form>

              <form action={disconnectIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="GSC" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  title="Disconnect GSC"
                >
                  Disconnect
                </button>
              </form>

              {/* ปุ่ม Save อยู่นอกฟอร์ม แต่ชี้ไปที่ฟอร์มหลักด้วย form/formAction */}
              <button
                type="submit"
                form="gsc-form"
                formAction={upsertGscIntegration}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Save
              </button>
            </div>
          </div>

          {gsc?.errorMsg && (
            <p className="mt-2 text-xs text-red-600">Error: {gsc.errorMsg}</p>
          )}
        </section>

        {/* FIGMA */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Figma</h2>
            <StatusBadge ok={figma?.status === "ACTIVE"} />
          </div>

          <form id="figma-form">
            <input type="hidden" name="projectId" value={projectid} />
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Figma File Key
                </label>
                <input
                  name="fileKey"
                  defaultValue={(figma?.config as any)?.fileKey ?? ""}
                  placeholder="abcdef1234567890"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Figma Access Token
                </label>
                <input
                  name="token"
                  defaultValue={(figma?.config as any)?.token ?? ""}
                  placeholder="figd_xxx"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Scale
                  </label>
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
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Format
                  </label>
                  <input
                    name="format"
                    defaultValue={(figma?.config as any)?.format ?? "png"}
                    placeholder="png | jpg"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {figma?.connectedAt ? `Connected: ${new Date(figma.connectedAt).toLocaleString()}` : "Not connected"}
              {figma?.lastSyncAt ? ` • Last Sync: ${new Date(figma.lastSyncAt).toLocaleString()}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <form action={triggerSyncIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="FIGMA" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Sync Figma"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync
                </button>
              </form>

              <form action={disconnectIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="FIGMA" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  title="Disconnect Figma"
                >
                  Disconnect
                </button>
              </form>

              <button
                type="submit"
                form="figma-form"
                formAction={upsertFigmaIntegration}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Save
              </button>
            </div>
          </div>

          {figma?.errorMsg && (
            <p className="mt-2 text-xs text-red-600">Error: {figma.errorMsg}</p>
          )}
        </section>

        {/* RANK API */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Rank API</h2>
            <StatusBadge ok={rank?.status === "ACTIVE"} />
          </div>

          <form id="rank-form">
            <input type="hidden" name="projectId" value={projectid} />
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Vendor
                </label>
                <select
                  name="vendor"
                  defaultValue={(rank?.config as any)?.vendor ?? "google"}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="google">Google</option>
                  <option value="bing">Bing</option>
                  <option value="baidu">Baidu</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  API Key / Secret
                </label>
                <input
                  name="secret"
                  defaultValue={(rank?.config as any)?.secret ?? ""}
                  placeholder="provider-specific secret"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Property / Domain (optional)
                </label>
                <input
                  name="propertyUri"
                  defaultValue={rank?.propertyUri ?? ""}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {rank?.connectedAt ? `Connected: ${new Date(rank.connectedAt).toLocaleString()}` : "Not connected"}
              {rank?.lastSyncAt ? ` • Last Sync: ${new Date(rank.lastSyncAt).toLocaleString()}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <form action={triggerSyncIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="RANK_API" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Sync Rank API"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync
                </button>
              </form>

              <form action={disconnectIntegration}>
                <input type="hidden" name="projectId" value={projectid} />
                <input type="hidden" name="type" value="RANK_API" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  title="Disconnect Rank API"
                >
                  Disconnect
                </button>
              </form>

              <button
                type="submit"
                form="rank-form"
                formAction={upsertRankApiIntegration}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Save
              </button>
            </div>
          </div>

          {rank?.errorMsg && (
            <p className="mt-2 text-xs text-red-600">Error: {rank.errorMsg}</p>
          )}
        </section>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>} />
    </div>
  );
}
