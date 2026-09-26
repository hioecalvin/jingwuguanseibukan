import Image from "next/image";
import Link from "next/link";

export default function AuthenticationErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-red-900 bg-neutral-900 p-8 text-center shadow-2xl">
        <Image
          src="/js-logo.jpeg"
          alt="Jingwuguan Seibukan"
          width={96}
          height={96}
          className="mx-auto rounded-2xl"
          priority
        />
        <h1 className="mt-6 text-2xl font-bold">Confirmation link unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">
          This link is invalid, expired, or has already been used. You can return
          to login, or register again if your account was not created.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            tabIndex={0}
            className="rounded-lg bg-sky-700 px-4 py-2 font-semibold transition hover:bg-sky-600"
          >
            Return to login
          </Link>
          <Link
            href="/register"
            tabIndex={0}
            className="rounded-lg border border-neutral-600 px-4 py-2 font-semibold text-neutral-200 transition hover:bg-neutral-800"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
