import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
