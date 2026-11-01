import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Claim your member account", robots: { index: false, follow: false }, referrer: "no-referrer",
};
export default function ClaimLayout({ children }: { children: React.ReactNode }) { return children; }
