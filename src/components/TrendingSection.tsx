import { useState } from 'react';
import { trendingTracks, Track } from '../data/tracks';

interface TrendingSectionProps {
  onPlay: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export function TrendingSection({ onPlay, currentTrack, isPlaying }: TrendingSectionProps) {
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());
  const [repostedTracks, setRepostedTracks] = useState<Set<number>>(new Set());

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedTracks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRepost = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRepostedTracks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section id="trending" style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }} className="reveal">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>🔥 В тренде</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              Популярное прямо сейчас
            </h2>
          </div>
          <button style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            padding: '8px 20px',
            borderRadius: '100px',
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.color = '#a78bfa'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Смотреть все
          </button>
        </div>

        {/* Horizontal scroll cards */}
        <div
          className="horizontal-scroll reveal"
          style={{
            display: 'flex',
            gap: '16px',
            paddingBottom: '16px',
          }}
        >
          {trendingTracks.map((track) => {
            const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
            const isSelected = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                className="track-card glass"
                style={{
                  minWidth: '220px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected ? '0 0 30px rgba(139,92,246,0.2)' : 'none',
                }}
                onClick={() => onPlay(track)}
              >
                {/* Cover */}
                <div style={{ position: 'relative', paddingBottom: '100%', background: track.coverGradient }}>
                  {/* Album art placeholder */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MusicNote large />
                  </div>

                  {/* Play button overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}
                  className="track-card-overlay"
                  >
                    <div
                      className={isCurrentlyPlaying ? 'pulse-play' : ''}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(139,92,246,0.6)',
                      }}
                    >
                      {isCurrentlyPlaying ? (
                        <PauseIcon color="#8B5CF6" />
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#8B5CF6">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <style>{`.track-card:hover .track-card-overlay { opacity: 1 !important; }`}</style>

                  {/* Genre tag */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {track.genre}
                  </div>

                  {/* Playing indicator */}
                  {isCurrentlyPlaying && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      display: 'flex',
                      gap: '3px',
                      alignItems: 'flex-end',
                      height: '18px',
                    }}>
                      {[1,2,3].map(i => (
                        <div key={i} className="playing-dot" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Card info */}
                <div style={{ padding: '14px' }}>
                  <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {track.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{track.artist}</span>
                    {track.verified && <VerifiedBadge />}
                  </div>

                  {/* Mini waveform */}
                  <MiniWaveform playing={isCurrentlyPlaying} />

                  {/* Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        onClick={(e) => toggleLike(track.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: likedTracks.has(track.id) ? '#EC4899' : '#64748b',
                          fontSize: '0.75rem',
                          transition: 'color 0.2s',
                          padding: 0,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <HeartIcon filled={likedTracks.has(track.id)} />
                        {track.likes}
                      </button>
                      <button
                        onClick={(e) => toggleRepost(track.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: repostedTracks.has(track.id) ? '#8B5CF6' : '#64748b',
                          fontSize: '0.75rem',
                          transition: 'color 0.2s',
                          padding: 0,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <RepostIcon />
                        {track.reposts}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontSize: '0.75rem' }}>
                      <PlayCountIcon />
                      {track.plays}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MiniWaveform({ playing }: { playing: boolean }) {
  const bars = [12, 20, 8, 24, 16, 10, 22, 14, 18, 8, 20, 15];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className={playing ? 'waveform-bar' : ''}
          style={{
            width: '2px',
            height: playing ? `${h}px` : `${h * 0.6}px`,
            background: playing
              ? 'linear-gradient(180deg, #8B5CF6, #3B82F6)'
              : 'rgba(255,255,255,0.2)',
            borderRadius: '1px',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <div style={{
      width: '14px',
      height: '14px',
      background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="8" height="8" viewBox="0 0 12 12" fill="white">
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </div>
  );
}

function MusicNote({ large }: { large?: boolean }) {
  const size = large ? 48 : 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
      <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayCountIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
