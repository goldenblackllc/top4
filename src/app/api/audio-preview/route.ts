import { NextResponse } from 'next/server';
import { resolvePreviewUrl } from '@/lib/audio/resolveAudioPreview';

/**
 * GET /api/audio-preview?title=...&category=...&subtitle=...
 *
 * Resolves an audio preview URL for a given item.
 * Uses iTunes Search API with Spotify playlist fallback,
 * backed by a Firestore cache for rate-limit safety.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const category = searchParams.get('category')?.trim();
  const subtitle = searchParams.get('subtitle')?.trim() || undefined;

  if (!title || !category) {
    return NextResponse.json(
      { error: 'Missing required parameters: title, category' },
      { status: 400 }
    );
  }

  try {
    const previewUrl = await resolvePreviewUrl(title, category, subtitle);

    return NextResponse.json({ preview_url: previewUrl });
  } catch (error) {
    console.error('[Audio Preview] Error:', error);
    return NextResponse.json({ preview_url: null });
  }
}
