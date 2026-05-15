import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SEARCH_URL = 'https://api.spotify.com/v1/search';

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) return null;

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };

  return cachedToken.token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const token = await getAccessToken();
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
      // Token may have expired, clear cache
      cachedToken = null;
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
