"use client";

import SubmitButton from "@/app/components/SubmitButton";
import { RefreshCw } from "lucide-react";
import Circular from "./../Circular";
import { PageRowProps } from "./types";
import { refreshLighthouseAction } from "../../actions";

type Props = { projectId: string; page: PageRowProps["page"] };

export default function LighthouseSection({ projectId, page }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Lighthouse Scores</div>
        <form action={refreshLighthouseAction}>
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton
            aria-label="Refresh Lighthouse"
            title="Refresh Lighthouse"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </SubmitButton>
        </form>
      </div>

      <div className="mb-2 flex gap-3">
        <Circular value={Number(page.lighthouseSeo ?? 0)} label="SEO" />
        <Circular value={Number(page.lighthousePerf ?? 0)} label="Perf" />
        <Circular value={Number(page.lighthouseAccessibility ?? 0)} label="A11y" />
      </div>
    </div>
  );
}
