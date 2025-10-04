// app/app/projects/[projectid]/_components/ProjectMetrics.tsx
import Circular from "./Circular";

export default function ProjectMetrics({
  totalPages,
  checklistPct,
  checklistDone,
  seoAvg,
}: {
  totalPages: number;
  checklistPct: number;
  checklistDone: number;
  seoAvg: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-3">
      <div className="text-sm text-gray-700">
        <div className="text-xs text-gray-500">Pages</div>
        <div className="text-base font-semibold">{totalPages}</div>
      </div>
      <div>
        <Circular value={totalPages > 0 ? checklistPct : 0} label={`${checklistDone}/${totalPages} pages with SEO keywords`} />
      </div>
      <div>
        <Circular value={seoAvg} label={`Avg SEO score: ${seoAvg}/100`} />
      </div>
    </div>
  );
}
