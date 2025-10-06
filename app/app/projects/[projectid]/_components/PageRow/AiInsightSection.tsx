// app/app/projects/[projectid]/_components/PageRow/AiInsightSection.tsx
"use client";

import SubmitButton from "@/app/components/SubmitButton";
import { Sparkles } from "lucide-react";
import MarkdownProse from "@/app/components/MarkdownProse";
import { PageRowProps } from "./types";
import { mapLocaleToKeywordLang, keywordLangLabel } from "./utils";
import { aiSeoInsightAction } from "../../actions";

type Props = {
  projectId: string;
  projectTargetLocale?: string | null;
  page: PageRowProps["page"];
};

export default function AiInsightSection({ projectId, projectTargetLocale, page }: Props) {
  const kLang = mapLocaleToKeywordLang(projectTargetLocale);
  const label = keywordLangLabel(kLang);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          AI SEO Insight <span className="ml-1 text-xs text-gray-500">({label})</span>
        </div>
        <form action={aiSeoInsightAction}>
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          {/* ภาษา keywords สำหรับการวิเคราะห์ */}
          <input type="hidden" name="preferredKeywordsLanguage" value={kLang} />
          {/* ภาษาเอาต์พุต/ตัวอย่าง/คำแนะนำ = ตาม targetLocale */}
          <input type="hidden" name="preferredOutputLanguage" value={kLang} />
          <SubmitButton
            aria-label="Re-run analysis"
            title="Re-run analysis"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            วิเคราะห์ใหม่
          </SubmitButton>
        </form>
      </div>

      {page.aiSeoInsight ? (
        <MarkdownProse markdown={page.aiSeoInsight} />
      ) : (
        <p className="text-sm text-gray-500">
          ยังไม่มี Insight — กด “วิเคราะห์ใหม่” (ผลลัพธ์จะเป็นภาษาตามเป้าหมายของโปรเจกต์)
        </p>
      )}
    </div>
  );
}
