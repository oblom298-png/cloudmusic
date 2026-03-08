import { useState, useRef } from 'react';

export function UploadSection() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    setUploadedFile(file.name);
    setUploaded(false);
    setUploadProgress(0);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const simulateUpload = () => {
    if (!uploadedFile || !formData.title || !formData.genre) return;
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploaded(true);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 150);
  };

  const reset = () => {
    setUploadedFile(null);
    setUploaded(false);
    setUploadProgress(0);
    setFormData({ title: '', genre: '', description: '' });
  };

  const genres = ['Electronic', 'Hip-Hop', 'Rock', 'Lo-Fi', 'Jazz', 'Classical', 'Pop', 'Indie', 'Synthwave', 'R&B', 'Metal', 'Folk'];

  return (
    <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', position: 'relative' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }} className="reveal">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '100px',
            padding: '5px 16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#34d399',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '16px',
          }}>
            ⬆️ Загрузить
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Поделись своей музыкой
          </h2>
          <p style={{ color: '#64748b', marginTop: '12px', fontSize: '1rem' }}>
            Загрузи трек и позволь миру услышать тебя. Поддерживаются MP3, WAV, FLAC, AAC.
          </p>
        </div>

        <div className="glass reveal" style={{ borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {uploaded ? (
            // Success state
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #3B82F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 40px rgba(16,185,129,0.3)',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
                Трек опубликован! 🎉
              </h3>
              <p style={{ color: '#64748b', marginBottom: '32px' }}>
                "{formData.title}" успешно загружен и доступен для прослушивания.
              </p>
              <button
                onClick={reset}
                className="btn-glow"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'white',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>Загрузить ещё</span>
              </button>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '32px',
                  background: isDragOver ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <UploadIcon />
                </div>
                {uploadedFile ? (
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
                      ✓ {uploadedFile}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Кликни для замены файла
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                      Перетащи аудио файл сюда
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      или кликни для выбора файла
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'].map(fmt => (
                        <span key={fmt} style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '3px 10px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          color: '#64748b',
                        }}>{fmt}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Название трека *
                  </label>
                  <input
                    className="input-dark"
                    placeholder="Введите название..."
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Жанр *
                  </label>
                  <select
                    className="input-dark"
                    value={formData.genre}
                    onChange={e => setFormData(p => ({ ...p, genre: e.target.value }))}
                  >
                    <option value="" style={{ background: '#1a1a1a', color: '#475569' }}>Выберите жанр</option>
                    {genres.map(g => (
                      <option key={g} value={g} style={{ background: '#1a1a1a', color: '#f8fafc' }}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Описание
                  </label>
                  <textarea
                    className="input-dark"
                    placeholder="Расскажи о своём треке..."
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Progress bar (when uploading) */}
              {uploading && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Загрузка...</span>
                    <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>{Math.round(Math.min(uploadProgress, 100))}%</span>
                  </div>
                  <div style={{
                    height: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(uploadProgress, 100)}%`,
                      background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)',
                      borderRadius: '3px',
                      transition: 'width 0.2s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={simulateUpload}
                disabled={!uploadedFile || !formData.title || !formData.genre || uploading}
                className="btn-glow"
                style={{
                  width: '100%',
                  border: 'none',
                  cursor: (!uploadedFile || !formData.title || !formData.genre || uploading) ? 'not-allowed' : 'pointer',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'white',
                  fontFamily: 'Inter, sans-serif',
                  opacity: (!uploadedFile || !formData.title || !formData.genre || uploading) ? 0.5 : 1,
                }}
              >
                <span>{uploading ? 'Публикация...' : 'Опубликовать трек'}</span>
              </button>

              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: '#334155' }}>
                Публикуя трек, вы подтверждаете, что это ваша оригинальная работа
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
