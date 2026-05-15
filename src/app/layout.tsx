import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Top4 — Share Your Favorite Things",
  description:
    "Pick your top 4 movies, artists, and books. See what everyone else loves. Simple, fast, and fun.",
  openGraph: {
    title: "Top4 — Share Your Favorite Things",
    description: "Pick your top 4 movies, artists, and books.",
    type: "website",
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
      </head>
      <body>{children}</body>
    </html>
  );
}
