import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isolatedBrowserSmoke =
  process.env.BROWSER_SMOKE_MODE === "isolated-local" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321" &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
    "sb_publishable_local_build_placeholder";

const connectSources = [
  "'self'",
  // @react-pdf/renderer loads its embedded layout WASM from a data URL when
  // users generate official records and certificates in the browser.
  "data:",
  supabaseUrl,
  supabaseUrl?.replace(/^https:/, "wss:"),
].filter((value): value is string => Boolean(value));

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Permit WebAssembly compilation for React-PDF without enabling general
  // JavaScript eval in production.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(" ")}`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  process.env.NODE_ENV === "production" && !isolatedBrowserSmoke
    ? "upgrade-insecure-requests"
    : "",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  ...(isolatedBrowserSmoke ? { distDir: ".next-browser-smoke" } : {}),
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
