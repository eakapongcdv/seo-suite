"use client";

import Link from "next/link";
import { Save as SaveIcon, Trash2, ExternalLink } from "lucide-react";
import { PageRowProps } from "./types";
import { updatePageAction, deletePageAction } from "../../actions";

type Props = Pick<PageRowProps, "projectId" | "page">;

export default function HeaderBar({ projectId, page }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
      <form action={updatePageAction} className="contents">
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="projectId" value={projectId} />

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">Sort</label>
          <input
            name="sortNumber"
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            defaultValue={page.sortNumber ?? 0}
            className="h-9 w-14 rounded-lg border border-gray-300 px-2 text-center text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
          <input
            name="pageName"
            defaultValue={page.pageName}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-5">
          <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
          <div className="flex items-center gap-2">
            <input
              name="pageUrl"
              defaultValue={page.pageUrl}
              className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {page.pageUrl ? (
              <Link
                href={page.pageUrl}
                target={page.pageUrl.startsWith("/") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Open page"
                aria-label="Open page"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-1 flex items-end">
          <button
            type="submit"
            aria-label="Save"
            title="Save"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <SaveIcon className="h-4 w-4" />
            <span className="sr-only">Save</span>
          </button>
        </div>
      </form>

      <div className="md:col-span-1 flex items-end justify-end">
        <form action={deletePageAction}>
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <button
            type="submit"
            aria-label="Delete"
            title="Delete"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </button>
        </form>
      </div>
    </div>
  );
}
