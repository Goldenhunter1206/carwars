import { Router } from 'express';
import { getDatabase } from '../db/database.js';

const router = Router();

// Get player's match history
router.get('/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);

  if (isNaN(playerId)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const db = getDatabase();
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
  const matches = db.getPlayerMatches(playerId, limit);

  res.json(matches);
});

// Record a match result (called at end of game)
router.post('/', (req, res) => {
  const {
    durationSeconds,
    team1Score,
    team2Score,
    matchType = 'casual',
    players,
  } = req.body;

  // Validate required fields
  if (
    typeof durationSeconds !== 'number' ||
    typeof team1Score !== 'number' ||
    typeof team2Score !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid match data' });
  }

  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Players array is required' });
  }

  const db = getDatabase();

  // Create the match
  const matchId = db.createMatch(durationSeconds, team1Score, team2Score, matchType);

  // Add players to the match and update their stats
  for (const player of players) {
    const { playerId, team, goals, assists, saves, shots } = player;

    if (!playerId || !team) {
      continue;
    }

    // Add match player record
    db.addMatchPlayer({
      matchId,
      playerId,
      team,
      goals: goals || 0,
      assists: assists || 0,
      saves: saves || 0,
      shots: shots || 0,
    });

    // Update player stats
    const isWinner =
      (team === 1 && team1Score > team2Score) ||
      (team === 2 && team2Score > team1Score);

    db.updatePlayerStats(playerId, {
      wins: isWinner ? 1 : 0,
      losses: isWinner ? 0 : 1,
      goals: goals || 0,
      assists: assists || 0,
      saves: saves || 0,
      shots: shots || 0,
      playTimeSeconds: durationSeconds,
    });
  }

  res.status(201).json({ matchId });
});

export default router;
