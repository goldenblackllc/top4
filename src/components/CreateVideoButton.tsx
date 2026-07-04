'use client';

import React, { useState, useCallback } from 'react';

interface CreateVideoButtonProps {
  userId: string;
  displayName?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

/**
 * Generates and downloads an MP4 video reveal of a user's Top 4 lists.
 * The video is generated server-side and streamed to the client.
 */
export default function CreateVideoButton({ userId, displayName, compact, style }: CreateVideoButtonProps) {
  const [state, setState] = useState<'idle' | 'creating' | 'done'>('idle');
  const [hovered, setHovered] = useState(false);

  const handleCreate = useCallback(async () => {
    if (state === 'creating') return;
    setState('creating');

    try {
      const res = await fetch(`/api/video/${userId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.detail || err.error || 'Video generation failed');
      }

      const blob = await res.blob();
      const filename = displayName
        ? `top4-${displayName.replace(/\s+/g, '-').toLowerCase()}.mp4`
        : `top4-video.mp4`;

      // Try native share with the video file on mobile
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'video/mp4' });
        const shareData = { files: [file] };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            setState('done');
            setTimeout(() => setState('idle'), 3000);
            return;
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              setState('idle');
              return;
            }
          }
        }
      }

      // Fallback: trigger file download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      console.error('Video creation failed:', err);
      setState('idle');
    }
  }, [userId, displayName, state]);

  const iconColor = state === 'done'
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
    cursor: state === 'creating' ? 'wait' : 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
    color: iconColor,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'color 0.2s ease',
    opacity: state === 'creating' ? 0.6 : 1,
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={buttonStyle}
      aria-label={state === 'done' ? 'Video saved' : 'Create video'}
      title={
        state === 'creating'
          ? 'Creating video...'
          : state === 'done'
            ? 'Video saved!'
            : 'Create a TikTok/Reels-ready video of your Top 4'
      }
    >
      {state === 'done' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : state === 'creating' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        /* Video / clapperboard icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      )}
      {!compact && (
        <span>
          {state === 'creating' ? 'Creating...' : state === 'done' ? 'Saved!' : 'Create Video'}
        </span>
      )}
    </button>
  );
}
