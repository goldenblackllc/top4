export default function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Color bar */}
      <div className="skeleton" style={{ height: 3, borderRadius: 0 }} />

      <div style={{ padding: '20px 22px 22px' }}>
        {/* Header skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 90, height: 14 }} />
          </div>
          <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 16 }} />
        </div>

        {/* Items skeleton */}
        {[0, 1, 2, 3].map((j) => (
          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px' }}>
            <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: `${55 + Math.random() * 35}%`, height: 14, marginBottom: 4 }} />
              <div className="skeleton" style={{ width: `${30 + Math.random() * 25}%`, height: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
