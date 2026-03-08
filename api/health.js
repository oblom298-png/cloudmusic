// api/health.js — GET /api/health
import { store } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  res.status(200).json({
    ok:      true,
    tracks:  store.tracks.length,
    users:   store.users.length,
    uptime:  Math.round(process.uptime()),
    ts:      Date.now(),
  });
}
