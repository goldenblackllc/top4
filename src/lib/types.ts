export type Category = 'movies' | 'tv' | 'artists' | 'books';

export interface Top4Item {
  rank: number; // 1-4
  title: string;
  subtitle?: string; // auto-filled: director, genre, author
  image_url?: string; // poster, artist photo, book cover
  external_id?: string; // tmdb id, itunes id, open library key
  preview_url?: string; // iTunes audio preview URL (M4A) for video sound
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

import type { Locale } from '@/lib/i18n/translations';

export const CATEGORIES: Category[] = ['movies', 'tv', 'artists', 'books'];

export interface CategoryConfig {
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  bgClass: string;
  searchPlaceholder: string;
}

/** Base config (visual properties only — no locale-dependent text). */
const CATEGORY_BASE: Record<Category, {
  emoji: string;
  color: string;
  gradient: string;
  bgClass: string;
}> = {
  movies: { emoji: '🎬', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b22, #d9770622)', bgClass: 'category-movies' },
  tv:      { emoji: '📺', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec489922, #9d174d22)', bgClass: 'category-tv' },
  artists: { emoji: '🎵', color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa22, #7c3aed22)', bgClass: 'category-artists' },
  books:   { emoji: '📚', color: '#2dd4bf', gradient: 'linear-gradient(135deg, #2dd4bf22, #14b8a622)', bgClass: 'category-books' },
};

const CATEGORY_TEXT: Record<Category, Record<Locale, { label: string; searchPlaceholder: string }>> = {
  movies:  { en: { label: 'Movies',   searchPlaceholder: 'Search movies...'    }, es: { label: 'Películas', searchPlaceholder: 'Buscar películas...' } },
  tv:      { en: { label: 'TV Shows', searchPlaceholder: 'Search TV shows...'  }, es: { label: 'Series',    searchPlaceholder: 'Buscar series...'    } },
  artists: { en: { label: 'Artists',  searchPlaceholder: 'Search artists...'   }, es: { label: 'Artistas',  searchPlaceholder: 'Buscar artistas...'  } },
  books:   { en: { label: 'Books',    searchPlaceholder: 'Search books...'     }, es: { label: 'Libros',    searchPlaceholder: 'Buscar libros...'    } },
};

/** Default English config — used where no locale context is available (e.g. server components). */
export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat, { ...CATEGORY_BASE[cat], ...CATEGORY_TEXT[cat].en }])
) as Record<Category, CategoryConfig>;

/** Locale-aware config getter — use in client components with useLocale(). */
export function getCategoryConfig(locale: Locale): Record<Category, CategoryConfig> {
  return Object.fromEntries(
    CATEGORIES.map((cat) => [cat, { ...CATEGORY_BASE[cat], ...CATEGORY_TEXT[cat][locale] }])
  ) as Record<Category, CategoryConfig>;
}
