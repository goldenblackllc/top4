import { NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'TMDB API error' }, { status: res.status });
    }

    const data = await res.json();

    const results = (data.results || [])
      .slice(0, 8)
      .map((s: { id: number; name: string; first_air_date?: string; poster_path?: string }) => ({
        id: String(s.id),
        title: s.name,
        subtitle: s.first_air_date ? s.first_air_date.split('-')[0] : undefined,
        image_url: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : undefined,
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to search TV shows' }, { status: 500 });
  }
}
