"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";

type Props = { className?: string };

export default function PendingSpinnerIcon({ className }: Props) {
  const { pending } = useFormStatus();
  return (
    <RefreshCw
      className={`h-4 w-4 ${pending ? "animate-spin" : ""} ${className || ""}`}
      aria-hidden="true"
    />
  );
}
