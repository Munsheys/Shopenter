import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  weight: ['300', '400', '600', '700', '800'],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "LineOA CRM — Admin Dashboard",
  description: "Order fulfillment and customer management for LINE Official Account",
  robots: "noindex, nofollow",
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
