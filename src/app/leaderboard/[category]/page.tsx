'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import TasteCard from '@/components/TasteCard';
import SkeletonCard from '@/components/SkeletonCard';
import { getCategoryConfig, CATEGORIES, type Category } from '@/lib/types';
import { useLocale } from '@/lib/i18n';
import type { Top4Card } from '@/lib/types';

const MEDAL_EMOJI = ['🥇', '🥈', '🥉', '4', '5'] as const;

export default function LeaderboardPage() {
  const params = useParams();
  const category = params.category as Category;
  const { t, locale } = useLocale();
  const allConfig = getCategoryConfig(locale);
  const config = allConfig[category];

  const MEDAL_LABELS = [
    t('leaderboard.1stPlace'),
    t('leaderboard.2ndPlace'),
    t('leaderboard.3rdPlace'),
    '#4',
    '#5',
  ] as const;

  const [cards, setCards] = useState<Top4Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Validate category
  const isValid = CATEGORIES.includes(category);

  useEffect(() => {
    if (!isValid) return;
    async function load() {
      try {
        const res = await fetch(`/api/leaderboard?category=${category}&locale=${locale}`);
        const data = await res.json();
        setCards(data.cards || []);
      } catch (err) {
        console.error('[Leaderboard] Load failed:', err);
      }
      setLoading(false);
    }
    load();
  }, [category, isValid, locale]);

  if (!isValid) {
    return (
      <div style={{ minHeight: '100dvh' }}>
        <Header />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{t('leaderboard.categoryNotFound')}</h1>
          <Link href="/" className="btn-primary">{t('leaderboard.backToFeed')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <Header />

      {/* Hero */}
      <section
        className="animate-fade-in"
        style={{
          textAlign: 'center',
          padding: '48px 20px 12px',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `${config.color}18`,
            border: `1px solid ${config.color}30`,
            fontSize: 28,
            marginBottom: 16,
          }}
        >
          {config.emoji}
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {config.label}{' '}
          <span style={{ color: config.color }}>{t('leaderboard.pageTitle')}</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            maxWidth: 380,
            margin: '0 auto 20px',
          }}
        >
          {t('leaderboard.mostLoved', { category: config.label.toLowerCase() })}
        </p>
      </section>

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          padding: '0 20px 36px',
          flexWrap: 'wrap',
        }}
        className="animate-fade-in"
      >
        {CATEGORIES.map((cat) => {
          const c = allConfig[cat];
          const isActive = cat === category;
          return (
            <Link
              key={cat}
              href={`/leaderboard/${cat}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                background: isActive ? `${c.color}22` : 'transparent',
                color: isActive ? c.color : 'var(--color-text-dim)',
                border: isActive
                  ? `1px solid ${c.color}40`
                  : '1px solid var(--color-border)',
                transition: 'all 0.2s ease',
              }}
            >
              {c.emoji} {c.label}
            </Link>
          );
        })}
      </div>

      {/* Leaderboard Cards */}
      <main
        style={{
          maxWidth: 520,
          margin: '0 auto',
          padding: '0 20px 60px',
        }}
      >
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <SkeletonCard />
              </div>
            ))}
          </>
        ) : cards.length === 0 ? (
          <div
            className="glass-card animate-fade-in"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t('leaderboard.noLeadersYet')}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
                maxWidth: 280,
                margin: '0 auto 20px',
              }}
            >
              {t('leaderboard.beFirst', { category: config.label.toLowerCase() })}
            </p>
            <Link href="/" className="btn-primary">
              {t('leaderboard.browseFeed')}
            </Link>
          </div>
        ) : (
          cards.map((card, i) => (
            <div
              key={card.entry.id}
              className="animate-fade-in"
              style={{
                marginBottom: 24,
                animationDelay: `${i * 100}ms`,
              }}
            >
              {/* Rank header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                  paddingLeft: 4,
                }}
              >
                <span style={{ fontSize: i < 3 ? 24 : 16, lineHeight: 1 }}>
                  {i < 3 ? MEDAL_EMOJI[i] : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        fontSize: 13,
                        fontWeight: 800,
                        color: 'var(--color-text-dim)',
                      }}
                    >
                      {MEDAL_EMOJI[i]}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: i < 3 ? config.color : 'var(--color-text-dim)',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {MEDAL_LABELS[i]}
                </span>
                {i === 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: config.color,
                      background: `${config.color}15`,
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: `1px solid ${config.color}25`,
                    }}
                  >
                    {t('leaderboard.topList')}
                  </span>
                )}
              </div>
              <TasteCard card={card} index={i} />
            </div>
          ))
        )}
      </main>

      {/* Back link */}
      <div
        style={{
          textAlign: 'center',
          padding: '0 20px 48px',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 14,
            color: 'var(--color-text-dim)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dim)'; }}
        >
          {t('leaderboard.backToFeed')}
        </Link>
      </div>

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
