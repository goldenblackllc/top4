'use client';

import React, { useState, useCallback } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

export default function ShareButton({ url, title, text, compact, style }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(async () => {
    if (copied) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // User cancelled or share failed — silently ignore
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  }, [copied, title, text, url]);

  const iconColor = copied
    ? '#22c55e'
    : hovered
      ? 'var(--color-accent)'
      : 'var(--color-text-dim)';

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
    color: iconColor,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'color 0.2s ease, background 0.2s ease',
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={buttonStyle}
      aria-label={copied ? 'Copied' : 'Share'}
    >
      {copied ? (
        /* Checkmark icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        /* Share / arrow-up-from-box icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
      {!compact && (
        <span>{copied ? 'Copied!' : 'Share'}</span>
      )}
    </button>
  );
}
