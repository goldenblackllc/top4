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
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'TMDB API error' },
        { status: res.status }
      );
    }

    const data = await res.json();

    const results = (data.results || [])
      .slice(0, 8)
      .map((m: { id: number; title: string; release_date?: string; poster_path?: string }) => ({
        id: String(m.id),
        title: m.title,
        subtitle: m.release_date ? m.release_date.split('-')[0] : undefined,
        image_url: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : undefined,
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}
