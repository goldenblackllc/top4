import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/lib/spotify';

const SEARCH_URL = 'https://api.spotify.com/v1/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const token = await getSpotifyAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Spotify credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(query)}&type=artist&limit=8&market=US`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Spotify API error' },
        { status: res.status }
      );
    }

    const data = await res.json();

    const results = (data.artists?.items || []).map(
      (a: {
        id: string;
        name: string;
        genres?: string[];
        images?: { url: string; width: number }[];
      }) => ({
        id: a.id,
        title: a.name,
        subtitle: a.genres?.[0] || undefined,
        // Spotify provides multiple image sizes; pick the smallest that's >= 160px
        image_url:
          a.images?.sort((x: { width: number }, y: { width: number }) => x.width - y.width)
            .find((img: { width: number }) => img.width >= 160)?.url ||
          a.images?.[0]?.url ||
          undefined,
      })
    );

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: 'Failed to search artists' },
      { status: 500 }
    );
  }
}
