// api/login.js — POST /api/login
import { store } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email обязателен' });

  const emailLow = email.trim().toLowerCase();
  const found = store.users.find(u => u.email.trim().toLowerCase() === emailLow);

  if (!found) {
    return res.status(404).json({ error: 'Аккаунт не найден' });
  }

  console.log(`[LOGIN] ${found.name}`);
  return res.status(200).json({ ok: true, user: found });
}
