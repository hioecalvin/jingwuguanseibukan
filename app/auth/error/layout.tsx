import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmation link unavailable",
};

export default function AuthenticationErrorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
