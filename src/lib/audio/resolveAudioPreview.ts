import { db } from '@/lib/firebase/admin';
import { getSpotifyAccessToken } from '@/lib/spotify';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItunesResult {
  previewUrl: string;
  trackName: string;
  artistName: string;
  collectionName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Small delay to stay within iTunes rate-limit guidelines. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize a cache key to lowercase `"{category}:{title}"`. */
function makeCacheKey(category: string, title: string): string {
  return `${category.toLowerCase()}:${title.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Firestore cache helpers
// ---------------------------------------------------------------------------

const CACHE_COLLECTION = 'audio_cache';

/**
 * Read a cached preview URL from Firestore.
 *
 * @param cacheKey - The normalized cache key (e.g. `"movies:inception"`).
 * @returns The cached `preview_url`, `'EMPTY'` if previously resolved as null,
 *          or `null` if not cached at all.
 */
async function getCached(cacheKey: string): Promise<string | 'EMPTY' | null> {
  try {
    const doc = await db.collection(CACHE_COLLECTION).doc(cacheKey).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    // Distinguish between "cached as empty" and "has a URL"
    if (data.is_empty) return 'EMPTY';
    return data.preview_url ?? null;
  } catch (err) {
    console.log('[Audio] Cache read error:', err);
    return null;
  }
}

/**
 * Write a preview URL (or null for an empty result) to the Firestore cache.
 *
 * @param cacheKey   - The normalized cache key.
 * @param previewUrl - The resolved preview URL, or `null` if nothing was found.
 * @param meta       - Optional metadata for debugging (e.g. source, track name).
 */
async function setCache(
  cacheKey: string,
  previewUrl: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      preview_url: previewUrl,
      cached_at: new Date().toISOString(),
      ...meta,
    };

    if (previewUrl === null) {
      payload.is_empty = true;
    }

    await db.collection(CACHE_COLLECTION).doc(cacheKey).set(payload);
    console.log('[Audio] Cached result for', cacheKey);
  } catch (err) {
    console.log('[Audio] Cache write error:', err);
  }
}

// ---------------------------------------------------------------------------
// iTunes Search
// ---------------------------------------------------------------------------

/**
 * Search the iTunes Search API for a music track.
 *
 * @param term      - The search term (e.g. `"The Janitor Gaute Storaas"`).
 * @param attribute - Optional attribute filter (e.g. `"artistTerm"`).
 * @returns The first result with a preview URL, or `null`.
 */
export async function searchItunes(
  term: string,
  attribute?: 'artistTerm' | 'albumTerm' | 'songTerm',
): Promise<ItunesResult | null> {
  try {
    const encoded = encodeURIComponent(term);
    let url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=5`;
    if (attribute) url += `&attribute=${attribute}`;

    console.log('[Audio] iTunes search:', term, attribute ? `(${attribute})` : '');

    const res = await fetch(url);
    if (!res.ok) {
      console.log('[Audio] iTunes API error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      console.log('[Audio] iTunes: no results for', term);
      return null;
    }

    // Pick first result with a preview URL
    const match = data.results.find((r: Record<string, unknown>) => r.previewUrl);
    if (!match) {
      console.log('[Audio] iTunes: no results with previewUrl for', term);
      return null;
    }

    console.log(`[Audio] iTunes matched: "${match.trackName}" by ${match.artistName}`);

    return {
      previewUrl: match.previewUrl,
      trackName: match.trackName ?? '',
      artistName: match.artistName ?? '',
      collectionName: match.collectionName ?? '',
    };
  } catch (err) {
    console.log('[Audio] iTunes search error:', err);
    return null;
  }
}

/**
 * Search iTunes for a song BY a specific artist using a 2-step lookup:
 * 1. Find the artist entity to get their iTunes artist ID.
 * 2. Look up songs by that artist ID.
 *
 * This avoids the problem where searching for "Genesis" returns songs
 * NAMED "Genesis" (by Grimes, Justice, etc.) instead of songs BY Genesis.
 */
async function searchItunesByArtist(artistName: string): Promise<ItunesResult | null> {
  try {
    // Step 1: Find the artist
    const encoded = encodeURIComponent(artistName);
    console.log('[Audio] iTunes artist lookup:', artistName);

    const artistRes = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=musicArtist&limit=5`,
    );
    if (!artistRes.ok) return null;

    const artistData = await artistRes.json();
    const artists = artistData?.results || [];

    // Find exact (case-insensitive) match first, or closest match
    const exactMatch = artists.find(
      (a: Record<string, unknown>) =>
        (a.artistName as string).toLowerCase() === artistName.toLowerCase(),
    );
    const artist = exactMatch || artists[0];

    if (!artist) {
      console.log('[Audio] iTunes: no artist found for', artistName);
      return null;
    }

    console.log(`[Audio] iTunes found artist: "${artist.artistName}" (ID: ${artist.artistId})`);

    // Step 2: Look up songs by this artist ID
    await delay(100);
    const songsRes = await fetch(
      `https://itunes.apple.com/lookup?id=${artist.artistId}&entity=song&limit=5`,
    );
    if (!songsRes.ok) return null;

    const songsData = await songsRes.json();
    const tracks = (songsData?.results || []).filter(
      (r: Record<string, unknown>) => r.wrapperType === 'track' && r.previewUrl,
    );

    if (tracks.length === 0) {
      console.log('[Audio] iTunes: no songs found for artist', artist.artistName);
      return null;
    }

    const track = tracks[0];
    console.log(`[Audio] iTunes artist track: "${track.trackName}" by ${track.artistName}`);

    return {
      previewUrl: track.previewUrl,
      trackName: track.trackName ?? '',
      artistName: track.artistName ?? '',
      collectionName: track.collectionName ?? '',
    };
  } catch (err) {
    console.log('[Audio] iTunes artist lookup error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// iTunes Audiobook Search (for books)
// ---------------------------------------------------------------------------

/**
 * Search iTunes for an audiobook and return its preview URL.
 *
 * @param title - The book title (e.g. `"Rich Dad Poor Dad"`).
 * @returns The first audiobook result with a preview URL, or `null`.
 */
async function searchItunesAudiobook(title: string): Promise<ItunesResult | null> {
  try {
    const encoded = encodeURIComponent(title);
    const url = `https://itunes.apple.com/search?term=${encoded}&entity=audiobook&limit=5`;

    console.log('[Audio] iTunes audiobook search:', title);

    const res = await fetch(url);
    if (!res.ok) {
      console.log('[Audio] iTunes audiobook API error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      console.log('[Audio] iTunes: no audiobooks for', title);
      return null;
    }

    // Pick first result with a preview URL
    const match = data.results.find((r: Record<string, unknown>) => r.previewUrl);
    if (!match) {
      console.log('[Audio] iTunes: no audiobooks with previewUrl for', title);
      return null;
    }

    console.log(`[Audio] iTunes audiobook: "${match.collectionName}" by ${match.artistName}`);

    return {
      previewUrl: match.previewUrl,
      trackName: match.collectionName ?? '',
      artistName: match.artistName ?? '',
      collectionName: match.collectionName ?? '',
    };
  } catch (err) {
    console.log('[Audio] iTunes audiobook search error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Spotify Soundtrack Album Search (for movies)
// ---------------------------------------------------------------------------

/** Keywords that identify an album as a movie soundtrack. */
const SOUNDTRACK_KEYWORDS = ['soundtrack', 'score', 'motion picture', 'original film'];

/**
 * Search Spotify for the official soundtrack album of a movie and return
 * the first track's name and artist.
 *
 * @param title - The movie title (e.g. `"A Man Called Ove"`).
 * @returns The first track from the soundtrack, or `null`.
 */
async function searchSpotifySoundtrack(
  title: string,
): Promise<{ trackName: string; artistName: string } | null> {
  try {
    const token = await getSpotifyAccessToken();
    if (!token) {
      console.log('[Audio] No Spotify token — skipping soundtrack search');
      return null;
    }

    const q = encodeURIComponent(title);
    console.log('[Audio] Spotify album search for:', title);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=album&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!searchRes.ok) {
      console.log('[Audio] Spotify search error:', searchRes.status);
      return null;
    }

    const searchData = await searchRes.json();
    const albums = searchData?.albums?.items || [];

    if (albums.length === 0) {
      console.log('[Audio] Spotify: no albums found for', title);
      return null;
    }

    // Find the first album that looks like a soundtrack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soundtrackAlbum = albums.find((album: any) => {
      const name = album.name.toLowerCase();
      return SOUNDTRACK_KEYWORDS.some(kw => name.includes(kw));
    });

    if (!soundtrackAlbum) {
      console.log('[Audio] Spotify: no soundtrack album found among:', albums.map((a: any) => a.name).join(', '));
      return null;
    }

    console.log(`[Audio] Spotify found soundtrack: "${soundtrackAlbum.name}"`);

    // Get the first track from this album
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/albums/${soundtrackAlbum.id}/tracks?limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!tracksRes.ok) {
      console.log('[Audio] Spotify tracks error:', tracksRes.status);
      return null;
    }

    const tracksData = await tracksRes.json();
    const firstTrack = tracksData?.items?.[0];

    if (!firstTrack) {
      console.log('[Audio] Spotify: no tracks in album');
      return null;
    }

    const trackName = firstTrack.name;
    const artistName = firstTrack.artists?.map((a: any) => a.name).join(', ') || '';

    console.log(`[Audio] Spotify soundtrack track: "${trackName}" by ${artistName}`);
    return { trackName, artistName };
  } catch (err) {
    console.log('[Audio] Spotify soundtrack search error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Spotify Playlist Search (for TV shows)
// ---------------------------------------------------------------------------

/**
 * Search Spotify for playlists matching a TV show name and return the
 * first track from the top playlist.
 *
 * @param title - The TV show title (e.g. `"Clarkson's Farm"`).
 * @returns The first track from the best-matching playlist, or `null`.
 */
async function searchSpotifyPlaylist(
  title: string,
): Promise<{ trackName: string; artistName: string } | null> {
  try {
    const token = await getSpotifyAccessToken();
    if (!token) {
      console.log('[Audio] No Spotify token — skipping playlist search');
      return null;
    }

    const q = encodeURIComponent(title);
    console.log('[Audio] Spotify playlist search for:', title);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!searchRes.ok) {
      console.log('[Audio] Spotify playlist search error:', searchRes.status);
      return null;
    }

    const searchData = await searchRes.json();
    const playlists = searchData?.playlists?.items || [];

    if (playlists.length === 0) {
      console.log('[Audio] Spotify: no playlists found for', title);
      return null;
    }

    // Take the first (most popular) playlist
    const playlist = playlists[0];
    console.log(`[Audio] Spotify found playlist: "${playlist.name}" by ${playlist.owner?.display_name} (${playlist.tracks?.total} tracks)`);

    // Get the first track
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!tracksRes.ok) {
      console.log('[Audio] Spotify playlist tracks error:', tracksRes.status);
      return null;
    }

    const tracksData = await tracksRes.json();
    const firstItem = tracksData?.items?.[0]?.track;

    if (!firstItem) {
      console.log('[Audio] Spotify: no tracks in playlist');
      return null;
    }

    const trackName = firstItem.name;
    const artistName = firstItem.artists?.map((a: any) => a.name).join(', ') || '';

    console.log(`[Audio] Spotify playlist track: "${trackName}" by ${artistName}`);
    return { trackName, artistName };
  } catch (err) {
    console.log('[Audio] Spotify playlist search error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Resolve an audio preview URL for a Top 4 item.
 *
 * Resolution chain:
 * - **Artists**: iTunes artist ID lookup → songs by that artist.
 * - **Movies**: Spotify soundtrack album → first track → iTunes preview.
 * - **Books**: iTunes audiobook search.
 * - **TV**: Spotify playlist search → first track → iTunes preview.
 * - All results are cached in Firestore `audio_cache`.
 * - If nothing is found, the video route falls back to the user's #1 artist.
 *
 * @param title    - The item title (e.g. `"Inception"`).
 * @param category - The category (e.g. `"movies"`, `"artists"`).
 * @param subtitle - Optional subtitle (director, author, etc.).
 * @returns A preview URL string, or `null` if no preview could be found.
 */
export async function resolvePreviewUrl(
  title: string,
  category: string,
  subtitle?: string,
): Promise<string | null> {
  try {
    const cacheKey = makeCacheKey(category, title);

    // 1. Check cache.
    const cached = await getCached(cacheKey);
    if (cached === 'EMPTY') {
      console.log('[Audio] Cache hit (empty) for', cacheKey);
      return null;
    }
    if (cached !== null) {
      console.log('[Audio] Cache hit for', cacheKey);
      return cached;
    }

    console.log('[Audio] Cache miss for', cacheKey, '— resolving…');

    let result: ItunesResult | null = null;
    const meta: Record<string, unknown> = {};

    if (category === 'artists') {
      // ── Artists: 2-step lookup (find artist ID → get their songs) ──
      result = await searchItunesByArtist(title);
      meta.source = 'itunes_artist';

    } else if (category === 'movies') {
      // ── Movies: find the official soundtrack on Spotify, then look up on iTunes ──
      const soundtrackTrack = await searchSpotifySoundtrack(title);

      if (soundtrackTrack) {
        meta.source = 'spotify_soundtrack';
        meta.soundtrack_track = soundtrackTrack.trackName;
        meta.soundtrack_artist = soundtrackTrack.artistName;

        // Search iTunes for this specific track + artist
        const searchTerm = `${soundtrackTrack.trackName} ${soundtrackTrack.artistName}`;
        result = await searchItunes(searchTerm);

        // Fallback: try just the track name
        if (!result) {
          await delay(100);
          result = await searchItunes(soundtrackTrack.trackName);
        }
      }

    } else if (category === 'books') {
      // ── Books: search iTunes for audiobooks ──
      result = await searchItunesAudiobook(title);
      meta.source = 'itunes_audiobook';

    } else {
      // ── TV: Spotify playlist search → first track → iTunes preview ──
      const playlistTrack = await searchSpotifyPlaylist(title);

      if (playlistTrack) {
        meta.source = 'spotify_playlist';
        meta.playlist_track = playlistTrack.trackName;
        meta.playlist_artist = playlistTrack.artistName;

        const searchTerm = `${playlistTrack.trackName} ${playlistTrack.artistName}`;
        result = await searchItunes(searchTerm);

        if (!result) {
          await delay(100);
          result = await searchItunes(playlistTrack.trackName);
        }
      }
    }

    const previewUrl = result?.previewUrl ?? null;

    // Cache the result (even null).
    await setCache(cacheKey, previewUrl, meta);

    if (previewUrl) {
      console.log('[Audio] Resolved preview for', cacheKey, '→', previewUrl);
    } else {
      console.log('[Audio] No preview found for', cacheKey, '→ will use #1 artist fallback');
    }

    return previewUrl;
  } catch (err) {
    console.log('[Audio] resolvePreviewUrl error:', err);
    return null;
  }
}
