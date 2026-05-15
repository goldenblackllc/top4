'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { likeEntry, unlikeEntry, hasLiked, getProfile } from '@/lib/firebase/firestore';
import { CATEGORY_CONFIG, type Top4Card } from '@/lib/types';

interface TasteCardProps {
  card: Top4Card;
  index?: number;
}

export default function TasteCard({ card, index = 0 }: TasteCardProps) {
  const { profile, entry } = card;
  const config = CATEGORY_CONFIG[entry.category];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(entry.like_count || 0);
  const [liking, setLiking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('Someone');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUserId(user.uid);
      // Load like state and current user's display name
      const [liked, myProfile] = await Promise.all([
        hasLiked(user.uid, entry.id),
        getProfile(user.uid),
      ]);
      setLiked(liked);
      setCurrentUserName(myProfile?.display_name || 'Someone');
    });
    return () => unsub();
  }, [entry.id]);

  async function handleLike() {
    if (!currentUserId || liking) return;
    setLiking(true);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await unlikeEntry(currentUserId, entry.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await likeEntry(currentUserId, currentUserName, entry.id, entry.user_id, entry.category);
    }
    setLiking(false);
  }

  return (
    <div
      className="glass-card card-enter"
      style={{
        padding: 0,
        overflow: 'hidden',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Category color bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
        }}
      />

      <div style={{ padding: '20px 22px 16px' }}>
        {/* Header: avatar + name + category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="avatar"
                width={40}
                height={40}
                style={{ width: 40, height: 40 }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${config.color}88, ${config.color}44)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              {profile.display_name}
            </h3>
          </div>

          {/* Category pill */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600,
              background: `${config.color}18`,
              color: config.color,
              border: `1px solid ${config.color}25`,
            }}
          >
            {config.emoji} {config.label}
          </span>
        </div>

        {/* The 4 items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entry.items.map((item) => (
            <div
              key={item.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 8px',
                borderRadius: 10,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${config.color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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

        {/* Footer: like button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={handleLike}
            disabled={!currentUserId || liking}
            title={currentUserId ? (liked ? 'Unlike' : 'Like this list') : 'Sign in to like'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: currentUserId ? 'pointer' : 'default',
              padding: '4px 8px',
              borderRadius: 8,
              color: liked ? '#f43f5e' : 'var(--color-text-dim)',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              opacity: liking ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (currentUserId) e.currentTarget.style.color = '#f43f5e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = liked ? '#f43f5e' : 'var(--color-text-dim)';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'transform 0.15s ease', transform: liked ? 'scale(1.2)' : 'scale(1)' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
