// app/components/ModalToggleButton.tsx
"use client";

import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  mode?: "close" | "toggle";
};

export default function ModalToggleButton({
  className,
  mode = "close",
  onClick,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        // ปุ่มนี้จะปิด/สลับ <details> ที่ห่ออยู่ใกล้ที่สุด
        const details = (e.currentTarget.closest("details") as HTMLDetailsElement | null);
        if (details) {
          if (mode === "toggle") details.open = !details.open;
          else details.open = false;
        }
        // เรียก onClick ดั้งเดิมถ้ามี
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
