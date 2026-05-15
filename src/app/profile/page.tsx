'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getProfile, upsertProfile, getEntries, upsertEntry } from '@/lib/firebase/firestore';
import { uploadAvatar } from '@/lib/firebase/storage';
import Header from '@/components/Header';
import DraggableList from '@/components/DraggableList';
import { CATEGORIES, CATEGORY_CONFIG, type Category, type Top4Item } from '@/lib/types';

const EMPTY_ITEMS: Top4Item[] = [
  { rank: 1, title: '' },
  { rank: 2, title: '' },
  { rank: 3, title: '' },
  { rank: 4, title: '' },
];

/** Strip HTML tags, control chars, zero-width chars; collapse whitespace; cap length. */
function sanitizeName(raw: string, maxLen = 40): string {
  return raw
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim()
    .slice(0, maxLen);
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [entries, setEntries] = useState<Record<Category, { items: Top4Item[] }>>({
    movies: { items: EMPTY_ITEMS.map((i) => ({ ...i })) },
    artists: { items: EMPTY_ITEMS.map((i) => ({ ...i })) },
    books: { items: EMPTY_ITEMS.map((i) => ({ ...i })) },
  });

  const [activeTab, setActiveTab] = useState<Category>('movies');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);
      await loadProfile(u.uid, u.phoneNumber || '');
    });
    return () => unsub();
  }, []);

  async function loadProfile(userId: string, phoneNumber: string) {
    try {
      const profile = await getProfile(userId);
      if (profile) {
        setDisplayName(profile.display_name);
        setAvatarUrl(profile.avatar_url);
      } else {
        setDisplayName(phoneNumber ? `…${phoneNumber.slice(-4)}` : '');
      }

      const userEntries = await getEntries(userId);
      if (userEntries.length > 0) {
        const newEntries = { ...entries };
        for (const e of userEntries) {
          if (CATEGORIES.includes(e.category)) {
            newEntries[e.category] = {
              items: e.items.length > 0 ? e.items : EMPTY_ITEMS.map((i) => ({ ...i })),
            };
          }
        }
        setEntries(newEntries);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    setLoading(false);
  }

  const saveEntries = useCallback(
    (userId: string, category: Category, newItems: Top4Item[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await upsertEntry(userId, category, newItems);
          showToast('Saved ✓');
        } catch (err) {
          console.error('Auto-save error:', err);
          showToast('Save failed');
        }
      }, 600);
    },
    []
  );

  async function saveProfile(userId: string, name: string, url: string | null) {
    try {
      await upsertProfile(userId, {
        display_name: sanitizeName(name) || 'User',
        avatar_url: url,
      });
      showToast('Saved ✓');
    } catch (err) {
      console.error('Profile save error:', err);
      showToast('Save failed');
    }
  }

  function handleItemsChange(category: Category, newItems: Top4Item[]) {
    setEntries((prev) => ({ ...prev, [category]: { items: newItems } }));
    if (user) saveEntries(user.uid, category, newItems);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      setAvatarUrl(url);
      showToast('Photo updated!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Upload failed — check Firebase Storage rules');
    }
    setUploadingAvatar(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh' }}>
        <Header />
        <div style={{ maxWidth: 540, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: 120, height: 14, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  const currentEntry = entries[activeTab];
  const config = CATEGORY_CONFIG[activeTab];

  return (
    <div style={{ minHeight: '100dvh' }}>
      <Header />

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* Avatar + Name */}
        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            className="avatar-upload"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 16 }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="avatar"
                width={88}
                height={88}
                style={{ width: 88, height: 88 }}
              />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-artists))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'white',
                  border: '2px solid var(--color-border)',
                }}
              >
                {displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="avatar-upload-overlay">
              {uploadingAvatar ? (
                <span style={{ fontSize: 12, color: 'white' }}>...</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 16L16 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 4L10 12M10 4L7 7M10 4L13 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
            onBlur={() => { if (user) saveProfile(user.uid, displayName, avatarUrl); }}
            placeholder="Your name"
            className="input-field"
            style={{
              maxWidth: 240,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--color-border)',
              borderRadius: 0,
              padding: '6px 0',
            }}
          />
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 24,
          }}
        >
          {CATEGORIES.map((cat) => {
            const catConfig = CATEGORY_CONFIG[cat];
            const isActive = cat === activeTab;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? catConfig.color : 'var(--color-text-dim)',
                  borderBottom: isActive ? `2px solid ${catConfig.color}` : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {catConfig.emoji} {catConfig.label}
              </button>
            );
          })}
        </div>

        {/* Active Category Editor */}
        <div className="glass-card animate-fade-in" style={{ padding: 24, overflow: 'visible' }} key={activeTab}>
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
              margin: '-24px -24px 20px',
            }}
          />

          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: config.color,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {config.emoji} Your Top 4 {config.label}
          </h2>

          <DraggableList
            category={activeTab}
            items={currentEntry.items}
            onChange={(newItems) => handleItemsChange(activeTab, newItems)}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
