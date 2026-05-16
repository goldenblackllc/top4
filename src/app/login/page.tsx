'use client';

import { useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || t('login.failedSendCode'));
        return;
      }

      setFormattedPhone(data.phone);
      setStep('code');
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg(t('login.failedSendRetry'));
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || t('login.invalidCode'));
        return;
      }

      // Sign into Firebase with the custom token
      await signInWithCustomToken(auth, data.token);

      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('login.verificationFailed'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="glass-card animate-fade-in-up"
        style={{ width: '100%', maxWidth: 400, padding: 36 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="logo-text" style={{ fontSize: 32 }}>top</span>
            <span className="logo-text logo-accent" style={{ fontSize: 32 }}>4</span>
          </Link>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>
            {t('login.subtitle')}
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handleSendCode}>
            <label
              htmlFor="phone-input"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}
            >
              {t('login.phoneLabel')}
            </label>
            <input
              id="phone-input"
              type="tel"
              className="input-field"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              required
              style={{ marginBottom: 16 }}
            />

            {status === 'error' && (
              <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12, padding: '8px 12px', background: '#f8717115', borderRadius: 8 }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={status === 'loading'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {status === 'loading' ? t('login.sending') : t('login.sendCode')}
            </button>

            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              {t('login.smsNotice')}
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="animate-fade-in">
            <div
              style={{
                textAlign: 'center',
                marginBottom: 20,
                padding: '12px 16px',
                background: 'var(--color-bg-input)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--color-text-muted)',
              }}
            >
              {t('login.codeSentTo')} <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{formattedPhone}</span>
            </div>

            <label
              htmlFor="code-input"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}
            >
              {t('login.codeLabel')}
            </label>
            <input
              id="code-input"
              type="text"
              inputMode="numeric"
              className="input-field"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
              maxLength={6}
              style={{
                marginBottom: 16,
                fontSize: 24,
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '8px',
              }}
            />

            {status === 'error' && (
              <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12, padding: '8px 12px', background: '#f8717115', borderRadius: 8 }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={status === 'loading'}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            >
              {status === 'loading' ? t('login.verifying') : t('login.verify')}
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setStep('phone'); setCode(''); setStatus('idle'); setErrorMsg(''); }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {t('login.differentNumber')}
            </button>
          </form>
        )}
      </div>

      <Link href="/" style={{ marginTop: 24, fontSize: 13, color: 'var(--color-text-dim)', textDecoration: 'none' }}>
        {t('login.backToFeed')}
      </Link>
    </div>
  );
}
