// app/app/projects/[projectid]/_components/ProjectHeader.tsx
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function ProjectHeader({
  siteName,
  siteUrl,
}: {
  siteName: string;
  siteUrl: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-bold text-gray-900">{siteName}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          <span className="truncate">{siteUrl}</span>
          <Link
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Open site"
            aria-label="Open site"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <Link
        aria-label="Back to Projects"
        href="/app/projects"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Back to Projects"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">Back to Projects</span>
      </Link>
    </div>
  );
}
