'use client';

import { CATEGORY_CONFIG, type Top4Card } from '@/lib/types';

interface TasteCardProps {
  card: Top4Card;
  index?: number;
}

export default function TasteCard({ card, index = 0 }: TasteCardProps) {
  const { profile, entry } = card;
  const config = CATEGORY_CONFIG[entry.category];

  return (
    <div
      className="glass-card card-enter"
      style={{
        padding: 0,
        overflow: 'hidden',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Category color bar at top */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
        }}
      />

      <div style={{ padding: '20px 22px 22px' }}>
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

        {/* The 4 items — with thumbnails */}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${config.color}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className={`rank-badge rank-badge-${entry.category}`}>
                {item.rank}
              </span>

              {/* Thumbnail */}
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
