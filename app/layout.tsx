import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Jingwuguan Seibukan",
    template: "%s | Jingwuguan Seibukan",
  },

  description:
    "Jingwuguan Seibukan Member Management and Martial Arts Repository",

  applicationName: "Jingwuguan Seibukan",

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
