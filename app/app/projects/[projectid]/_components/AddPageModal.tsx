// app/app/projects/[projectid]/_components/AddPageModal.tsx
import { Plus, X } from "lucide-react";
import ModalToggleButton from "@/app/components/ModalToggleButton";
import { createPageAction } from "../actions";

export default function AddPageModal({ projectId }: { projectId: string }) {
  return (
    <details className="relative">
      <summary
        className="list-none inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        aria-label="Add Page"
        title="Add Page"
      >
        <Plus className="h-5 w-5" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-[560px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Add New Page</div>
          <ModalToggleButton
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </ModalToggleButton>
        </div>

        <form action={createPageAction} className="space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
              <input
                name="sortNumber" type="number" defaultValue={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
              <input
                name="pageName" placeholder="e.g., About Us"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
              <input
                name="pageUrl" placeholder="e.g., /about"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Figma Node ID (optional)</label>
              <input
                name="figmaNodeId" placeholder="e.g., 1:23"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <ModalToggleButton className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm hover:bg-gray-50">
              Cancel
            </ModalToggleButton>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
