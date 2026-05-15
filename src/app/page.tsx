'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import TasteCard from '@/components/TasteCard';
import AdCard from '@/components/AdCard';
import SkeletonCard from '@/components/SkeletonCard';
import { DEMO_CARDS } from '@/lib/demo-data';
import { getFeedCards } from '@/lib/firebase/firestore';
import type { Top4Card } from '@/lib/types';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Home() {
  const [cards, setCards] = useState<Top4Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    try {
      const feedCards = await getFeedCards(30);
      if (feedCards.length > 0) {
        // Feed is already ordered by the multi-bucket algorithm
        setCards(feedCards);
      } else {
        setCards(shuffleArray(DEMO_CARDS));
      }
    } catch {
      setCards(shuffleArray(DEMO_CARDS));
    }
    setLoading(false);
  }

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
          What are your{' '}
          <span className="logo-accent">top 4</span>?
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
          Movies. Artists. Books. Pick your favorites. See what everyone else loves.
        </p>
      </section>

      {/* Category Pills */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          padding: '0 20px 36px',
        }}
        className="animate-fade-in"
      >
        {[
          { emoji: '🎬', label: 'Movies', color: 'var(--color-movies)', glow: 'var(--color-movies-glow)' },
          { emoji: '📺', label: 'TV Shows', color: 'var(--color-tv)', glow: 'var(--color-tv-glow)' },
          { emoji: '🎵', label: 'Artists', color: 'var(--color-artists)', glow: 'var(--color-artists-glow)' },
          { emoji: '📚', label: 'Books', color: 'var(--color-books)', glow: 'var(--color-books-glow)' },
        ].map((cat) => (
          <span
            key={cat.label}
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
            }}
          >
            {cat.emoji} {cat.label}
          </span>
        ))}
      </div>

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
          ) : (
            cards.map((card, i) => (
              <div key={card.entry.id} style={{ breakInside: 'avoid', marginBottom: 20 }}>
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
