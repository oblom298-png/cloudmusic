import { useState } from 'react';
import { newReleases, Track } from '../data/tracks';

interface NewReleasesSectionProps {
  onPlay: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export function NewReleasesSection({ onPlay, currentTrack, isPlaying }: NewReleasesSectionProps) {
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedTracks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section id="library" style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }} className="reveal">
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(236,72,153,0.1)',
              border: '1px solid rgba(236,72,153,0.25)',
              borderRadius: '100px',
              padding: '5px 16px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#f472b6',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}>
              ✨ Новые релизы
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              Только что загружено
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {newReleases.map((track, index) => {
            const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
            const isSelected = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                className="reveal track-card glass"
                style={{
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected ? '0 0 30px rgba(139,92,246,0.12)' : 'none',
                  animationDelay: `${index * 0.1}s`,
                }}
                onClick={() => onPlay(track)}
              >
                {/* Number/Playing indicator */}
                <div style={{
                  width: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isCurrentlyPlaying ? (
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '18px' }}>
                      {[1,2,3].map(i => (
                        <div key={i} className="playing-dot" />
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Cover */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '10px',
                  background: track.coverGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <MusicNote />
                  {/* Play overlay on hover */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }} className="cover-play-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                  <style>{`.track-card:hover .cover-play-overlay { opacity: 1 !important; }`}</style>
                </div>

                {/* Track info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {track.title}
                    </span>
                    {track.isNew && (
                      <span style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        flexShrink: 0,
                      }}>NEW</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{track.artist}</span>
                    {track.verified && <VerifiedBadge />}
                    <span style={{ color: '#334155', fontSize: '0.75rem' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{track.genre}</span>
                    <span style={{ color: '#334155', fontSize: '0.75rem' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{track.uploadDate}</span>
                  </div>

                  {/* Waveform */}
                  <MiniWaveform playing={isCurrentlyPlaying} />
                </div>

                {/* Right side */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '10px',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    {track.duration}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => toggleLike(track.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: likedTracks.has(track.id) ? '#EC4899' : '#475569',
                        fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        padding: '4px',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <HeartIcon filled={likedTracks.has(track.id)} />
                      {track.likes}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontSize: '0.75rem' }}>
                      <PlayIcon />
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
  const bars = [8, 14, 6, 18, 12, 8, 16, 10, 14, 6, 16, 11, 9, 15, 7, 19];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '20px' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className={playing ? 'waveform-bar' : ''}
          style={{
            width: '2px',
            height: `${playing ? h : h * 0.6}px`,
            background: playing
              ? 'linear-gradient(180deg, #8B5CF6, #3B82F6)'
              : 'rgba(255,255,255,0.15)',
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

function MusicNote() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
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

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
