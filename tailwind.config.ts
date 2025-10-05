// tailwind.config.ts
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        // ปรับโทนให้คล้าย Medium เล็กน้อย
        neutral: {
          css: {
            "--tw-prose-body": "rgb(17 24 39)",         // text-gray-900
            "--tw-prose-headings": "rgb(17 24 39)",
            "--tw-prose-links": "rgb(37 99 235)",       // blue-600
            "--tw-prose-quote-borders": "rgb(229 231 235)",
            "--tw-prose-captions": "rgb(107 114 128)",
            a: { textDecoration: "none", fontWeight: "600" },
            h1: { marginBottom: "0.4em" },
            h2: { marginTop: "1.4em", marginBottom: "0.6em" },
            p: { lineHeight: "1.8" },
            code: { backgroundColor: "rgb(243 244 246)", padding: "0.15rem 0.35rem", borderRadius: "0.375rem" },
          },
        },
      },
    },
  },
  plugins: [typography, forms],
};

export default config;
