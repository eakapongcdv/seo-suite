"use client";

type Props = { updatedAt: Date | string };

export default function FooterUpdated({ updatedAt }: Props) {
  return (
    <div className="mt-2 text-xs text-gray-500">
      Updated: {new Date(updatedAt as any).toLocaleString()}
    </div>
  );
}
