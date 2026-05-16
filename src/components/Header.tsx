'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  getProfile,
  subscribeToNotifications,
  markNotificationsRead,
  type Notification,
} from '@/lib/firebase/firestore';
import { getCategoryConfig } from '@/lib/types';
import { useLocale } from '@/lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { t, locale } = useLocale();
  const categoryConfig = getCategoryConfig(locale);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [displayName, setDisplayName] = useState('You');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  // Subscribe to notifications when user is known
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  // Close bell on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleBellOpen() {
    const isOpening = !bellOpen;
    setBellOpen(isOpening);
    if (isOpening && user) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await markNotificationsRead(user.uid, unreadIds);
      }
    }
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Language Switcher */}
          <LanguageSwitcher />

          {loading ? (
            <div className="skeleton" style={{ width: 80, height: 36 }} />
          ) : user ? (
            <>
              {/* Notification Bell */}
              <div ref={bellRef} style={{ position: 'relative' }}>
                <button
                  onClick={handleBellOpen}
                  id="notification-bell"
                  style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: 8,
                    color: bellOpen ? 'var(--color-text)' : 'var(--color-text-dim)',
                    transition: 'color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
                  onMouseLeave={(e) => { if (!bellOpen) e.currentTarget.style.color = 'var(--color-text-dim)'; }}
                  title={t('header.notifications')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#f43f5e',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                {bellOpen && (
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
                      minWidth: 280,
                      maxWidth: 320,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 10px 10px' }}>
                      {t('header.notifications')}
                    </p>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', padding: '8px 10px 10px', textAlign: 'center' }}>
                        {t('header.noNotifications')}
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: n.read ? 'transparent' : 'rgba(244, 63, 94, 0.06)',
                            marginBottom: 2,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" strokeWidth="0">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <p style={{ fontSize: 13, color: 'var(--color-text)', margin: 0, lineHeight: 1.4 }}>
                              <strong>{n.from_display_name}</strong> {t('header.likedYourList')} {categoryConfig[n.category]?.label}
                              {locale === 'en' ? ` ${t('header.list')}` : ''}
                            </p>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: '3px 0 0 21px' }}>
                            {n.created_at ? new Date(n.created_at).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* User menu */}
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
                      style={{ display: 'block', padding: '8px 14px', borderRadius: 8, fontSize: 14, color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      {t('header.myTop4s')}
                    </Link>
                    <Link
                      href="/profile?tab=liked"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 14px', borderRadius: 8, fontSize: 14, color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      {t('header.likedLists')}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      style={{ display: 'block', width: '100%', padding: '8px 14px', borderRadius: 8, fontSize: 14, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; e.currentTarget.style.color = '#f87171'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      {t('header.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login">
              <button className="btn-primary" id="login-button">{t('header.signIn')}</button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
