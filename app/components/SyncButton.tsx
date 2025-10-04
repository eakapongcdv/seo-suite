"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

type Props = {
  className?: string;
  idleText?: string;
  loadingText?: string;
};

export default function SyncButton({
  className,
  idleText = "Sync Figma",
  loadingText = "Syncing...",
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "w-full rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
      }
      aria-busy={pending}
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        {pending && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
          </svg>
        )}
        <span>{pending ? loadingText : idleText}</span>
      </span>
    </button>
  );
}
