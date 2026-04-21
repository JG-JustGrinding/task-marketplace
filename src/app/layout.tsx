import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bountask";
const defaultDescription = `${siteName} is a modern task marketplace where anyone can post tasks, complete work, and get paid.`;
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: "%s | " + siteName,
  },
  description: defaultDescription,
  openGraph: {
    title: siteName,
    description: defaultDescription,
    siteName,
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${lato.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
