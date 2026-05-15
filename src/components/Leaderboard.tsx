'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CATEGORY_CONFIG, CATEGORIES, type Category } from '@/lib/types';

interface LeaderboardEntry {
  entryId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  topPick: string;
  topPickImage: string | null;
  likeCount: number;
}

type LeaderboardData = Record<string, LeaderboardEntry[]>;

const RANK_ICONS = ['🥇', '🥈', '🥉'] as const;

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaderboard');
        const json = await res.json();
        setData(json.leaderboard || {});
      } catch (err) {
        console.error('[Leaderboard] Load failed:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const hasAnyData = Object.values(data).some((arr) => arr.length > 0);

  // Don't render if there's no leaderboard data at all
  if (!loading && !hasAnyData) return null;

  return (
    <section
      className="animate-fade-in"
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 20px 36px',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 18 }}>🏆</span>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.3px',
            color: 'var(--color-text)',
          }}
        >
          Leaderboards
        </h2>
        <div
          style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(90deg, var(--color-border), transparent)',
            marginLeft: 4,
          }}
        />
      </div>

      {/* Category cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const entries = data[cat] || [];

            return (
              <Link
                key={cat}
                href={`/leaderboard/${cat}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 14,
                    padding: '14px 14px 12px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${config.color}50`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${config.color}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Top color bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `linear-gradient(90deg, ${config.color}, ${config.color}66)`,
                    }}
                  />

                  {/* Category header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: entries.length > 0 ? 10 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 16 }}>{config.emoji}</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: config.color,
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={config.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.4 }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>

                  {/* Ranked list */}
                  {entries.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {entries.map((entry, i) => (
                        <div
                          key={entry.entryId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '5px 0',
                            borderTop: i > 0 ? `1px solid ${config.color}0a` : 'none',
                          }}
                        >
                          {/* Rank indicator */}
                          <span
                            style={{
                              width: 18,
                              fontSize: i < 3 ? 13 : 10,
                              fontWeight: 700,
                              color: i < 3 ? undefined : 'var(--color-text-dim)',
                              textAlign: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {i < 3 ? RANK_ICONS[i] : `${i + 1}`}
                          </span>

                          {/* Name */}
                          <span
                            style={{
                              flex: 1,
                              fontSize: i === 0 ? 12 : 11,
                              fontWeight: i === 0 ? 650 : 500,
                              color: i === 0 ? 'var(--color-text)' : 'var(--color-text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                            }}
                          >
                            {entry.displayName}
                          </span>

                          {/* Like count */}
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              fontSize: 10,
                              fontWeight: 600,
                              color: i === 0 ? '#f43f5e' : 'var(--color-text-dim)',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="none"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {entry.likeCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-dim)',
                        fontStyle: 'italic',
                        paddingTop: 8,
                      }}
                    >
                      No leaders yet — be the first!
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
