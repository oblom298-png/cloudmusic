import { useState, useEffect, useRef } from 'react';
import { Track } from '../data/tracks';

interface PlayerProps {
  track: Track;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Player({ track, isPlaying, onPlayPause, onNext, onPrev }: PlayerProps) {
  const [progress, setProgress] = useState(22);
  const [volume, setVolume] = useState(75);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseDuration = (d: string) => {
    const [m, s] = d.split(':').map(Number);
    return m * 60 + s;
  };

  const totalSeconds = parseDuration(track.duration);
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            onNext();
            return 0;
          }
          return prev + (100 / totalSeconds) * 0.5;
        });
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSeconds, onNext]);

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
  }, [track.id]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    setProgress(Math.max(0, Math.min(100, pct)));
  };

  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const center = 20;
    const dist = Math.abs(i - center);
    return Math.max(15, 50 - dist * 1.5 + Math.sin(i * 0.5) * 15);
  });

  return (
    <div
      className="player-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '0 24px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      {/* Track info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '240px', flexShrink: 0 }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: track.coverGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
            <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#f8fafc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {track.title}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {track.artist}
          </div>
        </div>
        <button
          onClick={() => setIsLiked(p => !p)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isLiked ? '#EC4899' : '#475569',
            padding: '4px',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Center controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Shuffle */}
          <button
            onClick={() => setIsShuffle(p => !p)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isShuffle ? '#8B5CF6' : '#475569',
              padding: '4px',
              transition: 'color 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={onPrev}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19,20 9,12 19,4" />
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className={isPlaying ? 'pulse-play' : ''}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139,92,246,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,4 15,12 5,20" />
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Repeat */}
          <button
            onClick={() => setIsRepeat(p => !p)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isRepeat ? '#8B5CF6' : '#475569',
              padding: '4px',
              transition: 'color 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>

        {/* Progress bar with waveform */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#475569', width: '36px', textAlign: 'right', flexShrink: 0 }}>
            {formatTime(currentSeconds)}
          </span>

          {/* Waveform progress */}
          <div
            className="progress-bar"
            onClick={handleProgressClick}
            style={{ flex: 1, cursor: 'pointer', position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}
          >
            {/* Waveform bars */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 0',
            }}>
              {waveformBars.map((h, i) => {
                const barProgress = (i / waveformBars.length) * 100;
                const isPassed = barProgress <= progress;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.min(h, 28)}%`,
                      background: isPassed
                        ? 'linear-gradient(180deg, #8B5CF6, #3B82F6)'
                        : 'rgba(255,255,255,0.1)',
                      borderRadius: '1px',
                      transition: 'background 0.1s',
                    }}
                  />
                );
              })}
            </div>
            {/* Invisible clickable fill */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          </div>

          <span style={{ fontSize: '0.7rem', color: '#475569', width: '36px', flexShrink: 0 }}>
            {track.duration}
          </span>
        </div>
      </div>

      {/* Volume controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px', flexShrink: 0, justifyContent: 'flex-end' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f8fafc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          <VolumeIcon />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="volume-slider"
          style={{ width: '80px' }}
        />
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
