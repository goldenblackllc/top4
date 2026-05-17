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
// Module-level cache — survives component remounts during client-side navigation
let feedCache: { cards: Top4Card[]; page: number; hasMore: boolean; locale: string } | null = null;

export default function Home() {
  const { t, locale } = useLocale();
  const categoryConfig = getCategoryConfig(locale);

  // Initialize from cache if available and same locale — no loading flash
  const hasCachedData = feedCache && feedCache.locale === locale && feedCache.cards.length > 0;
  const [cards, setCards] = useState<Top4Card[]>(hasCachedData ? feedCache!.cards : []);
  const [loading, setLoading] = useState(!hasCachedData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(hasCachedData ? feedCache!.page : 1);
  const [hasMore, setHasMore] = useState(hasCachedData ? feedCache!.hasMore : true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartYRef = useRef(0);
  const pullThreshold = 80;

  useEffect(() => {
    if (feedCache && feedCache.locale === locale && feedCache.cards.length > 0) {
      // We already showed cached data — refresh silently in the background
      handleRefresh();
    } else {
      // No cache or locale changed — full load with skeletons
      setCards([]);
      setCurrentPage(1);
      setHasMore(true);
      loadFeed(1);
    }
  }, [locale]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || loading || refreshing) return;
      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta * 0.5, pullThreshold * 1.5));
      }
    };
    const handleTouchEnd = () => {
      if (pullDistance >= pullThreshold && !refreshing) {
        handleRefresh();
      }
      setPullDistance(0);
      setIsPulling(false);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, loading, refreshing]);

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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/feed?page=1&locale=${locale}`, { cache: 'no-store' });
      const data = await res.json();
      const newCards = data.cards || [];
      setCards(newCards);
      setCurrentPage(1);
      setHasMore(data.hasMore || false);
      feedCache = { cards: newCards, page: 1, hasMore: data.hasMore || false, locale };
    } catch (err) {
      console.error('[Feed] Refresh failed:', err);
    }
    setRefreshing(false);
  }

  async function loadFeed(page: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?page=${page}&locale=${locale}`, { cache: 'no-store' });
      const data = await res.json();
      const newCards = data.cards || [];
      setCards(newCards);
      setCurrentPage(data.page || 1);
      setHasMore(data.hasMore || false);
      feedCache = { cards: newCards, page: data.page || 1, hasMore: data.hasMore || false, locale };
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
      const res = await fetch(`/api/feed?page=${nextPage}&locale=${locale}`, { cache: 'no-store' });
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

      {/* Pull-to-refresh indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: pullDistance > 0 ? pullDistance : 0,
          overflow: 'hidden',
          transition: isPulling ? 'none' : 'height 0.3s ease',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2.5px solid var(--color-border)',
            borderTopColor: pullDistance >= pullThreshold ? 'var(--color-accent)' : 'var(--color-text-dim)',
            animation: refreshing ? 'spin 0.6s linear infinite' : undefined,
            transform: `rotate(${Math.min(pullDistance / pullThreshold, 1) * 360}deg)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease',
          }}
        />
      </div>

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

      {/* Refresh button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--color-bg-card)',
            color: refreshing ? 'var(--color-text-dim)' : 'var(--color-accent)',
            border: '1px solid var(--color-border)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: refreshing ? 0.7 : 1,
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{
              animation: refreshing ? 'spin 0.8s linear infinite' : undefined,
            }}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {refreshing ? t('home.refreshing') : t('home.refresh')}
        </button>
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
