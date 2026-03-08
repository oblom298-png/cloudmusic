import { useState } from 'react';

interface HeaderProps {
  onOpenModal: (type: 'login' | 'register' | 'upload') => void;
  activeSection: string;
  onNavClick: (section: string) => void;
}

export function Header({ onOpenModal, activeSection, onNavClick }: HeaderProps) {
  const [searchVal, setSearchVal] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { id: 'hero', label: 'Главная' },
    { id: 'trending', label: 'Обзор' },
    { id: 'library', label: 'Библиотека' },
  ];

  return (
    <header
      className="glass"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
        onClick={() => onNavClick('hero')}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}
        >
          <WaveIcon />
        </div>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.5px',
          }}
        >
          ClaudMusic
        </span>
      </div>

      {/* Desktop nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hide-mobile">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavClick(link.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: activeSection === link.id ? '#f8fafc' : '#94a3b8',
              backgroundColor: activeSection === link.id ? 'rgba(139,92,246,0.15)' : 'transparent',
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {link.label}
          </button>
        ))}
        <button
          onClick={() => onOpenModal('upload')}
          style={{
            background: 'none',
            border: '1px solid rgba(139,92,246,0.4)',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#a78bfa',
            transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          + Загрузить трек
        </button>
      </nav>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: '320px', position: 'relative' }} className="hide-mobile">
        <SearchIcon />
        <input
          className="input-dark"
          placeholder="Поиск треков, артистов..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          style={{ paddingLeft: '36px', paddingRight: '12px' }}
        />
      </div>

      {/* Auth buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="hide-mobile">
        <button
          onClick={() => onOpenModal('login')}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            padding: '7px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#f8fafc',
            transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
        >
          Войти
        </button>
        <button
          onClick={() => onOpenModal('register')}
          className="btn-glow"
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '7px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'white',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span>Регистрация</span>
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        className="show-mobile"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#f8fafc',
          padding: '8px',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {menuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 99,
          }}
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { onNavClick(link.id); setMenuOpen(false); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
                color: '#f8fafc',
                textAlign: 'left',
                padding: '8px 0',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {link.label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => { onOpenModal('login'); setMenuOpen(false); }}
              style={{
                flex: 1,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'none',
                cursor: 'pointer',
                padding: '10px',
                borderRadius: '8px',
                color: '#f8fafc',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
              }}
            >
              Войти
            </button>
            <button
              onClick={() => { onOpenModal('register'); setMenuOpen(false); }}
              className="btn-glow"
              style={{
                flex: 1,
                border: 'none',
                cursor: 'pointer',
                padding: '10px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
              }}
            >
              <span>Регистрация</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function WaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M2 12C2 12 4 4 6 4C8 4 8 20 10 20C12 20 12 8 14 8C16 8 16 16 18 16C20 16 22 12 22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
