/**
 * Test Spotify PLAYLIST search for TV shows.
 * Search for playlists matching the show name, take the first playlist,
 * and get its first track.
 */

async function getToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

const TV_SHOWS = [
  "Clarkson's Farm",
  'Resident Alien',
  '90 Day Fiance',
  'The Grand Tour',
  'Just for Laughs Gags',
  'All Creatures Great & Small',
];

async function main() {
  const token = await getToken();
  if (!token) { console.log('No Spotify token'); return; }

  for (const title of TV_SHOWS) {
    console.log(`\n=== "${title}" ===`);

    const q = encodeURIComponent(title);
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const searchData = await searchRes.json();
    const playlists = searchData?.playlists?.items || [];

    console.log(`  Found ${playlists.length} playlists:`);
    for (const pl of playlists.slice(0, 3)) {
      console.log(`    "${pl.name}" by ${pl.owner?.display_name} (${pl.tracks?.total} tracks)`);
    }

    // Get first track from first playlist
    if (playlists.length > 0) {
      const pl = playlists[0];
      const tracksRes = await fetch(
        `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=3`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const tracksData = await tracksRes.json();
      const tracks = tracksData?.items || [];
      console.log(`  First tracks from "${pl.name}":`);
      for (const t of tracks) {
        const track = t.track;
        if (track) {
          console.log(`    → "${track.name}" by ${track.artists?.map((a: any) => a.name).join(', ')}`);
        }
      }
    }
  }
}

main();
