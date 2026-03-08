// api/register.js — POST /api/register
import { store, addEvent } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const { user } = req.body || {};

  if (!user?.name || !user?.email) {
    return res.status(400).json({ error: 'Имя и email обязательны' });
  }

  const nameLow  = user.name.trim().toLowerCase();
  const emailLow = user.email.trim().toLowerCase();

  if (store.users.some(u => u.name.trim().toLowerCase() === nameLow)) {
    return res.status(409).json({ error: `Имя «${user.name.trim()}» уже занято` });
  }
  if (store.users.some(u => u.email.trim().toLowerCase() === emailLow)) {
    return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
  }

  const pub = {
    id:          user.id || ('u_' + Date.now() + '_' + Math.random().toString(36).slice(2)),
    name:        user.name.trim(),
    email:       emailLow,
    role:        user.role || 'listener',
    tracksCount: 0,
    followers:   0,
    verified:    true,
    joinedAt:    user.joinedAt || new Date().toLocaleDateString('ru-RU'),
    bio:         user.bio || '',
  };

  store.users.push(pub);
  addEvent('USER_REGISTERED', { user: pub });

  console.log(`[REG] ${pub.name} (${pub.role})`);
  return res.status(200).json({ ok: true, user: pub });
}
