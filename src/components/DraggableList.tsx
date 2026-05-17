'use client';

import { useState, useRef, useCallback } from 'react';
import type { Category, SearchResult, Top4Item } from '@/lib/types';
import { getCategoryConfig } from '@/lib/types';
import { useLocale } from '@/lib/i18n';
import SearchInput from './SearchInput';

interface DraggableListProps {
  category: Category;
  items: Top4Item[];
  onChange: (items: Top4Item[]) => void;
}

export default function DraggableList({ category, items, onChange }: DraggableListProps) {
  const { t, locale } = useLocale();
  const config = getCategoryConfig(locale)[category];
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  // Touch drag state
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const touchDragging = useRef<boolean>(false);
  const touchItemRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);

  // --- Desktop Drag & Drop ---
  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    reorder(dragIndex, dropIndex);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  // --- Touch Drag & Drop ---
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    // Only start drag from the handle area — check if touch target is inside the drag handle
    const target = e.target as HTMLElement;
    const handle = target.closest('[data-drag-handle]');
    if (!handle) return;

    e.preventDefault();
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchCurrentY.current = touch.clientY;
    dragIndexRef.current = index;
    touchDragging.current = true;
    touchItemRef.current = itemRefs.current[index];
    setTouchDragIndex(index);
    setTouchOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDragging.current || dragIndexRef.current === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    touchCurrentY.current = touch.clientY;
    const offset = touch.clientY - touchStartY.current;
    setTouchOffset(offset);

    // Determine which index we're hovering over
    const dragIdx = dragIndexRef.current;
    let targetIndex = dragIdx;

    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el || i === dragIdx) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (touch.clientY < midY && i < dragIdx) {
        targetIndex = i;
        break;
      }
      if (touch.clientY > midY && i > dragIdx) {
        targetIndex = i;
      }
    }
    setDragOverIndex(targetIndex !== dragIdx ? targetIndex : null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchDragging.current || dragIndexRef.current === null) {
      resetTouchState();
      return;
    }

    const dragIdx = dragIndexRef.current;
    if (dragOverIndex !== null && dragOverIndex !== dragIdx) {
      reorder(dragIdx, dragOverIndex);
    }

    resetTouchState();
  }, [dragOverIndex]);

  function resetTouchState() {
    touchDragging.current = false;
    dragIndexRef.current = null;
    touchItemRef.current = null;
    setTouchDragIndex(null);
    setTouchOffset(0);
    setDragOverIndex(null);
  }

  function reorder(fromIndex: number, toIndex: number) {
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Reassign ranks to match new order
    const updated = reordered.map((item, i) => ({ ...item, rank: i + 1 }));
    onChange(updated);
  }

  function handleSelect(rank: number, result: SearchResult) {
    onChange(
      items.map((item) =>
        item.rank === rank
          ? {
              rank,
              title: result.title,
              ...(result.subtitle != null && { subtitle: result.subtitle }),
              ...(result.image_url != null && { image_url: result.image_url }),
              ...(result.id != null && { external_id: result.id }),
            }
          : item
      )
    );
  }

  function handleClear(rank: number) {
    onChange(
      items.map((item) => (item.rank === rank ? { rank, title: '' } : item))
    );
  }

  return (
    <div
      ref={listRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, touchAction: 'none' }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {items.map((item, index) => {
        const isDragging = touchDragIndex === index || dragIndexRef.current === index;
        const isDragOver = dragOverIndex === index && dragIndexRef.current !== index && touchDragIndex !== index;

        return (
          <div
            key={item.rank}
            ref={(el) => { itemRefs.current[index] = el; }}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: isDragging ? 0.4 : 1,
              borderRadius: 10,
              transition: touchDragIndex !== null ? 'none' : 'all 0.15s ease',
              borderTop: isDragOver ? `2px solid ${config.color}` : '2px solid transparent',
              paddingTop: isDragOver ? 4 : 0,
              transform: touchDragIndex === index ? `translateY(${touchOffset}px)` : undefined,
              zIndex: touchDragIndex === index ? 10 : activeSearchIndex === index ? 20 : 1,
              position: 'relative',
              background: touchDragIndex === index ? 'var(--color-bg-card)' : undefined,
              boxShadow: touchDragIndex === index ? '0 8px 24px rgba(0,0,0,0.4)' : undefined,
            }}
          >
            {/* Drag handle */}
            <div
              data-drag-handle
              style={{
                cursor: 'grab',
                color: 'var(--color-text-dim)',
                padding: '8px 6px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                touchAction: 'none',
              }}
              title={t('drag.reorder')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="4" cy="3" r="1.2" fill="currentColor" />
                <circle cx="8" cy="3" r="1.2" fill="currentColor" />
                <circle cx="4" cy="6" r="1.2" fill="currentColor" />
                <circle cx="8" cy="6" r="1.2" fill="currentColor" />
                <circle cx="4" cy="9" r="1.2" fill="currentColor" />
                <circle cx="8" cy="9" r="1.2" fill="currentColor" />
              </svg>
            </div>

            {/* Rank badge */}
            <span
              className={`rank-badge rank-badge-${category}`}
              style={{ flexShrink: 0 }}
            >
              {item.rank}
            </span>

            {/* Search input */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchInput
                category={category}
                rank={item.rank}
                currentTitle={item.title}
                currentImageUrl={item.image_url}
                onSelect={(result: SearchResult) => handleSelect(item.rank, result)}
                onClear={() => handleClear(item.rank)}
                onDropdownToggle={(isOpen: boolean) => setActiveSearchIndex(isOpen ? index : null)}
              />
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2, textAlign: 'center' }}>
        ⠿ {t('drag.reorder')}
      </p>
    </div>
  );
}
