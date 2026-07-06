/**
 * Test Spotify ALBUM search for movie soundtracks.
 * This searches for albums (not playlists) and gets the first track.
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

const MOVIES = [
  'A Man Called Ove',
  'Up',
  'Interstellar',
  'The Grand Tour',
];

async function main() {
  const token = await getToken();
  if (!token) { console.log('No Spotify token'); return; }

  for (const title of MOVIES) {
    console.log(`\n=== "${title}" ===`);

    // Search for albums
    const q = encodeURIComponent(title);
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=album&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const searchData = await searchRes.json();
    const albums = searchData?.albums?.items || [];

    console.log(`  Found ${albums.length} albums:`);
    for (const album of albums) {
      console.log(`    "${album.name}" by ${album.artists.map((a: any) => a.name).join(', ')} (${album.album_type}, ${album.total_tracks} tracks)`);
    }

    // Get first track from first album
    if (albums.length > 0) {
      const albumId = albums[0].id;
      const tracksRes = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=3`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const tracksData = await tracksRes.json();
      const tracks = tracksData?.items || [];
      console.log(`  First tracks from "${albums[0].name}":`);
      for (const t of tracks) {
        console.log(`    → "${t.name}" by ${t.artists.map((a: any) => a.name).join(', ')}`);
      }
    }
  }
}

main();
