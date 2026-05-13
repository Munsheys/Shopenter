import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  weight: ['300', '400', '600', '700', '800'],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "LineOA SaaS — Sell on LINE with Zero Code",
  description: "Turn your LINE Official Account into a powerful e-commerce store. Manage inventory, process orders, and grow your business.",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${promptFont.variable} font-sans h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
// Triggering new deployment with correct email
// Fix author name
