'use client';

import { useState, useRef } from 'react';
import type { Category, SearchResult } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';
import SearchInput from './SearchInput';
import type { Top4Item } from '@/lib/types';

interface DraggableListProps {
  category: Category;
  items: Top4Item[];
  onChange: (items: Top4Item[]) => void;
}

export default function DraggableList({ category, items, onChange }: DraggableListProps) {
  const config = CATEGORY_CONFIG[category];
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Reassign ranks to match new order
    const updated = reordered.map((item, i) => ({ ...item, rank: i + 1 }));
    onChange(updated);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleSelect(rank: number, result: SearchResult) {
    onChange(
      items.map((item) =>
        item.rank === rank
          ? {
              rank,
              title: result.title,
              subtitle: result.subtitle,
              image_url: result.image_url,
              external_id: result.id,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, index) => {
        const isDragging = dragIndexRef.current === index;
        const isDragOver = dragOverIndex === index && dragIndexRef.current !== index;

        return (
          <div
            key={item.rank}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: isDragging ? 0.4 : 1,
              borderRadius: 10,
              transition: 'all 0.15s ease',
              borderTop: isDragOver ? `2px solid ${config.color}` : '2px solid transparent',
              paddingTop: isDragOver ? 4 : 0,
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                cursor: 'grab',
                color: 'var(--color-text-dim)',
                padding: '4px 2px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
              title="Drag to reorder"
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
              />
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2, textAlign: 'center' }}>
        ⠿ Drag to reorder
      </p>
    </div>
  );
}
