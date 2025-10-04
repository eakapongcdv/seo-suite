import { Plus, X } from "lucide-react";
import ModalToggleButton from "@/app/components/ModalToggleButton";
import { createProjectAction } from "../actions";

export default function CreateProjectModal() {
  return (
    <details className="relative">
      <summary
        className="list-none inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        aria-label="Create project"
        title="Create project"
      >
        <Plus className="h-5 w-5" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-[520px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Create Project</div>
          <ModalToggleButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Close">
            <X className="h-4 w-4" />
          </ModalToggleButton>
        </div>

        <form action={createProjectAction} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Site name</label>
              <input
                name="siteName"
                placeholder="My Site"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Target locale</label>
              <input
                name="targetLocale"
                defaultValue="en"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Site URL</label>
              <input
                name="siteUrl"
                placeholder="https://example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* NEW: Figma config per project */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Figma File Key</label>
              <input
                name="figmaFileKey"
                placeholder="e.g. Y7POXMSBlGhvED21y8cB3q"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Figma Personal Access Token</label>
              <input
                name="figmaAccessToken"
                placeholder="figd_***"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeBaidu" value="true" />
            Include Baidu
          </label>

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
