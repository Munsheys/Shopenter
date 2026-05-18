import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  weight: ['300', '400', '600', '700', '800'],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopenter.app';

export const metadata: Metadata = {
  title: "Shopenter — All-in-One LINE OA Store Management Platform",
  description: "Turn your LINE Official Account into a full store. Manage products, orders, customers, broadcasts, and payments from one dashboard built for Thai LINE merchants.",
  robots: "index, follow",
  openGraph: {
    title: "Shopenter — All-in-One LINE OA Store Management Platform",
    description: "Run your LINE OA store with ease. Manage products, orders, customers, campaigns, and payments from one dashboard made for Thai merchants.",
    url: siteUrl,
    siteName: "Shopenter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopenter — All-in-One LINE OA Store Management Platform",
    description: "Run your LINE OA store with ease. Manage products, orders, customers, campaigns, and payments from one dashboard made for Thai merchants.",
  },
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
