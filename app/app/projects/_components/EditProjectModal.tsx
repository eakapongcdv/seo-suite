import { X } from "lucide-react";
import ModalToggleButton from "@/app/components/ModalToggleButton";
import { updateProjectAction } from "../actions";

type ProjectLite = {
  id: string;
  siteName: string;
  siteUrl: string | null;
  targetLocale: string;
  includeBaidu: boolean;
};

export default function EditProjectModal({ p }: { p: ProjectLite }) {
  return (
    <details className="relative">
      <summary
        className="list-none inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        aria-label="Edit"
        title="Edit"
      >
        {/* pencil icon is provided by parent to keep bundle small, or you can import here */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.99-2.99a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
        </svg>
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-[520px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Edit Project</div>
          <ModalToggleButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Close">
            <X className="h-4 w-4" />
          </ModalToggleButton>
        </div>

        <form action={updateProjectAction} className="space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Site name</label>
              <input
                name="siteName"
                defaultValue={p.siteName}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Target locale</label>
              <input
                name="targetLocale"
                defaultValue={p.targetLocale}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Site URL</label>
              <input
                name="siteUrl"
                defaultValue={p.siteUrl ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeBaidu"
              value="true"
              defaultChecked={p.includeBaidu}
            />
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
              Save changes
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
