'use client';

import { useState, useRef, useEffect } from 'react';
import type { Category, SearchResult } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';

interface SearchInputProps {
  category: Category;
  rank: number;
  currentTitle: string;
  currentImageUrl?: string;
  onSelect: (result: SearchResult) => void;
  onClear: () => void;
}

export default function SearchInput({
  category,
  rank,
  currentTitle,
  currentImageUrl,
  onSelect,
  onClear,
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const config = CATEGORY_CONFIG[category];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/${category}?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    onSelect(result);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  // If there's already a selection, show it
  if (currentTitle) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '6px 10px',
          transition: 'all 0.2s ease',
          minWidth: 0,   // allows flex children to shrink and ellipsis to work
          overflow: 'hidden',
        }}
      >
        {/* Thumbnail */}
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt={currentTitle}
            style={{
              width: 36,
              height: category === 'artists' ? 36 : 50,
              borderRadius: category === 'artists' ? '50%' : 4,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: category === 'artists' ? 36 : 50,
              borderRadius: category === 'artists' ? '50%' : 4,
              background: `${config.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {config.emoji}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
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
            {currentTitle}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dim)'; }}
          title="Remove"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 5L11 11M11 5L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // Search input
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="input-field"
          placeholder={`${config.searchPlaceholder} (#${rank})`}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          style={{
            fontSize: 14,
            paddingRight: loading ? 36 : 14,
          }}
        />
        {loading && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              border: '2px solid var(--color-border)',
              borderTopColor: config.color,
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div
          className="animate-slide-down"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 4,
            zIndex: 50,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--color-text)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {result.image_url ? (
                <img
                  src={result.image_url}
                  alt={result.title}
                  style={{
                    width: 32,
                    height: category === 'artists' ? 32 : 44,
                    borderRadius: category === 'artists' ? '50%' : 4,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: category === 'artists' ? 32 : 44,
                    borderRadius: category === 'artists' ? '50%' : 4,
                    background: `${config.color}15`,
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
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {result.title}
                </div>
                {result.subtitle && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {result.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
