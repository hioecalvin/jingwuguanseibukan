import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-4 text-neutral-300">This page may have moved, or the address may be incorrect.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-600">
        Go to dashboard
      </Link>
    </main>
  );
}
