import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}