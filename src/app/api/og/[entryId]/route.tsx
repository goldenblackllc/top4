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
  avatar_url: string | null;
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
        background: 'linear-gradient(145deg, #08080d 0%, #14141f 50%, #08080d 100%)',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          fontSize: 80,
          fontWeight: 800,
          letterSpacing: '-3px',
        }}
      >
        <span style={{ color: '#ffffff' }}>top</span>
        <span style={{ color: '#a78bfa' }}>4</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 24,
          color: '#71717a',
          marginTop: 16,
        }}
      >
        Share your favorite things
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 18,
          color: '#52525b',
          marginTop: 12,
        }}
      >
        www.top4.info
      </div>
    </div>
  );
}

// --- Main card ---

function OGCard({
  entry,
  profile,
  cat,
}: {
  entry: EntryData;
  profile: ProfileData | null;
  cat: { emoji: string; color: string; label: string };
}) {
  const displayName = profile?.display_name ?? 'Someone';
  const avatarUrl = profile?.avatar_url;
  const likeCount = entry.like_count ?? 0;
  const items = (entry.items ?? []).slice(0, 4);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#08080d',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effect */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: -120,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cat.color}15 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: -100,
          left: -60,
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cat.color}10 0%, transparent 70%)`,
        }}
      />

      {/* Top accent bar */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 5,
          background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88, transparent)`,
        }}
      />

      {/* Header row: branding + URL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 48px 0',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              display: 'flex',
              fontSize: 36,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-1.5px',
            }}
          >
            top
          </span>
          <span
            style={{
              display: 'flex',
              fontSize: 36,
              fontWeight: 800,
              color: cat.color,
              letterSpacing: '-1.5px',
            }}
          >
            4
          </span>
        </div>

        {/* URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              display: 'flex',
              fontSize: 16,
              color: '#a1a1aa',
              fontWeight: 500,
            }}
          >
            www.top4.info
          </span>
        </div>
      </div>

      {/* User info + category */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              width={52}
              height={52}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                border: `2px solid ${cat.color}44`,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${cat.color}88, ${cat.color}44)`,
                fontSize: 22,
                fontWeight: 700,
                color: '#ffffff',
                border: `2px solid ${cat.color}44`,
              }}
            >
              {initial}
            </div>
          )}

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 700,
                color: '#f4f4f5',
                letterSpacing: '-0.5px',
              }}
            >
              {displayName}
            </span>
            {likeCount > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 14,
                  color: '#71717a',
                  marginTop: 2,
                }}
              >
                ♥ {likeCount} like{likeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            borderRadius: 28,
            background: `${cat.color}18`,
            border: `1.5px solid ${cat.color}35`,
          }}
        >
          <span style={{ display: 'flex', fontSize: 22 }}>{cat.emoji}</span>
          <span
            style={{
              display: 'flex',
              fontSize: 20,
              fontWeight: 700,
              color: cat.color,
              letterSpacing: '-0.3px',
            }}
          >
            {cat.label}
          </span>
        </div>
      </div>

      {/* Items grid — 2x2 layout */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          padding: '4px 48px 0',
          flex: 1,
        }}
      >
        {items.map((item, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: 'calc(50% - 5px)',
                padding: '14px 16px',
                borderRadius: 16,
                background: isFirst
                  ? `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}08 100%)`
                  : 'rgba(255,255,255,0.04)',
                border: isFirst
                  ? `1px solid ${cat.color}30`
                  : '1px solid rgba(255,255,255,0.06)',
                gap: 14,
              }}
            >
              {/* Item image or rank */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  width={entry.category === 'artists' ? 56 : 44}
                  height={entry.category === 'artists' ? 56 : 62}
                  style={{
                    borderRadius: entry.category === 'artists' ? '50%' : 8,
                    objectFit: 'cover',
                    border: isFirst ? `2px solid ${cat.color}50` : '1px solid rgba(255,255,255,0.1)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: entry.category === 'artists' ? '50%' : 10,
                    background: isFirst ? cat.color : 'rgba(255,255,255,0.08)',
                    fontSize: 22,
                    fontWeight: 800,
                    color: isFirst ? '#08080d' : '#71717a',
                    flexShrink: 0,
                  }}
                >
                  {item.rank ?? idx + 1}
                </div>
              )}

              {/* Title + subtitle + rank */}
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
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {item.image_url && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: isFirst ? cat.color : 'rgba(255,255,255,0.1)',
                        fontSize: 13,
                        fontWeight: 800,
                        color: isFirst ? '#08080d' : '#a1a1aa',
                        flexShrink: 0,
                      }}
                    >
                      {item.rank ?? idx + 1}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'flex',
                      fontSize: isFirst ? 20 : 18,
                      fontWeight: isFirst ? 700 : 600,
                      color: isFirst ? '#ffffff' : '#d4d4d8',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {item.title.length > 22 ? item.title.slice(0, 20) + '...' : item.title}
                  </span>
                </div>
                {item.subtitle && (
                  <span
                    style={{
                      display: 'flex',
                      fontSize: 13,
                      color: '#71717a',
                      marginTop: 3,
                      marginLeft: item.image_url ? 32 : 0,
                    }}
                  >
                    {item.subtitle.length > 28 ? item.subtitle.slice(0, 26) + '...' : item.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 48px 20px',
        }}
      >
        <span
          style={{
            display: 'flex',
            fontSize: 14,
            color: '#52525b',
          }}
        >
          Share your top 4 at www.top4.info
        </span>
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
        emoji: 'twemoji',
        headers: {
          'Cache-Control':
            'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    const entry = entrySnap.data() as EntryData;

    // Resolve category config
    const cat = CATEGORY_CONFIG[entry.category] ?? {
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
      <OGCard entry={entry} profile={profile} cat={cat} />,
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

    return new ImageResponse(<FallbackCard />, {
      width: 1200,
      height: 630,
      emoji: 'twemoji',
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  }
}
