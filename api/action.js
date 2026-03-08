// api/action.js — POST /api/action
// Handles: like, repost, comment, play, follow, comment_like
import { store, addEvent } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const { type, trackId, userId, comment, commentId, targetId, followerId } = req.body || {};

  switch (type) {

    case 'LIKE': {
      const track = store.tracks.find(t => t.id === trackId);
      if (!track) return res.status(404).json({ error: 'Track not found' });
      if (!track._likedBy) track._likedBy = [];
      const already = track._likedBy.includes(userId);
      if (already) {
        track._likedBy = track._likedBy.filter(id => id !== userId);
        track.likes    = Math.max(0, (track.likes || 0) - 1);
      } else {
        track._likedBy.push(userId);
        track.likes = (track.likes || 0) + 1;
      }
      addEvent('TRACK_UPDATED', { track: { ...track, _likedBy: undefined } });
      return res.status(200).json({ ok: true, likes: track.likes });
    }

    case 'REPOST': {
      const track = store.tracks.find(t => t.id === trackId);
      if (!track) return res.status(404).json({ error: 'Track not found' });
      if (!track._repostedBy) track._repostedBy = [];
      const already = track._repostedBy.includes(userId);
      if (already) {
        track._repostedBy = track._repostedBy.filter(id => id !== userId);
        track.reposts     = Math.max(0, (track.reposts || 0) - 1);
      } else {
        track._repostedBy.push(userId);
        track.reposts = (track.reposts || 0) + 1;
      }
      addEvent('TRACK_UPDATED', { track: { ...track, _repostedBy: undefined } });
      return res.status(200).json({ ok: true, reposts: track.reposts });
    }

    case 'COMMENT': {
      const track = store.tracks.find(t => t.id === trackId);
      if (!track || !comment?.id) return res.status(400).json({ error: 'Bad request' });
      if (!track.comments) track.comments = [];
      if (!track.comments.some(c => c.id === comment.id)) {
        track.comments.push(comment);
        addEvent('TRACK_UPDATED', { track });
      }
      return res.status(200).json({ ok: true });
    }

    case 'COMMENT_LIKE': {
      const track = store.tracks.find(t => t.id === trackId);
      if (!track) return res.status(404).json({ error: 'Track not found' });
      const c = (track.comments || []).find(c => c.id === commentId);
      if (!c) return res.status(404).json({ error: 'Comment not found' });
      if (!c._likedBy) c._likedBy = [];
      const liked = c._likedBy.includes(userId);
      if (liked) {
        c._likedBy = c._likedBy.filter(id => id !== userId);
        c.likes    = Math.max(0, (c.likes || 0) - 1);
      } else {
        c._likedBy.push(userId);
        c.likes = (c.likes || 0) + 1;
      }
      addEvent('TRACK_UPDATED', { track });
      return res.status(200).json({ ok: true });
    }

    case 'PLAY': {
      const track = store.tracks.find(t => t.id === trackId);
      if (track) {
        track.plays = (track.plays || 0) + 1;
        addEvent('TRACK_UPDATED', { track });
      }
      return res.status(200).json({ ok: true });
    }

    case 'FOLLOW': {
      const target = store.users.find(u => u.id === targetId);
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (!target._followers) target._followers = [];
      const already = target._followers.includes(followerId);
      if (already) {
        target._followers = target._followers.filter(id => id !== followerId);
        target.followers  = Math.max(0, (target.followers || 0) - 1);
      } else {
        target._followers.push(followerId);
        target.followers = (target.followers || 0) + 1;
      }
      addEvent('USER_UPDATED', { user: { ...target, _followers: undefined } });
      return res.status(200).json({ ok: true, followers: target.followers });
    }

    default:
      return res.status(400).json({ error: `Unknown action type: ${type}` });
  }
}
