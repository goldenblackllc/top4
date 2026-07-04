'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProfile, getEntries } from '@/lib/firebase/firestore';
import { getCategoryConfig, type Top4Entry, type UserProfile } from '@/lib/types';
import { useLocale } from '@/lib/i18n';
import Header from '@/components/Header';
import ShareButton from '@/components/ShareButton';

export default function UserProfileClient({ userId }: { userId: string }) {
  const { t, locale } = useLocale();
  const categoryConfig = getCategoryConfig(locale);

  const [profile, setProfile] = useState<UserProfile | null | 'not-found'>('not-found');
  const [entries, setEntries] = useState<Top4Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, e] = await Promise.all([getProfile(userId), getEntries(userId)]);
        setProfile(p ?? 'not-found');
        setEntries(e.filter((entry) => entry.items.some((i) => i.title)));
      } catch {
        setProfile('not-found');
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh' }}>
        <Header />
        <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: 160, height: 22, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: 100, height: 14, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (profile === 'not-found' || !profile) {
    return (
      <div style={{ minHeight: '100dvh' }}>
        <Header />
        <div style={{ maxWidth: 540, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>👤</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{t('userProfile.notFound')}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            {t('userProfile.notFoundDesc')}
          </p>
          <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            {t('userProfile.backToFeed')}
          </Link>
        </div>
      </div>
    );
  }

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
            {t('userProfile.listCount', {
              count: String(entries.length),
              plural: entries.length !== 1 ? 's' : '',
            })} · top4
          </p>

          {/* Share profile button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : `/u/${userId}`}
              title={`${profile.display_name}'s Top 4 Lists`}
              text={`Check out ${profile.display_name}'s favorite movies, shows, artists, and books on Top4!`}
            />
          </div>
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-dim)' }}>
            <p style={{ fontSize: 15 }}>{t('userProfile.noLists')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} categoryConfig={categoryConfig} userId={userId} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link
            href="/"
            style={{ fontSize: 13, color: 'var(--color-text-dim)', textDecoration: 'none', fontWeight: 600 }}
          >
            {t('userProfile.backToFeed')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, categoryConfig, userId }: { entry: Top4Entry; categoryConfig: ReturnType<typeof getCategoryConfig>; userId: string }) {
  const config = categoryConfig[entry.category];
  const filledItems = entry.items.filter((i) => i.title);

  const categoryLabels: Record<string, string> = {
    movies: 'Movies',
    tv: 'TV Shows',
    artists: 'Artists',
    books: 'Books',
  };

  return (
    <div
      className="glass-card"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${config.color}, ${config.color}88)` }} />

      <div style={{ padding: '20px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>{config.emoji}</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: config.color, margin: 0 }}>
            Top 4 {config.label}
          </h2>
          {(entry.like_count ?? 0) > 0 && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-dim)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f43f5e" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {entry.like_count}
            </span>
          )}

          {/* Share this list */}
          <ShareButton
            url={typeof window !== 'undefined' ? `${window.location.origin}/u/${userId}` : `/u/${userId}`}
            title={`Top 4 ${categoryLabels[entry.category] || entry.category}`}
            text={`Check out this Top 4 ${categoryLabels[entry.category] || entry.category} list on Top4!`}
            compact
            style={{ marginLeft: (entry.like_count ?? 0) > 0 ? 0 : 'auto' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filledItems.map((item) => (
            <div key={item.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 10 }}>
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
                <div style={{
                  width: entry.category === 'artists' ? 36 : 32,
                  height: entry.category === 'artists' ? 36 : 44,
                  borderRadius: entry.category === 'artists' ? '50%' : 4,
                  background: `${config.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {config.emoji}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
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
