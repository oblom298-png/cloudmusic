import { useState } from 'react';
import { featuredArtists, trendingTracks, Track } from '../data/tracks';

interface ArtistSectionProps {
  onPlay: (track: Track) => void;
}

export function ArtistSection({ onPlay }: ArtistSectionProps) {
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [selectedArtist, setSelectedArtist] = useState(featuredArtists[0]);

  const toggleFollow = (id: number) => {
    setFollowed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const artistTracks = trendingTracks.slice(0, 3);

  return (
    <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }} className="reveal">
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
            marginBottom: '16px',
          }}>
            🎤 Артисты
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Популярные артисты
          </h2>
          <p style={{ color: '#64748b', marginTop: '12px', fontSize: '1rem' }}>
            Все профили верифицированы — только реальные люди
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '60px' }} className="reveal">
          {featuredArtists.map(artist => (
            <div
              key={artist.id}
              className="glass track-card"
              style={{
                borderRadius: '20px',
                padding: '28px',
                cursor: 'pointer',
                border: selectedArtist.id === artist.id
                  ? '1px solid rgba(139,92,246,0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                boxShadow: selectedArtist.id === artist.id ? '0 0 40px rgba(139,92,246,0.12)' : 'none',
              }}
              onClick={() => setSelectedArtist(artist)}
            >
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: artist.avatarGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}>
                    {artist.name.charAt(0)}
                  </div>
                  {/* Verified on avatar */}
                  {artist.verified && (
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '20px',
                      height: '20px',
                      background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #0a0a0a',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="white">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{artist.name}</span>
                    {artist.verified && (
                      <span style={{
                        fontSize: '0.65rem',
                        color: '#a78bfa',
                        background: 'rgba(139,92,246,0.15)',
                        padding: '2px 7px',
                        borderRadius: '100px',
                        fontWeight: 600,
                        border: '1px solid rgba(139,92,246,0.25)',
                      }}>Verified</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#60a5fa' }}>{artist.genre}</div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                {artist.bio}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{artist.followers}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>подписчиков</div>
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{artist.tracks}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>треков</div>
                </div>
              </div>

              {/* Follow button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFollow(artist.id); }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: followed.has(artist.id) ? '1px solid rgba(139,92,246,0.3)' : 'none',
                  background: followed.has(artist.id)
                    ? 'rgba(139,92,246,0.1)'
                    : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                  color: followed.has(artist.id) ? '#a78bfa' : 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: followed.has(artist.id) ? 'none' : '0 0 20px rgba(139,92,246,0.3)',
                }}
              >
                {followed.has(artist.id) ? '✓ Подписан' : '+ Подписаться'}
              </button>
            </div>
          ))}
        </div>

        {/* Artist tracks preview */}
        <div className="glass reveal" style={{ borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: selectedArtist.avatarGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'white',
            }}>
              {selectedArtist.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Треки: {selectedArtist.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedArtist.tracks} треков • {selectedArtist.followers} подписчиков
              </div>
            </div>
          </div>

          {artistTracks.map((track, i) => (
            <div
              key={track.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 0',
                borderBottom: i < artistTracks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => onPlay(track)}
            >
              <span style={{ color: '#334155', fontSize: '0.85rem', width: '20px', textAlign: 'center' }}>{i + 1}</span>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: track.coverGradient,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
                  <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{track.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{track.genre} • {track.plays} прослушиваний</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>{track.duration}</span>
                <button
                  onClick={() => onPlay(track)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
