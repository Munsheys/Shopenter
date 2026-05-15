import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  weight: ['300', '400', '600', '700', '800'],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Shopenter — LINE OA Commerce Platform",
  description: "Multi-tenant e-commerce platform for LINE Official Account merchants. Manage orders, products, customers, and payments.",
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
