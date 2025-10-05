import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  className?: string;
};

export default function MarkdownProse({ markdown, className }: Props) {
  // ไม่รองรับ raw HTML โดยจงใจ (ปลอดภัยกว่า) — ถ้าจำเป็นค่อยเพิ่ม rehype-raw/rehype-sanitize
  return (
    <div className={["prose prose-neutral max-w-none", className].filter(Boolean).join(" ")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown || ""}
      </ReactMarkdown>
    </div>
  );
}
