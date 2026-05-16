'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import TasteCard from '@/components/TasteCard';
import AdCard from '@/components/AdCard';
import SkeletonCard from '@/components/SkeletonCard';
import Leaderboard from '@/components/Leaderboard';
import { getCategoryConfig } from '@/lib/types';
import { useLocale } from '@/lib/i18n';
import type { Top4Card } from '@/lib/types';

export default function Home() {
  const { t, locale } = useLocale();
  const categoryConfig = getCategoryConfig(locale);

  const [cards, setCards] = useState<Top4Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeed(1);
  }, [locale]);

  // Infinite scroll — auto-load next batch when sentinel enters viewport
  useEffect(() => {
    if (!loadMoreRef.current || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreFeed();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, currentPage]);

  async function loadFeed(page: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?page=${page}&locale=${locale}`);
      const data = await res.json();
      setCards(data.cards || []);
      setCurrentPage(data.page || 1);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[Feed] Load failed:', err);
    }
    setLoading(false);
  }

  const loadMoreFeed = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await fetch(`/api/feed?page=${nextPage}&locale=${locale}`);
      const data = await res.json();
      if (data.cards?.length > 0) {
        setCards((prev) => [...prev, ...data.cards]);
      }
      setCurrentPage(data.page || nextPage);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[Feed] Load more failed:', err);
    }
    setLoadingMore(false);
  }, [currentPage, loadingMore, hasMore, locale]);

  return (
    <div style={{ minHeight: '100dvh' }}>
      <Header />

      {/* Hero */}
      <section
        style={{
          textAlign: 'center',
          padding: '48px 20px 28px',
          maxWidth: 600,
          margin: '0 auto',
        }}
        className="animate-fade-in"
      >
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          {t('home.hero.title')}{' '}
          <span className="logo-accent">{t('home.hero.titleAccent')}</span>{t('home.hero.titleEnd')}
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          {t('home.hero.subtitle')}
        </p>
      </section>

      {/* Category Pills — link to user's profile editor for that category */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          padding: '0 20px 36px',
          flexWrap: 'wrap',
        }}
        className="animate-fade-in"
      >
        {([
          { key: 'movies' as const, color: 'var(--color-movies)', glow: 'var(--color-movies-glow)' },
          { key: 'tv' as const, color: 'var(--color-tv)', glow: 'var(--color-tv-glow)' },
          { key: 'artists' as const, color: 'var(--color-artists)', glow: 'var(--color-artists-glow)' },
          { key: 'books' as const, color: 'var(--color-books)', glow: 'var(--color-books-glow)' },
        ]).map((cat) => (
          <Link
            key={cat.key}
            href={`/profile?category=${cat.key}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: cat.glow,
              color: cat.color,
              border: `1px solid ${cat.color}22`,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {categoryConfig[cat.key].emoji} {categoryConfig[cat.key].label}
          </Link>
        ))}
      </div>

      {/* Leaderboard */}
      <Leaderboard />

      {/* Feed */}
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 20px 60px',
        }}
      >
        <div style={{ columns: 'auto', columnWidth: 340, columnGap: 20 }}>
          {loading ? (
            <>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ breakInside: 'avoid', marginBottom: 20 }}>
                  <SkeletonCard />
                </div>
              ))}
            </>
          ) : cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>🎬🎵📚</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>
                {t('home.empty.text')}
              </p>
            </div>
          ) : (
            cards.map((card, i) => (
              <div key={`${card.entry.id}-${i}`} style={{ breakInside: 'avoid', marginBottom: 20 }}>
                <TasteCard card={card} index={i} />
                {(i + 1) % 5 === 0 && i < cards.length - 1 && (
                  <div style={{ marginTop: 20 }}>
                    <AdCard />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Invisible sentinel — triggers auto-load when scrolled into view */}
        <div ref={loadMoreRef} style={{ height: 1 }} />

        {/* Loading spinner while fetching more */}
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--color-text-dim)', fontSize: 13,
            }}>
              <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }} />
              {t('home.loadingMore')}
            </div>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && cards.length > 0 && !loading && (
          <div style={{
            textAlign: 'center', padding: '32px 0 16px',
            color: 'var(--color-text-dim)', fontSize: 13,
          }}>
            {t('home.endOfFeed')}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--color-text-dim)',
        }}
      >
        <span className="logo-text" style={{ fontSize: 14 }}>top</span>
        <span className="logo-text logo-accent" style={{ fontSize: 14 }}>4</span>
        <span style={{ marginLeft: 8 }}>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
