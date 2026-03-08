/**
 * ClaudMusic — WebSocket + HTTP Server
 *
 * ЗАПУСК (любой из вариантов):
 *   node server.js           ← автоматически соберёт фронтенд если нужно
 *   npm run build && node server.js
 *
 * Railway / Render:
 *   Build command:  npm run build
 *   Start command:  node server.js
 *   PORT берётся из env автоматически
 */

import { createServer }          from 'http';
import { WebSocketServer }       from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname }         from 'path';
import { fileURLToPath }         from 'url';
import { execSync }              from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PORT       = Number(process.env.PORT) || 3000;
const HOST       = process.env.HOST || '0.0.0.0';

// ─── AUTO-BUILD if dist/index.html missing ────────────────────────────────────
const DIST_HTML = join(__dirname, 'dist', 'index.html');

if (!existsSync(DIST_HTML)) {
  console.log('⚙️  dist/index.html не найден — запускаю npm run build...\n');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Сборка завершена!\n');
  } catch (e) {
    console.error('\n❌ Ошибка сборки. Убедись что установлены зависимости:');
    console.error('   npm install\n   npm run build\n');
    process.exit(1);
  }
}

// ─── PATHS ───────────────────────────────────────────────────────────────────
const DATA_DIR  = join(__dirname, 'data');
const DB_FILE   = join(DATA_DIR, 'db.json');

// ─── DB ──────────────────────────────────────────────────────────────────────
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadDb() {
  try {
    if (existsSync(DB_FILE)) {
      const parsed = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
      return {
        tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
        users:  Array.isArray(parsed.users)  ? parsed.users  : [],
      };
    }
  } catch (e) { console.error('[DB] load error:', e.message); }
  return { tracks: [], users: [] };
}

function saveDb() {
  try { writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8'); }
  catch (e) { console.error('[DB] save error:', e.message); }
}

const state = loadDb();
console.log(`[DB] Загружено: ${state.tracks.length} треков, ${state.users.length} пользователей`);

// ─── HTTP SERVER ─────────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API ───────────────────────────────────────────────────────────────────
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, tracks: state.tracks.length, users: state.users.length, uptime: Math.round(process.uptime()) }));
    return;
  }

  if (req.url === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ tracks: state.tracks, users: state.users }));
    return;
  }

  // ── Serve dist/index.html for ALL requests ────────────────────────────────
  // vite-plugin-singlefile inlines ALL JS/CSS into one index.html
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    const html = readFileSync(DIST_HTML);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(html);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер запускается, подожди секунду и обнови страницу...');
  }
});

// ─── WS HELPERS ──────────────────────────────────────────────────────────────
function send(ws, data) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(data)); }
  catch (e) { console.error('[WS] send error:', e.message); }
}

function broadcast(data, except = null) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) {
      try { client.send(msg); } catch { /**/ }
    }
  }
}

function notifyUser(targetUserId, notification) {
  for (const [ws, uid] of clientUserMap) {
    if (uid === targetUserId && ws.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'NOTIFICATION', notification })); } catch { /**/ }
    }
  }
}

function makeNotif(type, text, icon = '🔔', trackId = null) {
  return { id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2), type, text, icon, ts: Date.now(), trackId };
}

