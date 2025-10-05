"use client";

import { useFormStatus } from "react-dom";
import SpinnerIcon from "./SpinnerIcon";
import { ReactNode } from "react";

type Props = {
  "aria-label"?: string;
  title?: string;
  className?: string;
  /** เนื้อหาตอน idle ให้ส่งเป็น ReactNode เช่น <Sparkles className="h-4 w-4" /> */
  children?: ReactNode;
};

export default function SubmitButton({
  "aria-label": ariaLabel,
  title,
  className = "",
  children,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      title={title}
      className={`${className} ${pending ? "opacity-70 cursor-not-allowed" : ""}`}
      disabled={pending}
    >
      {pending ? <SpinnerIcon className="h-4 w-4" /> : children}
      <span className="sr-only">{title || ariaLabel || "Submit"}</span>
    </button>
  );
}
