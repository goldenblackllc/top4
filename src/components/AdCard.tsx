'use client';

import { useMemo } from 'react';
import Image from 'next/image';

const EP_ADS = [
  {
    id: "ep-1",
    image: "/ads/ep-finances.png",
    headline: "Your financial ceiling isn't a math problem. It's an identity problem.",
    body: "Sit down with The Analyst. Map the exact belief that's been deciding your income. Build the architecture to override it. One session. $20.",
    cta: "Open The Analyst",
    href: "https://www.earnestpage.com",
  },
  {
    id: "ep-2",
    image: "/ads/ep-procrastination.png",
    headline: "Every time you said \"later,\" you made a choice.",
    body: "Procrastination isn't a personality trait — it's a disempowering belief you've been calling a schedule. One session with your Ideal Self changes that. $20.",
    cta: "Enter Unfiltered Mode",
    href: "https://www.earnestpage.com",
  },
  {
    id: "ep-3",
    image: "/ads/ep-relationships.png",
    headline: "You've had the same argument in different clothes for years.",
    body: "Your Tactical Partner maps the values underneath the conflict and architects a new way forward. One session. $20.",
    cta: "Engage Your Tactical Partner",
    href: "https://www.earnestpage.com",
  },
  {
    id: "ep-4",
    image: "/ads/ep-career.png",
    headline: "The next level isn't waiting for more experience. It's waiting for a shift.",
    body: "Your Strategic Advisor maps the exact internal block between where you are and where your ambition already lives. One session. $20.",
    cta: "Open Your Strategic Advisor",
    href: "https://www.earnestpage.com",
  },
  {
    id: "ep-5",
    image: "/ads/ep-identity.png",
    headline: "You already know who you're supposed to be.",
    body: "The gap between that person and the one showing up today isn't a mystery — it's a belief you've been treating as a fact. Enter Mirror Chat. $20.",
    cta: "Enter Mirror Chat",
    href: "https://www.earnestpage.com",
  },
  {
    id: "ep-6",
    image: "/ads/ep-gift-clarity.png",
    headline: "Give Clarity.",
    body: "You've watched them orbit the same decision for years. Send them a session with their Ideal Self. A compass they'll actually use. $20, delivered instantly.",
    cta: "Gift a Session",
    href: "https://earnestpage.com/gift",
  },
];

export default function AdCard() {
  const ad = useMemo(
    () => EP_ADS[Math.floor(Math.random() * EP_ADS.length)],
    []
  );

  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-card)',
        textDecoration: 'none',
        transition: 'border-color 0.2s ease, transform 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)';
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
      }}
      aria-label={`Sponsored: ${ad.headline}`}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0a0a0a' }}>
        <Image
          src={ad.image}
          alt={ad.headline}
          fill
          style={{ objectFit: 'contain' }}
          sizes="(max-width: 768px) 100vw, 440px"
        />
        {/* Sponsored badge */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 20,
          }}
        >
          Sponsored
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 18px' }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-text)',
            lineHeight: 1.4,
            marginBottom: 8,
          }}
        >
          {ad.headline}
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          {ad.body}
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-accent)',
          }}
        >
          {ad.cta}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </a>
  );
}
