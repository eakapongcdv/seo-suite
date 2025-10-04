"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SerpPreview from "@/app/components/SerpPreview";
import { LighthouseCard } from "@/app/components/LighthouseCard";
import BaiduChecklist from "@/app/components/BaiduChecklist";
import { saveWizardToDB } from "./server"; // ✅ server action (มี "use server" ในไฟล์นี้อยู่แล้ว)

const ProjectSchema = z.object({
  siteName: z.string().min(2),
  siteUrl: z.string().url(),
  targetLocale: z.string().default("en"),
  includeBaidu: z.boolean().default(false),
});
type Project = z.infer<typeof ProjectSchema>;

const PageSchema = z.object({
  pageName: z.string().min(1),
  pageUrl: z.string().url(),
  pageDescriptionSummary: z.string().optional(),
  pageContentKeywords: z.array(z.string()).default([]),
  pageMetaDescription: z.string().optional(),
  pageSeoKeywords: z.array(z.string()).default([]),
  figmaNodeId: z.string().optional(),
});
type PageItem = z.infer<typeof PageSchema>;

type WizardState = {
  project?: Project;
  importMethod?: "manual" | "csv" | "sitemap";
  pages: PageItem[];
};

export default function SeoWizardPage() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({ pages: [] });
  const [isSaving, startTransition] = useTransition();

  const form1 = useForm<Project>({ resolver: zodResolver(ProjectSchema) });
  const [csvText, setCsvText] = useState<string>("");
  const [sitemapXml, setSitemapXml] = useState<string>("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const formPage = useForm<PageItem>({ resolver: zodResolver(PageSchema) });

  function next() {
    setStep((s) => Math.min(4, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">SEO Wizard</h1>
      <div className="flex items-center gap-2 text-sm">
        <span className={step >= 1 ? "font-semibold" : "text-gray-400"}>1. Project</span>
        <span>›</span>
        <span className={step >= 2 ? "font-semibold" : "text-gray-400"}>2. Import</span>
        <span>›</span>
        <span className={step >= 3 ? "font-semibold" : "text-gray-400"}>3. Details</span>
        <span>›</span>
        <span className={step >= 4 ? "font-semibold" : "text-gray-400"}>4. Review</span>
      </div>

      {step === 1 && (
        <form
          onSubmit={form1.handleSubmit((data) => {
            setState((s) => ({ ...s, project: data }));
            next();
          })}
          className="space-y-4 rounded-2xl border bg-white p-6"
        >
          <div>
            <label className="block text-sm font-medium">Site name</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" {...form1.register("siteName")} />
          </div>
          <div>
            <label className="block text-sm font-medium">Site URL</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="https://example.com"
              {...form1.register("siteUrl")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Target locale</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                defaultValue="en"
                {...form1.register("targetLocale")}
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" {...form1.register("includeBaidu")} /> Include Baidu SEO (China)
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="submit" className="rounded-xl bg-black px-4 py-2 text-white">
              Next
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-600">Choose how to load pages:</p>
          <div className="flex gap-3">
            <button
              className={`rounded-xl border px-4 py-2 ${state.importMethod === "manual" ? "bg-gray-900 text-white" : ""}`}
              onClick={() => setState((s) => ({ ...s, importMethod: "manual" }))}
            >
              Manual
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${state.importMethod === "csv" ? "bg-gray-900 text-white" : ""}`}
              onClick={() => setState((s) => ({ ...s, importMethod: "csv" }))}
            >
              CSV
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${state.importMethod === "sitemap" ? "bg-gray-900 text-white" : ""}`}
              onClick={() => setState((s) => ({ ...s, importMethod: "sitemap" }))}
            >
              Sitemap XML
            </button>
          </div>

          {state.importMethod === "manual" && <ManualAdd onAdd={(p) => setState((s) => ({ ...s, pages: [...s.pages, p] }))} />}

          {state.importMethod === "csv" && (
            <div className="space-y-2">
              <textarea
                className="h-40 w-full rounded-lg border p-2 font-mono text-xs"
                placeholder={`pageName,pageUrl,description
Home,https://example.com/,Welcome...`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <button
                className="rounded-xl bg-black px-4 py-2 text-white"
                onClick={() => {
                  const lines = csvText.split(/\r?\n/).filter(Boolean);
                  const pages: PageItem[] = [];
                  for (const line of lines) {
                    const [pageName, pageUrl, pageDescriptionSummary] = line.split(",");
                    if (pageName && pageUrl)
                      pages.push({
                        pageName,
                        pageUrl,
                        pageDescriptionSummary,
                        pageContentKeywords: [],
                        pageSeoKeywords: [],
                      });
                  }
                  setState((s) => ({ ...s, pages }));
                }}
              >
                Parse CSV
              </button>
            </div>
          )}

          {state.importMethod === "sitemap" && (
            <div className="space-y-2">
              <textarea
                className="h-40 w-full rounded-lg border p-2 font-mono text-xs"
                placeholder="Paste sitemap.xml here"
                value={sitemapXml}
                onChange={(e) => setSitemapXml(e.target.value)}
              />
              <button
                className="rounded-xl bg-black px-4 py-2 text-white"
                onClick={() => {
                  const urlMatches = Array.from(sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
                  const pages: PageItem[] = urlMatches.map((u) => ({
                    pageName: new URL(u).pathname.replace(/\/$/, "") || "root",
                    pageUrl: u,
                    pageContentKeywords: [],
                    pageSeoKeywords: [],
                  }));
                  setState((s) => ({ ...s, pages }));
                }}
              >
                Parse XML
              </button>
            </div>
          )}

          <div className="flex justify-between">
            <button className="rounded-xl border px-4 py-2" onClick={prev}>
              Back
            </button>
            <button className="rounded-xl bg-black px-4 py-2 text-white" onClick={next}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Page Details</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-3">
              {state.pages.map((p, i) => (
                <button
                  key={i}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    editIndex === i ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    setEditIndex(i);
                    formPage.reset(p);
                  }}
                >
                  <div>
                    <div className="font-medium">{p.pageName}</div>
                    <div className="truncate text-xs text-gray-500">{p.pageUrl}</div>
                  </div>
                  <span className="text-xs text-gray-500">{(p.pageSeoKeywords?.length || 0)} kw</span>
                </button>
              ))}
            </div>
            <div>
              {editIndex === null ? (
                <p className="text-sm text-gray-500">Select a page to edit details.</p>
              ) : (
                <form
                  onSubmit={formPage.handleSubmit((data) => {
                    setState((s) => ({
                      ...s,
                      pages: s.pages.map((p, idx) => (idx === editIndex ? { ...p, ...data } : p)),
                    }));
                  })}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm">Page name</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2" {...formPage.register("pageName")} />
                  </div>
                  <div>
                    <label className="block text-sm">URL</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2" {...formPage.register("pageUrl")} />
                  </div>
                  <div>
                    <label className="block text-sm">Description summary</label>
                    <textarea className="mt-1 w-full rounded-lg border p-2" rows={3} {...formPage.register("pageDescriptionSummary")} />
                  </div>
                  <div>
                    <label className="block text-sm">Content keywords (comma separated)</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                      onChange={(e) =>
                        formPage.setValue(
                          "pageContentKeywords",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm">Meta description (AI)</label>
                      <textarea className="mt-1 w-full rounded-lg border p-2" rows={3} {...formPage.register("pageMetaDescription")} />
                      <button
                        type="button"
                        className="mt-2 rounded-lg border px-3 py-1 text-sm"
                        onClick={async () => {
                          const seed = formPage.getValues("pageDescriptionSummary") || formPage.getValues("pageName");
                          formPage.setValue("pageMetaDescription", `Discover ${seed} — fast, clear, and helpful. Start now!`);
                        }}
                      >
                        AI Suggest
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm">SEO keywords (AI)</label>
                      <input
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                        onChange={(e) =>
                          formPage.setValue(
                            "pageSeoKeywords",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                      <button
                        type="button"
                        className="mt-2 rounded-lg border px-3 py-1 text-sm"
                        onClick={() => {
                          const base = formPage.getValues("pageContentKeywords") || [];
                          const uniq = Array.from(new Set((base as string[]).map((s) => s.toLowerCase()))).slice(0, 10);
                          formPage.setValue("pageSeoKeywords", uniq);
                        }}
                      >
                        AI Suggest
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm">Figma node-id</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2" {...formPage.register("figmaNodeId")} />
                  </div>

                  <SerpPreview
                    title={formPage.watch("pageName") || ""}
                    url={formPage.watch("pageUrl") || state.project?.siteUrl || ""}
                    description={formPage.watch("pageMetaDescription") || formPage.watch("pageDescriptionSummary") || ""}
                  />
                  <div className="mt-3" />
                  <LighthouseCard perf={null} seo={null} a11y={null} />
                  {state.project?.includeBaidu && (
                    <div className="mt-3">
                      <BaiduChecklist flags={{ titleLen: true, descLen: true, icp: false, robots: true, sitemapBaidu: false }} />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="rounded-xl bg-black px-4 py-2 text-white">
                      Save
                    </button>
                    <button type="button" className="rounded-xl border px-4 py-2" onClick={() => setEditIndex(null)}>
                      Close
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button className="rounded-xl border px-4 py-2" onClick={prev}>
              Back
            </button>
            <button className="rounded-xl bg-black px-4 py-2 text-white" onClick={next}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Review & Save</h2>
          <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
            {JSON.stringify(state, null, 2)}
          </pre>
          <div className="flex justify-between">
            <button className="rounded-xl border px-4 py-2" onClick={prev}>
              Back
            </button>

            {/* ✅ แก้: เรียก server action ผ่าน useTransition แทน form action + "use server" */}
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                startTransition(async () => {
                  await saveWizardToDB(state);
                  // TODO: redirect/toast ได้ตามต้องการ เช่น router.push("/app/pages")
                })
              }
            >
              {isSaving ? "Saving..." : "Save Project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualAdd({ onAdd }: { onAdd: (p: PageItem) => void }) {
  const f = useForm<PageItem>({ resolver: zodResolver(PageSchema) });
  return (
    <form
      onSubmit={f.handleSubmit((data) => {
        onAdd(data);
        f.reset();
      })}
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm">Page name</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...f.register("pageName")} />
        </div>
        <div>
          <label className="block text-sm">URL</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="https://..." {...f.register("pageUrl")} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Description summary</label>
          <textarea className="mt-1 w-full rounded-lg border p-2" rows={2} {...f.register("pageDescriptionSummary")} />
        </div>
      </div>
      <button type="submit" className="rounded-xl bg-black px-4 py-2 text-white">
        Add Page
      </button>
    </form>
  );
}
