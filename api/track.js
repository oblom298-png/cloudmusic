// api/track.js — POST /api/track (upload track metadata)
import { store, addEvent } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const { track } = req.body || {};
  if (!track?.id || !track?.title) {
    return res.status(400).json({ error: 'track.id и track.title обязательны' });
  }

  // Strip audio blob URLs — server only stores metadata
  const saved = { ...track, audioUrl: undefined };

  if (!store.tracks.some(t => t.id === saved.id)) {
    store.tracks.unshift(saved);

    // Update artist track count
    const uIdx = store.users.findIndex(u => u.id === track.artistId);
    if (uIdx !== -1) {
      store.users[uIdx].tracksCount = (store.users[uIdx].tracksCount || 0) + 1;
    }

    addEvent('TRACK_ADDED', { track: saved });
    console.log(`[TRACK] "${track.title}" by ${track.artist}`);
  }

  return res.status(200).json({ ok: true });
}
