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
  title: "Shopenter — LINE OA Commerce Platform",
  description: "Multi-tenant e-commerce platform for LINE Official Account merchants. Manage orders, products, customers, and payments.",
  robots: "index, follow",
  openGraph: {
    title: "Shopenter — LINE OA Commerce Platform",
    description: "Sell on LINE OA. Manage orders, products, customers, and payments in one place.",
    url: siteUrl,
    siteName: "Shopenter",
    type: "website",
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "Shopenter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopenter — LINE OA Commerce Platform",
    description: "Sell on LINE OA. Manage orders, products, customers, and payments in one place.",
    images: [`${siteUrl}/og-image.png`],
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
