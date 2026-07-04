import type { Metadata } from 'next';
import { db } from '@/lib/firebase/admin';
import UserProfileClient from './UserProfileClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://top4.app';

const CATEGORY_LABELS: Record<string, string> = {
  movies: 'Movies',
  tv: 'TV Shows',
  artists: 'Artists',
  books: 'Books',
};

const CATEGORY_EMOJI: Record<string, string> = {
  movies: '🎬',
  tv: '📺',
  artists: '🎵',
  books: '📚',
};

type Props = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  try {
    // Fetch profile
    const profileSnap = await db.collection('profiles').doc(userId).get();
    if (!profileSnap.exists) {
      return {
        title: 'User not found — Top4',
        description: 'This profile does not exist.',
      };
    }

    const profile = profileSnap.data()!;
    const displayName = profile.display_name || 'Someone';

    // Fetch their entries to build a rich description
    const entriesSnap = await db
      .collection('top4_entries')
      .where('user_id', '==', userId)
      .get();

    const categories: string[] = [];
    let firstEntryId: string | null = null;

    for (const doc of entriesSnap.docs) {
      const data = doc.data();
      const items = data.items as { title: string }[];
      if (items?.some((i) => i.title)) {
        const cat = data.category as string;
        const label = CATEGORY_LABELS[cat] || cat;
        const emoji = CATEGORY_EMOJI[cat] || '';
        categories.push(`${emoji} ${label}`);
        if (!firstEntryId) firstEntryId = doc.id;
      }
    }

    const description =
      categories.length > 0
        ? `${displayName}'s favorites: ${categories.join(', ')}. See their Top 4 picks!`
        : `Check out ${displayName}'s profile on Top4!`;

    const ogImageUrl = firstEntryId
      ? `${SITE_URL}/api/og/${firstEntryId}`
      : `${SITE_URL}/api/og/default`;

    return {
      title: `${displayName}'s Top 4 — Top4`,
      description,
      openGraph: {
        title: `${displayName}'s Top 4 Lists`,
        description,
        url: `${SITE_URL}/u/${userId}`,
        siteName: 'Top4',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${displayName}'s Top 4 Lists`,
          },
        ],
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${displayName}'s Top 4 Lists`,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (err) {
    console.error('[generateMetadata] Error:', err);
    return {
      title: 'Top4 — Share Your Favorite Things',
      description: 'Pick your top 4 movies, artists, and books.',
    };
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  return <UserProfileClient userId={userId} />;
}
