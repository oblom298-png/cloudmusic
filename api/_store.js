// api/_store.js — Shared in-memory store for Vercel serverless
// NOTE: Vercel serverless functions share memory within the same instance/region.
// For production persistence, replace with @vercel/kv or a database.
// For demo/prototype this works great — data persists across requests in same instance.

export const store = global.__claudmusic_store || (() => {
  const s = {
    tracks:     [],
    users:      [],
    lastUpdate: Date.now(),
    events:     [], // SSE event log (last 100)
  };
  global.__claudmusic_store = s;
  return s;
})();

export function addEvent(type, data) {
  store.lastUpdate = Date.now();
  store.events.push({ type, data, ts: Date.now() });
  if (store.events.length > 200) store.events = store.events.slice(-100);
}
