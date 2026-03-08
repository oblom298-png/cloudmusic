const features = [
  {
    icon: '🛡️',
    title: 'Только реальные люди',
    description: 'Верификация при регистрации, анти-бот система и ручная модерация. Каждый профиль — настоящий человек.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
    tag: 'Верификация',
  },
  {
    icon: '🎵',
    title: 'Без спама и чатов',
    description: 'ClaudMusic — исключительно музыкальная платформа. Никаких личных сообщений, никакого шума — только музыка.',
    gradient: 'linear-gradient(135deg, #3B82F6, #10B981)',
    tag: 'Фокус',
  },
  {
    icon: '🔊',
    title: 'Высокое качество звука',
    description: 'Поддержка lossless форматов: FLAC, WAV, AIFF. Слушай музыку так, как задумал артист.',
    gradient: 'linear-gradient(135deg, #10B981, #6366F1)',
    tag: 'Lossless',
  },
  {
    icon: '📊',
    title: 'Честная статистика',
    description: 'Реальные прослушивания без накруток. Алгоритм который продвигает музыку по качеству, а не по деньгам.',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    tag: 'Прозрачность',
  },
  {
    icon: '💜',
    title: 'Поддержка артистов',
    description: 'Система донатов, монетизация треков и прямая поддержка от фанатов — без посредников.',
    gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
    tag: 'Донаты',
  },
  {
    icon: '🌍',
    title: 'Открытое сообщество',
    description: 'Артисты со всего мира. Открывай новую музыку, поддерживай независимых исполнителей.',
    gradient: 'linear-gradient(135deg, #6366F1, #EC4899)',
    tag: 'Сообщество',
  },
];

export function WhySection() {
  return (
    <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }} className="reveal">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '100px',
            padding: '5px 16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#a78bfa',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '20px',
          }}>
            ✨ Наши преимущества
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-1px' }}>
            <span style={{ color: '#f8fafc' }}>Почему </span>
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>ClaudMusic?</span>
          </h2>
          <p style={{ color: '#64748b', marginTop: '16px', fontSize: '1.05rem', maxWidth: '500px', margin: '16px auto 0' }}>
            Платформа, созданная музыкантами для музыкантов
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="glass track-card reveal"
              style={{
                borderRadius: '20px',
                padding: '32px',
                border: '1px solid rgba(255,255,255,0.06)',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: feature.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(139,92,246,0.2)',
              }}>
                {feature.icon}
              </div>

              {/* Tag */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '3px 10px',
                borderRadius: '100px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
              }}>
                {feature.tag}
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.7 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div
          className="reveal"
          style={{
            marginTop: '60px',
            borderRadius: '24px',
            padding: 'clamp(32px, 5vw, 60px)',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))',
            border: '1px solid rgba(139,92,246,0.25)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-40%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <h3 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
            Готов поделиться своей музыкой?
          </h3>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '1rem' }}>
            Присоединяйся к 200,000+ артистов, которые уже нашли свою аудиторию на ClaudMusic
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-glow"
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '14px 40px',
                borderRadius: '100px',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span>Зарегистрироваться бесплатно</span>
            </button>
            <button
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                padding: '14px 40px',
                borderRadius: '100px',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#f8fafc',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
              }}
            >
              Узнать больше
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
