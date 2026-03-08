import { useState, useEffect } from 'react';

interface ModalProps {
  type: 'login' | 'register' | 'upload';
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function Modal({ type, onClose, onNotify }: ModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'register' && step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      if (type === 'login') onNotify('Добро пожаловать обратно! 🎵');
      else if (type === 'register') onNotify('Аккаунт создан! Добро пожаловать в ClaudMusic 🎉');
    }, 1400);
  };

  const titles = {
    login: 'Войти в ClaudMusic',
    register: step === 1 ? 'Создать аккаунт' : 'Верификация',
    upload: 'Загрузить трек',
  };

  const subtitles = {
    login: 'Слушай музыку без ограничений',
    register: step === 1 ? 'Только для реальных людей' : 'Подтверди свою личность',
    upload: 'Поделись своим творчеством',
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-content glass-strong"
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '24px',
          padding: '36px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f8fafc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 4 4 6 4C8 4 8 20 10 20C12 20 12 8 14 8C16 8 16 16 18 16C20 16 22 12 22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{titles[type]}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{subtitles[type]}</div>
          </div>
        </div>

        {/* Step indicator for register */}
        {type === 'register' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1,
                height: '3px',
                borderRadius: '2px',
                background: s <= step
                  ? 'linear-gradient(90deg, #8B5CF6, #3B82F6)'
                  : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {type === 'register' && step === 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Имя артиста / Ник
              </label>
              <input
                className="input-dark"
                placeholder="Как тебя называть?"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          {(type === 'login' || (type === 'register' && step === 1)) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email
              </label>
              <input
                className="input-dark"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {(type === 'login' || (type === 'register' && step === 1)) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Пароль
              </label>
              <input
                className="input-dark"
                type="password"
                placeholder={type === 'register' ? 'Минимум 8 символов' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Verification step */}
          {type === 'register' && step === 2 && (
            <div>
              <div style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    🛡️
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>Верификация личности</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Только для реальных пользователей</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  ClaudMusic использует верификацию для исключения ботов и накруток.
                  На твой email <strong style={{ color: '#a78bfa' }}>{email}</strong> отправлен код подтверждения.
                </p>
              </div>

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '16px' }}>
                Код подтверждения
              </label>
              <input
                className="input-dark"
                placeholder="Введи 6-значный код"
                maxLength={6}
                style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                {[
                  '✓ Анти-бот система активна',
                  '✓ Данные защищены шифрованием',
                  '✓ Никаких сгенерированных профилей',
                ].map(item => (
                  <div key={item} style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#34d399' }}>{item.split(' ')[0]}</span>
                    <span>{item.slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'register' && step === 1 && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#8B5CF6', width: '15px', height: '15px' }}
                required
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                Я согласен с{' '}
                <span style={{ color: '#a78bfa', cursor: 'pointer' }}>условиями использования</span>{' '}
                и подтверждаю, что я реальный человек
              </span>
            </label>
          )}

          {type === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = '#a78bfa')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}
              >
                Забыл пароль?
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow"
            style={{
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '13px',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              opacity: loading ? 0.8 : 1,
              marginTop: '8px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              )}
              {loading ? 'Подождите...' : type === 'login' ? 'Войти' : type === 'register' ? (step === 1 ? 'Продолжить →' : 'Создать аккаунт') : 'Загрузить'}
            </span>
          </button>

          {type === 'register' && step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'center',
              }}
            >
              ← Назад
            </button>
          )}
        </form>

        {/* Switch modal type */}
        {type === 'login' && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748b' }}>
            Нет аккаунта?{' '}
            <span style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
              Зарегистрироваться
            </span>
          </p>
        )}
        {type === 'register' && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748b' }}>
            Уже есть аккаунт?{' '}
            <span style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
              Войти
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
