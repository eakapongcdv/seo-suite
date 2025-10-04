// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "SEO Management Suite",
  description: "Next.js + NextAuth + SEO Wizard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* tip: ให้ app/app/layout.tsx จัด header/footer + ความกว้างเอง */}
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
