import { NextResponse } from 'next/server';

const GB_BASE = 'https://www.googleapis.com/books/v1/volumes';
const OL_SEARCH = 'https://openlibrary.org/search.json';
const OL_COVERS = 'https://covers.openlibrary.org/b';

type BookResult = {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  _score?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  // Try Google Books first
  const results = await searchGoogleBooks(query);
  if (results !== null) {
    return NextResponse.json(results);
  }

  // Fallback: Open Library (no quota, very reliable)
  const fallback = await searchOpenLibrary(query);
  return NextResponse.json(fallback);
}

async function searchGoogleBooks(query: string): Promise<BookResult[] | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `${GB_BASE}?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance${apiKey ? `&key=${apiKey}` : ''}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      console.warn('Google Books unavailable, falling back to Open Library. Status:', res.status);
      return null; // trigger fallback
    }

    const data = await res.json();
    const queryWords = query.toLowerCase().split(/\s+/);

    const mapped: BookResult[] = (data.items || [])
      .filter((item: { volumeInfo?: { title?: string } }) => item.volumeInfo?.title)
      .map((item: {
        id: string;
        volumeInfo: {
          title: string;
          authors?: string[];
          imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        };
      }) => {
        let image_url = item.volumeInfo.imageLinks?.thumbnail
          || item.volumeInfo.imageLinks?.smallThumbnail;
        if (image_url) {
          image_url = image_url
            .replace(/^http:\/\//, 'https://')
            .replace('&edge=curl', '');
        }
        const titleLower = item.volumeInfo.title.toLowerCase();
        const score = queryWords.filter(w => titleLower.includes(w)).length;
        return {
          id: item.id,
          title: item.volumeInfo.title,
          subtitle: item.volumeInfo.authors?.[0] || undefined,
          image_url: image_url || undefined,
          _score: score,
        };
      });

    return mapped
      .sort((a, b) => (b._score ?? 0) - (a._score ?? 0))
      .slice(0, 8)
      .map(({ _score: _, ...rest }) => rest);
  } catch (err) {
    console.warn('Google Books error, falling back:', err);
    return null;
  }
}

async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  try {
    const res = await fetch(
      `${OL_SEARCH}?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,cover_edition_key`,
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Top4App/1.0 (https://top4.info)' },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.docs || [])
      .filter((b: { title?: string }) => b.title)
      .slice(0, 8)
      .map((b: {
        key: string;
        title: string;
        author_name?: string[];
        cover_i?: number;
        cover_edition_key?: string;
      }) => {
        let image_url: string | undefined;
        if (b.cover_i) image_url = `${OL_COVERS}/id/${b.cover_i}-M.jpg`;
        else if (b.cover_edition_key) image_url = `${OL_COVERS}/olid/${b.cover_edition_key}-M.jpg`;
        return {
          id: b.key,
          title: b.title,
          subtitle: b.author_name?.[0] || undefined,
          image_url,
        };
      });
  } catch {
    return [];
  }
}
