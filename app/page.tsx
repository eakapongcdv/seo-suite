import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">SEO Management Suite (Starter)</h1>
      <p className="text-gray-600">Sign in to start the website SEO wizard.</p>
      <Link href="/signin" className="inline-block rounded-xl bg-black px-4 py-2 text-white">
        Get Started
      </Link>
    </main>
  );
}
