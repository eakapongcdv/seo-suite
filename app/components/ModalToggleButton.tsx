"use client";

/**
 * @param {{ children: React.ReactNode, className?: string, mode?: "close" | "toggle" }} props
 */
export default function ModalToggleButton({ children, className, mode = "close" }) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const details = e.currentTarget.closest("details");
        if (!details) return;
        if (mode === "toggle") {
          details.open = !details.open;
        } else {
          details.open = false;
        }
      }}
    >
      {children}
    </button>
  );
}
