import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { LocaleProvider } from "@/lib/i18n";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08080d",
};

export const metadata: Metadata = {
  title: "Top4 — Share Your Favorite Things",
  description:
    "Pick your top 4 movies, artists, and books. See what everyone else loves. Simple, fast, and fun.",
  openGraph: {
    title: "Top4 — Share Your Favorite Things",
    description: "Pick your top 4 movies, artists, and books.",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Top4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
      </head>
      <body>
        <LocaleProvider>
          <ServiceWorkerRegistrar />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
