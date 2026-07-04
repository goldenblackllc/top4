'use client';

import React, { useState, useCallback } from 'react';

interface SaveCardButtonProps {
  entryId: string;
  filename?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

/**
 * Downloads the OG card image for an entry so users can
 * post it to Instagram Stories, Snapchat, TikTok, etc.
 */
export default function SaveCardButton({ entryId, filename, compact, style }: SaveCardButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving || saved) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/og/${entryId}`);
      if (!res.ok) throw new Error('Failed to fetch image');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Try native share with the image file on mobile (iOS/Android)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const file = new File([blob], `${filename || 'top4-card'}.png`, { type: 'image/png' });
        const shareData = { files: [file] };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            URL.revokeObjectURL(url);
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            return;
          } catch (err) {
            // User cancelled — fall through to download
            if (err instanceof Error && err.name === 'AbortError') {
              URL.revokeObjectURL(url);
              setSaving(false);
              return;
            }
          }
        }
      }

      // Fallback: trigger a file download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || 'top4-card'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save card failed:', err);
    }
    setSaving(false);
  }, [entryId, filename, saving, saved]);

  const iconColor = saved
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
    cursor: saving ? 'wait' : 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
    color: iconColor,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'color 0.2s ease',
    opacity: saving ? 0.6 : 1,
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={buttonStyle}
      aria-label={saved ? 'Saved' : 'Save card image'}
      title={saving ? 'Saving...' : saved ? 'Saved!' : 'Save card image for Instagram, Snapchat, etc.'}
    >
      {saved ? (
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
        /* Download / save icon */
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      {!compact && (
        <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Card'}</span>
      )}
    </button>
  );
}