// ─── WEBSOCKET ───────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });
const clientUserMap = new Map(); // ws → userId

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[WS] +подключение ${ip} (всего: ${wss.clients.size})`);
  clientUserMap.set(ws, null);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {

      case 'INIT': {
        if (msg.userId) clientUserMap.set(ws, msg.userId);
        send(ws, { type: 'STATE', tracks: state.tracks, users: state.users });
        break;
      }

      case 'IDENTIFY': {
        if (msg.userId) clientUserMap.set(ws, msg.userId);
        break;
      }

      case 'REGISTER': {
        const { user } = msg;
        if (!user?.name || !user?.email) { send(ws, { type: 'ERROR', message: 'Имя и email обязательны' }); break; }

        const nameLow  = user.name.trim().toLowerCase();
        const emailLow = user.email.trim().toLowerCase();

        if (state.users.some(u => u.name.trim().toLowerCase() === nameLow)) {
          send(ws, { type: 'ERROR', message: `Имя «${user.name.trim()}» уже занято` }); break;
        }
        if (state.users.some(u => u.email.trim().toLowerCase() === emailLow)) {
          send(ws, { type: 'ERROR', message: 'Этот email уже зарегистрирован' }); break;
        }

        const pub = {
          id: user.id,
          name: user.name.trim(),
          email: emailLow,
          role: user.role || 'listener',
          tracksCount: 0,
          followers: 0,
          verified: true,
          joinedAt: user.joinedAt || new Date().toLocaleDateString('ru-RU'),
        };
        state.users.push(pub);
        clientUserMap.set(ws, pub.id);
        saveDb();

        send(ws, { type: 'REGISTER_OK', user: pub });
        broadcast({ type: 'USER_REGISTERED', user: pub }, ws);
        console.log(`[REG] ${pub.name} (${pub.role})`);
        break;
      }

      case 'LOGIN': {
        const emailLow = (msg.email || '').trim().toLowerCase();
        const found = state.users.find(u => u.email.trim().toLowerCase() === emailLow);
        if (found) {
          clientUserMap.set(ws, found.id);
          send(ws, { type: 'LOGIN_OK', user: found });
          console.log(`[LOGIN] ${found.name}`);
        } else {
          send(ws, { type: 'LOGIN_NOT_FOUND' });
        }
        break;
      }

      case 'UPLOAD_TRACK': {
        const { track } = msg;
        if (!track?.id || !track?.title) break;
        const saved = { ...track, audioUrl: undefined };
        if (!state.tracks.some(t => t.id === saved.id)) {
          state.tracks.unshift(saved);
          const uIdx = state.users.findIndex(u => u.id === track.artistId);
          if (uIdx !== -1) state.users[uIdx].tracksCount = (state.users[uIdx].tracksCount || 0) + 1;
          saveDb();
          broadcast({ type: 'TRACK_ADDED', track: saved });
          console.log(`[TRACK] "${track.title}" by ${track.artist}`);
        }
        break;
      }

      case 'LIKE': {
        const { trackId, userId } = msg;
        const track = state.tracks.find(t => t.id === trackId);
        if (!track) break;
        if (!track._likedBy) track._likedBy = [];
        const already = track._likedBy.includes(userId);
        if (already) {
          track._likedBy = track._likedBy.filter(id => id !== userId);
          track.likes = Math.max(0, (track.likes || 0) - 1);
        } else {
          track._likedBy.push(userId);
          track.likes = (track.likes || 0) + 1;
          if (track.artistId && track.artistId !== userId) {
            const liker = state.users.find(u => u.id === userId);
            notifyUser(track.artistId, makeNotif('like', `${liker?.name || 'Кто-то'} лайкнул «${track.title}»`, '❤️', trackId));
          }
        }
        saveDb();
        broadcast({ type: 'TRACK_UPDATED', track: { ...track, _likedBy: undefined } });
        break;
      }

      case 'REPOST': {
        const { trackId, userId } = msg;
        const track = state.tracks.find(t => t.id === trackId);
        if (!track) break;
        if (!track._repostedBy) track._repostedBy = [];
        const already = track._repostedBy.includes(userId);
        if (already) {
          track._repostedBy = track._repostedBy.filter(id => id !== userId);
          track.reposts = Math.max(0, (track.reposts || 0) - 1);
        } else {
          track._repostedBy.push(userId);
          track.reposts = (track.reposts || 0) + 1;
          if (track.artistId && track.artistId !== userId) {
            const rep = state.users.find(u => u.id === userId);
            notifyUser(track.artistId, makeNotif('repost', `${rep?.name || 'Кто-то'} сделал репост «${track.title}»`, '🔄', trackId));
          }
        }
        saveDb();
        broadcast({ type: 'TRACK_UPDATED', track: { ...track, _repostedBy: undefined } });
        break;
      }

      case 'COMMENT': {
        const { trackId, comment } = msg;
        const track = state.tracks.find(t => t.id === trackId);
        if (!track || !comment?.id) break;
        if (!track.comments) track.comments = [];
        if (!track.comments.some(c => c.id === comment.id)) {
          track.comments.push(comment);
          saveDb();
          broadcast({ type: 'TRACK_UPDATED', track });
          if (track.artistId && track.artistId !== comment.userId) {
            const preview = comment.text.slice(0, 45) + (comment.text.length > 45 ? '…' : '');
            notifyUser(track.artistId, makeNotif('comment', `${comment.userName} прокомментировал «${track.title}»: "${preview}"`, '💬', trackId));
          }
          if (comment.replyTo?.id) {
            const parent = track.comments.find(c => c.id === comment.replyTo.id);
            if (parent && parent.userId !== comment.userId) {
              notifyUser(parent.userId, makeNotif('reply', `${comment.userName} ответил на твой комментарий`, '↩️', trackId));
            }
          }
        }
        break;
      }

      case 'COMMENT_LIKE': {
        const { trackId, commentId, userId } = msg;
        const track = state.tracks.find(t => t.id === trackId);
        if (!track) break;
        const c = (track.comments || []).find(c => c.id === commentId);
        if (!c) break;
        if (!c._likedBy) c._likedBy = [];
        const liked = c._likedBy.includes(userId);
        if (liked) { c._likedBy = c._likedBy.filter(id => id !== userId); c.likes = Math.max(0, (c.likes || 0) - 1); }
        else        { c._likedBy.push(userId); c.likes = (c.likes || 0) + 1; }
        saveDb();
        broadcast({ type: 'TRACK_UPDATED', track });
        break;
      }

      case 'PLAY': {
        const track = state.tracks.find(t => t.id === msg.trackId);
        if (track) { track.plays = (track.plays || 0) + 1; saveDb(); broadcast({ type: 'TRACK_UPDATED', track }); }
        break;
      }

      case 'FOLLOW': {
        const { targetId, followerId } = msg;
        const target = state.users.find(u => u.id === targetId);
        if (!target) break;
        if (!target._followers) target._followers = [];
        const already = target._followers.includes(followerId);
        if (already) {
          target._followers = target._followers.filter(id => id !== followerId);
          target.followers = Math.max(0, (target.followers || 0) - 1);
        } else {
          target._followers.push(followerId);
          target.followers = (target.followers || 0) + 1;
          const follower = state.users.find(u => u.id === followerId);
          notifyUser(targetId, makeNotif('follow', `${follower?.name || 'Кто-то'} подписался на тебя`, '👤'));
        }
        saveDb();
        broadcast({ type: 'USER_UPDATED', user: { ...target, _followers: undefined } });
        break;
      }

      default: break;
    }
  });

  ws.on('close', () => {
    clientUserMap.delete(ws);
    console.log(`[WS] -отключение (осталось: ${wss.clients.size})`);
  });
  ws.on('error', err => console.error('[WS] error:', err.message));
});

// ─── START ───────────────────────────────────────────────────────────────────
httpServer.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║           ClaudMusic Server v5.0                 ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  🌐  http://localhost:${String(PORT).padEnd(28)}║
║  📡  ws://localhost:${String(PORT).padEnd(30)}║
║  💾  data/db.json  (автосохранение)              ║
║  📊  /api/health   /api/state                    ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║  Деплой на Railway / Render:                     ║
║    Build:  npm run build                         ║
║    Start:  node server.js                        ║
╚══════════════════════════════════════════════════╝
`);
});

process.on('SIGTERM', () => { console.log('\n[Server] Сохранение...'); saveDb(); process.exit(0); });
process.on('SIGINT',  () => { console.log('\n[Server] Сохранение...'); saveDb(); process.exit(0); });
