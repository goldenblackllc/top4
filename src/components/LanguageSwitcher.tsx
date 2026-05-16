'use client';

import { useLocale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
      id="language-switcher"
      title={locale === 'en' ? 'Cambiar a español' : 'Switch to English'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        transition: 'all 0.2s ease',
        letterSpacing: '0.3px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
    >
      <span style={{ fontSize: 14 }}>{locale === 'en' ? '🇺🇸' : '🇪🇸'}</span>
      {locale === 'en' ? 'EN' : 'ES'}
    </button>
  );
}
