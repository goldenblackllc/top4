'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getProfile } from '@/lib/firebase/firestore';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('You');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profile = await getProfile(u.uid);
          setDisplayName(profile?.display_name?.trim() || u.displayName || 'You');
        } catch {
          setDisplayName(u.displayName || 'You');
        }
      } else {
        setDisplayName('You');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(8, 8, 13, 0.85)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="logo-text">top</span>
          <span className="logo-text logo-accent">4</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading ? (
            <div className="skeleton" style={{ width: 80, height: 36 }} />
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="btn-ghost"
                id="user-menu-button"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ fontSize: 13 }}>{displayName}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="animate-slide-down"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding: 6,
                    minWidth: 160,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-input)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    My Top 4s
                  </Link>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-input)';
                      e.currentTarget.style.color = '#f87171';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <button className="btn-primary" id="login-button">
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
