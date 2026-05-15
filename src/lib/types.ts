export type Category = 'movies' | 'tv' | 'artists' | 'books';

export interface Top4Item {
  rank: number; // 1-4
  title: string;
  subtitle?: string; // auto-filled: director, genre, author
  image_url?: string; // poster, artist photo, book cover
  external_id?: string; // tmdb id, itunes id, open library key
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Top4Entry {
  id: string;
  user_id: string;
  category: Category;
  items: Top4Item[];
  updated_at: string;
  like_count?: number;
}

/** A single card in the feed: one user + one category */
export interface Top4Card {
  profile: UserProfile;
  entry: Top4Entry;
}

/** Search result returned by our API routes */
export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
}

export const CATEGORIES: Category[] = ['movies', 'tv', 'artists', 'books'];

export const CATEGORY_CONFIG: Record<Category, {
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  bgClass: string;
  searchPlaceholder: string;
}> = {
  movies: {
    label: 'Movies',
    emoji: '🎬',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b22, #d9770622)',
    bgClass: 'category-movies',
    searchPlaceholder: 'Search movies...',
  },
  tv: {
    label: 'TV Shows',
    emoji: '📺',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec489922, #9d174d22)',
    bgClass: 'category-tv',
    searchPlaceholder: 'Search TV shows...',
  },
  artists: {
    label: 'Artists',
    emoji: '🎵',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #a78bfa22, #7c3aed22)',
    bgClass: 'category-artists',
    searchPlaceholder: 'Search artists...',
  },
  books: {
    label: 'Books',
    emoji: '📚',
    color: '#2dd4bf',
    gradient: 'linear-gradient(135deg, #2dd4bf22, #14b8a622)',
    bgClass: 'category-books',
    searchPlaceholder: 'Search books...',
  },
};
