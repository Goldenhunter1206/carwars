import { Router } from 'express';
import { getDatabase } from '../db/database.js';

const router = Router();

// Create a new player
router.post('/', (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  const db = getDatabase();

  // Check if username exists
  const existing = db.getPlayerByUsername(username);
  if (existing) {
    // Return existing player (login)
    db.updateLastLogin(existing.id);
    return res.json(existing);
  }

  // Create new player
  const player = db.createPlayer(username);
  res.status(201).json(player);
});

// Get player by ID
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const db = getDatabase();
  const player = db.getPlayer(id);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(player);
});

// Get player stats
router.get('/:id/stats', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const db = getDatabase();
  const stats = db.getPlayerStats(id);

  if (!stats) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(stats);
});

// Get player settings
router.get('/:id/settings', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const db = getDatabase();
  const settings = db.getPlayerSettings(id);

  if (!settings) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(settings);
});

// Update player settings
router.patch('/:id/settings', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const db = getDatabase();
  const { cameraDistance, cameraHeight, musicVolume, sfxVolume } = req.body;

  db.updatePlayerSettings(id, {
    cameraDistance,
    cameraHeight,
    musicVolume,
    sfxVolume,
  });

  const updated = db.getPlayerSettings(id);
  res.json(updated);
});

// Get leaderboard
router.get('/leaderboard/:stat', (req, res) => {
  const stat = req.params.stat as 'wins' | 'goals' | 'saves';
  const validStats = ['wins', 'goals', 'saves'];

  if (!validStats.includes(stat)) {
    return res.status(400).json({ error: 'Invalid stat. Use: wins, goals, or saves' });
  }

  const db = getDatabase();
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 100);
  const leaderboard = db.getLeaderboard(stat, limit);

  res.json(leaderboard);
});

export default router;
