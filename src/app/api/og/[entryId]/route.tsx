import { ImageResponse } from 'next/og';
import { db } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

// --- Category config ---

const CATEGORY_CONFIG: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  movies: { emoji: '🎬', color: '#f59e0b', label: 'Movies' },
  tv: { emoji: '📺', color: '#ec4899', label: 'TV Shows' },
  artists: { emoji: '🎵', color: '#a78bfa', label: 'Artists' },
  books: { emoji: '📚', color: '#2dd4bf', label: 'Books' },
};

// --- Types ---

interface EntryItem {
  rank: number;
  title: string;
  subtitle?: string;
  image_url?: string;
}

interface EntryData {
  user_id: string;
  category: string;
  items: EntryItem[];
  like_count: number;
  updated_at: unknown;
}

interface ProfileData {
  display_name: string;
  avatar_url: string;
}

// --- Fallback card ---

function FallbackCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #08080d 0%, #12121a 50%, #08080d 100%)',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: '-2px',
        }}
      >
        top4
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 28,
          color: '#71717a',
          marginTop: 16,
        }}
      >
        Share your favorites
      </div>
    </div>
  );
}

// --- Main card ---

function OGCard({
  entry,
  profile,
  categoryConfig,
}: {
  entry: EntryData;
  profile: ProfileData | null;
  categoryConfig: { emoji: string; color: string; label: string };
}) {
  const displayName = profile?.display_name ?? 'Anonymous';
  const likeCount = entry.like_count ?? 0;
  const items = (entry.items ?? []).slice(0, 4);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #08080d 0%, #12121a 50%, #0d0d14 100%)',
        color: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Top color accent bar */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 6,
          background: `linear-gradient(90deg, ${categoryConfig.color} 0%, ${categoryConfig.color}99 70%, transparent 100%)`,
        }}
      />

      {/* Content area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 56px 36px 56px',
          flex: 1,
        }}
      >
        {/* Header: user info + category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          {/* User display name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 700,
                color: '#e4e4e7',
                letterSpacing: '-0.5px',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                color: '#52525b',
                marginLeft: 12,
              }}
            >
              top 4
            </div>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: `${categoryConfig.color}1a`,
              border: `1px solid ${categoryConfig.color}33`,
              borderRadius: 24,
              padding: '8px 20px',
            }}
          >
            <div style={{ display: 'flex', fontSize: 20, marginRight: 8 }}>
              {categoryConfig.emoji}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 600,
                color: categoryConfig.color,
              }}
            >
              {categoryConfig.label}
            </div>
          </div>
        </div>

        {/* Items list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 4,
          }}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 16,
                background:
                  idx === 0
                    ? `linear-gradient(135deg, ${categoryConfig.color}14 0%, transparent 60%)`
                    : 'rgba(255,255,255,0.03)',
              }}
            >
              {/* Rank number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background:
                    idx === 0
                      ? categoryConfig.color
                      : 'rgba(255,255,255,0.08)',
                  fontSize: 20,
                  fontWeight: 800,
                  color: idx === 0 ? '#08080d' : '#a1a1aa',
                  marginRight: 20,
                  flexShrink: 0,
                }}
              >
                {item.rank ?? idx + 1}
              </div>

              {/* Title + subtitle */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: idx === 0 ? 26 : 22,
                    fontWeight: idx === 0 ? 700 : 600,
                    color: idx === 0 ? '#ffffff' : '#d4d4d8',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {item.title}
                </div>
                {item.subtitle && (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 16,
                      color: '#71717a',
                      marginTop: 4,
                    }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: likes + branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Like count */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {likeCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 18,
                  color: '#71717a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    marginRight: 8,
                    color: '#ef4444',
                  }}
                >
                  ♥
                </div>
                <div style={{ display: 'flex' }}>
                  {likeCount.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 800,
                color: '#52525b',
                letterSpacing: '-1px',
              }}
            >
              top4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Route handler ---

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;

    // Fetch the entry doc
    const entrySnap = await db.collection('top4_entries').doc(entryId).get();

    if (!entrySnap.exists) {
      return new ImageResponse(<FallbackCard />, {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control':
            'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    const entry = entrySnap.data() as EntryData;

    // Resolve category config (fallback to a neutral style)
    const categoryConfig = CATEGORY_CONFIG[entry.category] ?? {
      emoji: '📋',
      color: '#a1a1aa',
      label: entry.category ?? 'List',
    };

    // Fetch the owner's profile
    let profile: ProfileData | null = null;
    if (entry.user_id) {
      const profileSnap = await db
        .collection('profiles')
        .doc(entry.user_id)
        .get();
      if (profileSnap.exists) {
        profile = profileSnap.data() as ProfileData;
      }
    }

    return new ImageResponse(
      <OGCard
        entry={entry}
        profile={profile}
        categoryConfig={categoryConfig}
      />,
      {
        width: 1200,
        height: 630,
        emoji: 'twemoji',
        headers: {
          'Cache-Control':
            'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[og] Failed to generate image:', error);

    // Return a fallback card on any error
    return new ImageResponse(<FallbackCard />, {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  }
}
