"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main aria-labelledby="page-error-title" className="mx-auto max-w-lg px-6 py-16">
      <h1 id="page-error-title" className="text-2xl font-semibold">Unable to load this page</h1>
      <p role="alert" className="mt-4 text-neutral-300">
        Something went wrong. Try again, or return to your dashboard.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <button type="button" onClick={retry} className="rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-600">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-neutral-600 px-4 py-3">Go to dashboard</Link>
      </div>
    </main>
  );
}
