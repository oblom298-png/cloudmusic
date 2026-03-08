import { genres } from '../data/tracks';

export function GenresSection() {
  return (
    <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }} className="reveal">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '100px',
            padding: '5px 16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#60a5fa',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '16px',
          }}>
            🎵 Жанры
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Найди свой стиль
          </h2>
          <p style={{ color: '#64748b', marginTop: '12px', fontSize: '1rem' }}>
            Миллионы треков в каждом жанре
          </p>
        </div>

        <div
          className="reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px',
          }}
        >
          {genres.map((genre) => (
            <div
              key={genre.name}
              className="genre-card"
              style={{
                background: genre.gradient,
                borderRadius: '16px',
                padding: '24px 16px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => {}}
            >
              {/* Shine effect */}
              <div style={{
                position: 'absolute',
                top: '-30%',
                right: '-30%',
                width: '80%',
                height: '80%',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{genre.icon}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                {genre.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {genre.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
