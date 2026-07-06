import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure font files + ffmpeg binary are bundled into Vercel serverless functions
  // (they're loaded at runtime via file paths, so @vercel/nft can't auto-detect them)
  outputFileTracingIncludes: {
    '/api/video/*': [
      './public/fonts/**/*',
      './node_modules/ffmpeg-static/**/*',
    ],
  },
  serverExternalPackages: ['sharp', 'ffmpeg-static'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },           // TMDB movie posters
      { protocol: 'https', hostname: 'books.google.com' },          // Google Books covers
      { protocol: 'https', hostname: 'covers.openlibrary.org' },    // Open Library (fallback)
      { protocol: 'https', hostname: 'i.scdn.co' },                 // Spotify artist images
      { protocol: 'https', hostname: '*.firebasestorage.app' },     // Firebase Storage avatars
      { protocol: 'https', hostname: '*.googleapis.com' },          // Google Storage
    ],
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
