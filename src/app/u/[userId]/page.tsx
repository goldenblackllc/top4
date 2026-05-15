import { getProfile, getEntries } from '@/lib/firebase/firestore';
import { CATEGORY_CONFIG, type Top4Entry } from '@/lib/types';
import Header from '@/components/Header';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getProfile(userId);
  const name = profile?.display_name || 'Top4 User';
  return {
    title: `${name}'s Top 4 — top4`,
    description: `See ${name}'s favorite movies, artists, and books on top4.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [profile, entries] = await Promise.all([
    getProfile(userId),
    getEntries(userId),
  ]);

  if (!profile) {
    return (
      <div style={{ minHeight: '100dvh' }}>
        <Header />
        <div style={{ maxWidth: 540, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>👤</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>User not found</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            This profile doesn&apos;t exist or has been removed.
          </p>
          <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const filledEntries = entries.filter((e) => e.items.some((i) => i.title));

  return (
    <div style={{ minHeight: '100dvh' }}>
      <Header />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Profile header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: 16,
                border: '2px solid var(--color-border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-artists))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: 'white',
                margin: '0 auto 16px',
                border: '2px solid var(--color-border)',
              }}
            >
              {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {profile.display_name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
            {filledEntries.length} list{filledEntries.length !== 1 ? 's' : ''} · top4
          </p>
        </div>

        {/* Entries */}
        {filledEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-dim)' }}>
            <p style={{ fontSize: 15 }}>No lists yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {filledEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: 'var(--color-text-dim)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: Top4Entry }) {
  const config = CATEGORY_CONFIG[entry.category];
  const filledItems = entry.items.filter((i) => i.title);

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Color bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
        }}
      />

      <div style={{ padding: '20px 22px 22px' }}>
        {/* Category header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>{config.emoji}</span>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: config.color,
              margin: 0,
            }}
          >
            Top 4 {config.label}
          </h2>
          {(entry.like_count ?? 0) > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--color-text-dim)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f43f5e" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {entry.like_count}
            </span>
          )}
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filledItems.map((item) => (
            <div
              key={item.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 8px',
                borderRadius: 10,
              }}
            >
              <span className={`rank-badge rank-badge-${entry.category}`}>{item.rank}</span>

              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{
                    width: entry.category === 'artists' ? 36 : 32,
                    height: entry.category === 'artists' ? 36 : 44,
                    borderRadius: entry.category === 'artists' ? '50%' : 4,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: entry.category === 'artists' ? 36 : 32,
                    height: entry.category === 'artists' ? 36 : 44,
                    borderRadius: entry.category === 'artists' ? '50%' : 4,
                    background: `${config.color}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {config.emoji}
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </div>
                {item.subtitle && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 1,
                    }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
