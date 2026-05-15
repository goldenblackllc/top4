import type { Top4Card } from '@/lib/types';

// TMDB poster base
const P = 'https://image.tmdb.org/t/p/w185';

// Demo data — each card is ONE user + ONE category
// Image URLs are from TMDB (movies), Spotify-style placeholders (artists), Google Books (books)
export const DEMO_CARDS: Top4Card[] = [
  // ---- Sarah Chen ----
  {
    profile: { id: 'demo-1', display_name: 'Sarah Chen', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e1', user_id: 'demo-1', category: 'movies',
      items: [
        { rank: 1, title: 'Eternal Sunshine of the Spotless Mind', subtitle: '2004', image_url: `${P}/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg` },
        { rank: 2, title: 'Parasite', subtitle: '2019', image_url: `${P}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg` },
        { rank: 3, title: 'The Grand Budapest Hotel', subtitle: '2014', image_url: `${P}/eWDyYQreja2lPIuWnl4GCe9O7WH.jpg` },
        { rank: 4, title: 'Spirited Away', subtitle: '2001', image_url: `${P}/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg` },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-1', display_name: 'Sarah Chen', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e2', user_id: 'demo-1', category: 'artists',
      items: [
        { rank: 1, title: 'Radiohead', subtitle: 'Alternative Rock' },
        { rank: 2, title: 'Björk', subtitle: 'Art Pop' },
        { rank: 3, title: 'Frank Ocean', subtitle: 'R&B' },
        { rank: 4, title: 'Fiona Apple', subtitle: 'Alternative' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-1', display_name: 'Sarah Chen', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e3', user_id: 'demo-1', category: 'books',
      items: [
        { rank: 1, title: 'Kafka on the Shore', subtitle: 'Haruki Murakami' },
        { rank: 2, title: 'The Left Hand of Darkness', subtitle: 'Ursula K. Le Guin' },
        { rank: 3, title: 'Beloved', subtitle: 'Toni Morrison' },
        { rank: 4, title: 'Piranesi', subtitle: 'Susanna Clarke' },
      ],
      updated_at: new Date().toISOString(),
    },
  },

  // ---- Marcus Rivera ----
  {
    profile: { id: 'demo-2', display_name: 'Marcus Rivera', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e4', user_id: 'demo-2', category: 'movies',
      items: [
        { rank: 1, title: 'The Dark Knight', subtitle: '2008', image_url: `${P}/qJ2tW6WMUDux911BTUgMe1aLR7B.jpg` },
        { rank: 2, title: 'Goodfellas', subtitle: '1990', image_url: `${P}/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg` },
        { rank: 3, title: 'Blade Runner 2049', subtitle: '2017', image_url: `${P}/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg` },
        { rank: 4, title: 'No Country for Old Men', subtitle: '2007', image_url: `${P}/bj1v6YKF8yHqA489GFiHRgLkinB.jpg` },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-2', display_name: 'Marcus Rivera', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e5', user_id: 'demo-2', category: 'artists',
      items: [
        { rank: 1, title: 'Kendrick Lamar', subtitle: 'Hip Hop' },
        { rank: 2, title: 'The Roots', subtitle: 'Hip Hop' },
        { rank: 3, title: 'Anderson .Paak', subtitle: 'R&B' },
        { rank: 4, title: 'J Dilla', subtitle: 'Hip Hop' },
      ],
      updated_at: new Date().toISOString(),
    },
  },

  // ---- Emma Walsh ----
  {
    profile: { id: 'demo-3', display_name: 'Emma Walsh', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e6', user_id: 'demo-3', category: 'books',
      items: [
        { rank: 1, title: 'Normal People', subtitle: 'Sally Rooney' },
        { rank: 2, title: 'The Secret History', subtitle: 'Donna Tartt' },
        { rank: 3, title: 'Circe', subtitle: 'Madeline Miller' },
        { rank: 4, title: 'The Goldfinch', subtitle: 'Donna Tartt' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-3', display_name: 'Emma Walsh', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e7', user_id: 'demo-3', category: 'artists',
      items: [
        { rank: 1, title: 'Phoebe Bridgers', subtitle: 'Indie Rock' },
        { rank: 2, title: 'Bon Iver', subtitle: 'Indie Folk' },
        { rank: 3, title: 'The National', subtitle: 'Indie Rock' },
        { rank: 4, title: 'Sufjan Stevens', subtitle: 'Indie Folk' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-3', display_name: 'Emma Walsh', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e8', user_id: 'demo-3', category: 'movies',
      items: [
        { rank: 1, title: 'Lady Bird', subtitle: '2017', image_url: `${P}/iySFtKLrWvVIkNjEhMBR5AH7RQQ.jpg` },
        { rank: 2, title: 'Moonlight', subtitle: '2016', image_url: `${P}/4911T5FbJ9eD2Faz5Z8cT3SUhU3.jpg` },
        { rank: 3, title: 'Portrait of a Lady on Fire', subtitle: '2019', image_url: `${P}/2LquGwEhbg9OQUYGL3VGDAjSWD2.jpg` },
        { rank: 4, title: 'Everything Everywhere All at Once', subtitle: '2022', image_url: `${P}/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg` },
      ],
      updated_at: new Date().toISOString(),
    },
  },

  // ---- James Okoro ----
  {
    profile: { id: 'demo-4', display_name: 'James Okoro', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e9', user_id: 'demo-4', category: 'movies',
      items: [
        { rank: 1, title: 'Interstellar', subtitle: '2014', image_url: `${P}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg` },
        { rank: 2, title: 'The Matrix', subtitle: '1999', image_url: `${P}/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg` },
        { rank: 3, title: 'Arrival', subtitle: '2016', image_url: `${P}/x2FJsf1ElAgr63Y3LNxZq57Kv48.jpg` },
        { rank: 4, title: 'Inception', subtitle: '2010', image_url: `${P}/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg` },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-4', display_name: 'James Okoro', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e10', user_id: 'demo-4', category: 'artists',
      items: [
        { rank: 1, title: 'Daft Punk', subtitle: 'Electronic' },
        { rank: 2, title: 'Tame Impala', subtitle: 'Psychedelic Rock' },
        { rank: 3, title: 'Jamie xx', subtitle: 'Electronic' },
        { rank: 4, title: 'Four Tet', subtitle: 'Electronic' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-4', display_name: 'James Okoro', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e11', user_id: 'demo-4', category: 'books',
      items: [
        { rank: 1, title: 'Dune', subtitle: 'Frank Herbert' },
        { rank: 2, title: 'The Hitchhiker\'s Guide to the Galaxy', subtitle: 'Douglas Adams' },
        { rank: 3, title: 'Foundation', subtitle: 'Isaac Asimov' },
        { rank: 4, title: 'Neuromancer', subtitle: 'William Gibson' },
      ],
      updated_at: new Date().toISOString(),
    },
  },

  // ---- Aisha Patel ----
  {
    profile: { id: 'demo-5', display_name: 'Aisha Patel', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e12', user_id: 'demo-5', category: 'artists',
      items: [
        { rank: 1, title: 'Taylor Swift', subtitle: 'Pop' },
        { rank: 2, title: 'SZA', subtitle: 'R&B' },
        { rank: 3, title: 'Billie Eilish', subtitle: 'Pop' },
        { rank: 4, title: 'Olivia Rodrigo', subtitle: 'Pop' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-5', display_name: 'Aisha Patel', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e13', user_id: 'demo-5', category: 'books',
      items: [
        { rank: 1, title: 'A Little Life', subtitle: 'Hanya Yanagihara' },
        { rank: 2, title: 'The Song of Achilles', subtitle: 'Madeline Miller' },
        { rank: 3, title: 'Anxious People', subtitle: 'Fredrik Backman' },
        { rank: 4, title: 'The Seven Husbands of Evelyn Hugo', subtitle: 'Taylor Jenkins Reid' },
      ],
      updated_at: new Date().toISOString(),
    },
  },

  // ---- Tom Nakamura ----
  {
    profile: { id: 'demo-6', display_name: 'Tom Nakamura', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e14', user_id: 'demo-6', category: 'movies',
      items: [
        { rank: 1, title: 'Pulp Fiction', subtitle: '1994', image_url: `${P}/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg` },
        { rank: 2, title: 'Fight Club', subtitle: '1999', image_url: `${P}/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg` },
        { rank: 3, title: 'Drive', subtitle: '2011', image_url: `${P}/602vevIURmpDfzbnv5Ubi6wIkQm.jpg` },
        { rank: 4, title: 'Whiplash', subtitle: '2014', image_url: `${P}/ePXuKdXZuJx8hHMNr2yM4jY2L7Z.jpg` },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-6', display_name: 'Tom Nakamura', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e15', user_id: 'demo-6', category: 'artists',
      items: [
        { rank: 1, title: 'Arctic Monkeys', subtitle: 'Indie Rock' },
        { rank: 2, title: 'The Strokes', subtitle: 'Indie Rock' },
        { rank: 3, title: 'Gorillaz', subtitle: 'Alternative' },
        { rank: 4, title: 'LCD Soundsystem', subtitle: 'Electronic' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
  {
    profile: { id: 'demo-6', display_name: 'Tom Nakamura', avatar_url: null, created_at: new Date().toISOString() },
    entry: {
      id: 'e16', user_id: 'demo-6', category: 'books',
      items: [
        { rank: 1, title: '1984', subtitle: 'George Orwell' },
        { rank: 2, title: 'Slaughterhouse-Five', subtitle: 'Kurt Vonnegut' },
        { rank: 3, title: 'The Road', subtitle: 'Cormac McCarthy' },
        { rank: 4, title: 'Blood Meridian', subtitle: 'Cormac McCarthy' },
      ],
      updated_at: new Date().toISOString(),
    },
  },
];
