import { useEffect, useRef } from 'react';

interface HeroSectionProps {
  onStartListening: () => void;
}

export function HeroSection({ onStartListening }: HeroSectionProps) {
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bars = waveRef.current?.querySelectorAll('.hero-wave-bar');
    if (!bars) return;
    bars.forEach((bar, i) => {
      const el = bar as HTMLElement;
      el.style.animationDelay = `${i * 0.06}s`;
    });
  }, []);

  const BAR_COUNT = 60;
  const barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
    const center = BAR_COUNT / 2;
    const dist = Math.abs(i - center);
    const base = Math.max(4, 40 - dist * 1.2);
    return base + Math.random() * 20;
  });

  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial glow background */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '600px',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
        {/* Badge */}
        <div
          className="fade-in-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '100px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#a78bfa',
            marginBottom: '32px',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', animation: 'pulsePlay 2s ease infinite' }} />
          Только реальные артисты — без ботов
        </div>

        {/* Main heading */}
        <h1
          className="fade-in-up-delay-1"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '24px',
            letterSpacing: '-2px',
          }}
        >
          <span style={{ color: '#f8fafc' }}>ClaudMusic —</span>
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa, #a78bfa)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradientShift 4s ease infinite',
            }}
          >
            Твоя музыка. Твоя сцена.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="fade-in-up-delay-2"
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: '#94a3b8',
            lineHeight: 1.7,
            maxWidth: '600px',
            margin: '0 auto 48px',
          }}
        >
          Загружай, делись и открывай новую музыку.
          Без ботов. Без шума. Только настоящие артисты.
        </p>

        {/* CTA Buttons */}
        <div
          className="fade-in-up-delay-3"
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '72px' }}
        >
          <button
            className="btn-glow pulse-play"
            onClick={onStartListening}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '16px 40px',
              borderRadius: '100px',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <span>
              <PlayIcon />
            </span>
            <span>Начать слушать</span>
          </button>
          <button
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              padding: '16px 40px',
              borderRadius: '100px',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#f8fafc',
              transition: 'all 0.3s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          >
            Загрузить трек
          </button>
        </div>

        {/* Animated waveform */}
        <div
          ref={waveRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            height: '80px',
          }}
        >
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="hero-wave-bar"
              style={{
                width: '3px',
                height: `${h}px`,
                background: `linear-gradient(180deg, rgba(139,92,246,${0.3 + Math.random() * 0.5}), rgba(59,130,246,${0.2 + Math.random() * 0.4}))`,
                borderRadius: '2px',
                animation: `heroWave ${0.7 + Math.random() * 0.8}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.04}s`,
              }}
            />
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            marginTop: '64px',
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(24px, 5vw, 80px)',
            flexWrap: 'wrap',
          }}
        >
          {[
            { value: '5M+', label: 'Треков' },
            { value: '200K+', label: 'Артистов' },
            { value: '15M+', label: 'Слушателей' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="stat-number">{stat.value}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
