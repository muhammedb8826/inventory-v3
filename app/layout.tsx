import type { Metadata } from "next";
import localFont from 'next/font/local';
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakarta = localFont({ src: './fonts/jakarta-latin.woff2', variable: '--font-plus-jakarta', weight: '400 700', display: 'swap' });
const ibmPlexMono = localFont({ src: [
  { path: './fonts/plex-mono-regular-latin.woff2', weight: '400' },
  { path: './fonts/plex-mono-medium-latin.woff2', weight: '500' },
], variable: '--font-ibm-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: "Stock Management System",
  description: "Multi-location inventory, sales, purchases, and financial reporting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
