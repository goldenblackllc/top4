'use client';

import React, { useState, useCallback, useRef } from 'react';

interface CreateVideoButtonProps {
  userId: string;
  displayName?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

/**
 * Two-step video creation:
 * 1. Click "Create Video" → generates the MP4
 * 2. Shows "Share" + "Save" buttons → user taps Share to open native share sheet
 *    (fresh user gesture = no popup blocker)
 */
export default function CreateVideoButton({ userId, displayName, compact, style }: CreateVideoButtonProps) {
  const [state, setState] = useState<'idle' | 'creating' | 'ready'>('idle');
  const [hovered, setHovered] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const filename = displayName
    ? `top4-${displayName.replace(/\s+/g, '-').toLowerCase()}.mp4`
    : `top4-video.mp4`;

  // Step 1: Generate the video
  const handleCreate = useCallback(async () => {
    if (state === 'creating') return;
    setState('creating');

    try {
      const res = await fetch(`/api/video/${userId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.detail || err.error || 'Video generation failed');
      }
      blobRef.current = await res.blob();
      setState('ready');
    } catch (err) {
      console.error('Video creation failed:', err);
      setState('idle');
    }
  }, [userId, state]);

  // Step 2a: Share (fresh user gesture → share sheet opens)
  const handleShare = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        // Try sharing the video file
        const file = new File([blob], filename, { type: 'video/mp4' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${displayName || 'My'} Top 4`,
            text: `Check out ${displayName || 'my'} Top 4 picks!`,
          });
          setState('idle');
          blobRef.current = null;
          return;
        }

        // Fallback: share profile link
        await navigator.share({
          title: `${displayName || 'My'} Top 4`,
          text: `Check out ${displayName || 'my'} Top 4 picks on Top4!`,
          url: `https://www.top4.info/u/${userId}`,
        });
        setState('idle');
        blobRef.current = null;
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — keep ready state so they can try again
        return;
      }
    }

    // If share API unavailable, download instead
    handleSave();
  }, [filename, displayName, userId]);

  // Step 2b: Save — prefer share sheet on mobile (saves to Photos), download on desktop
  const handleSave = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;

    // On mobile, use navigator.share with just the file — the share sheet
    // surfaces "Save to Photos" as a top option, matching Instagram/TikTok UX
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'video/mp4' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          setState('idle');
          blobRef.current = null;
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            // User cancelled — stay in ready state
            return;
          }
        }
      }
    }

    // Desktop fallback: trigger a file download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 5000);

    setState('idle');
    blobRef.current = null;
  }, [filename]);

  // Dismiss
  const handleDismiss = useCallback(() => {
    setState('idle');
    blobRef.current = null;
  }, []);

  // ── Ready state: show Share + Save buttons ──
  if (state === 'ready') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}>
        <button
          type="button"
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--color-accent)',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: 8,
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            padding: '5px 12px',
            borderRadius: 8,
            color: 'var(--color-text-dim)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save to Photos
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 6,
            color: 'var(--color-text-dim)',
            fontSize: 16,
            fontFamily: 'inherit',
            opacity: 0.5,
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // ── Idle / Creating state ──
  const iconColor = hovered ? 'var(--color-accent)' : 'var(--color-text-dim)';

  return (
    <button
      type="button"
      onClick={handleCreate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        cursor: state === 'creating' ? 'wait' : 'pointer',
        padding: '6px 10px',
        borderRadius: 8,
        color: state === 'creating' ? 'var(--color-text-dim)' : iconColor,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        transition: 'color 0.2s ease',
        opacity: state === 'creating' ? 0.6 : 1,
        ...style,
      }}
      aria-label="Create video"
      title={state === 'creating' ? 'Creating video...' : 'Create a TikTok/Reels-ready video of your Top 4'}
    >
      {state === 'creating' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      )}
      {!compact && (
        <span>{state === 'creating' ? 'Creating...' : 'Create Video'}</span>
      )}
    </button>
  );
}
