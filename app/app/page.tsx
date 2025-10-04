import Link from "next/link";

export default function AppHome() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-600">Welcome! Start with the SEO Wizard to import pages and set priorities.</p>
      <div className="flex gap-3">
        <Link href="/app/seo/wizard" className="rounded-xl bg-black px-4 py-2 text-white">Open SEO Wizard</Link>
        <Link href="/app/projects" className="rounded-xl border px-4 py-2">View All Projects</Link>
      </div>
    </main>
  );
}
