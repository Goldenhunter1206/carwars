import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Player, PlayerStats, Match, MatchPlayer, PlayerSettings } from '../../shared/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class GameDatabase {
  private db: Database.Database;

  constructor(dbPath: string = 'carwars.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
  }

  // Player methods
  createPlayer(username: string): Player {
    const stmt = this.db.prepare(`
      INSERT INTO players (username) VALUES (?)
    `);
    const result = stmt.run(username);
    return this.getPlayer(result.lastInsertRowid as number)!;
  }

  getPlayer(id: number): Player | null {
    const stmt = this.db.prepare(`
      SELECT id, username, created_at as createdAt, last_login as lastLogin
      FROM players WHERE id = ?
    `);
    return stmt.get(id) as Player | null;
  }

  getPlayerByUsername(username: string): Player | null {
    const stmt = this.db.prepare(`
      SELECT id, username, created_at as createdAt, last_login as lastLogin
      FROM players WHERE username = ?
    `);
    return stmt.get(username) as Player | null;
  }

  updateLastLogin(playerId: number): void {
    const stmt = this.db.prepare(`
      UPDATE players SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(playerId);
  }

  // Stats methods
  getPlayerStats(playerId: number): PlayerStats | null {
    const stmt = this.db.prepare(`
      SELECT
        player_id as playerId,
        wins, losses, goals, assists, saves, shots,
        play_time_seconds as playTimeSeconds
      FROM stats WHERE player_id = ?
    `);
    return stmt.get(playerId) as PlayerStats | null;
  }

  updatePlayerStats(playerId: number, stats: Partial<PlayerStats>): void {
    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (stats.wins !== undefined) {
      updates.push('wins = wins + ?');
      values.push(stats.wins);
    }
    if (stats.losses !== undefined) {
      updates.push('losses = losses + ?');
      values.push(stats.losses);
    }
    if (stats.goals !== undefined) {
      updates.push('goals = goals + ?');
      values.push(stats.goals);
    }
    if (stats.assists !== undefined) {
      updates.push('assists = assists + ?');
      values.push(stats.assists);
    }
    if (stats.saves !== undefined) {
      updates.push('saves = saves + ?');
      values.push(stats.saves);
    }
    if (stats.shots !== undefined) {
      updates.push('shots = shots + ?');
      values.push(stats.shots);
    }
    if (stats.playTimeSeconds !== undefined) {
      updates.push('play_time_seconds = play_time_seconds + ?');
      values.push(stats.playTimeSeconds);
    }

    if (updates.length > 0) {
      values.push(playerId);
      const stmt = this.db.prepare(`
        UPDATE stats SET ${updates.join(', ')} WHERE player_id = ?
      `);
      stmt.run(...values);
    }
  }

  // Match methods
  createMatch(
    durationSeconds: number,
    team1Score: number,
    team2Score: number,
    matchType: 'casual' | 'ranked' = 'casual'
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO matches (duration_seconds, team1_score, team2_score, match_type)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(durationSeconds, team1Score, team2Score, matchType);
    return result.lastInsertRowid as number;
  }

  addMatchPlayer(matchPlayer: Omit<MatchPlayer, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO match_players (match_id, player_id, team, goals, assists, saves, shots)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      matchPlayer.matchId,
      matchPlayer.playerId,
      matchPlayer.team,
      matchPlayer.goals,
      matchPlayer.assists,
      matchPlayer.saves,
      matchPlayer.shots
    );
  }

  getPlayerMatches(playerId: number, limit: number = 10): Match[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT m.id, m.played_at as playedAt, m.duration_seconds as durationSeconds,
             m.team1_score as team1Score, m.team2_score as team2Score, m.match_type as matchType
      FROM matches m
      JOIN match_players mp ON m.id = mp.match_id
      WHERE mp.player_id = ?
      ORDER BY m.played_at DESC
      LIMIT ?
    `);
    return stmt.all(playerId, limit) as Match[];
  }

  // Settings methods
  getPlayerSettings(playerId: number): PlayerSettings | null {
    const stmt = this.db.prepare(`
      SELECT
        player_id as playerId,
        camera_distance as cameraDistance,
        camera_height as cameraHeight,
        music_volume as musicVolume,
        sfx_volume as sfxVolume
      FROM settings WHERE player_id = ?
    `);
    return stmt.get(playerId) as PlayerSettings | null;
  }

  updatePlayerSettings(playerId: number, settings: Partial<PlayerSettings>): void {
    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (settings.cameraDistance !== undefined) {
      updates.push('camera_distance = ?');
      values.push(settings.cameraDistance);
    }
    if (settings.cameraHeight !== undefined) {
      updates.push('camera_height = ?');
      values.push(settings.cameraHeight);
    }
    if (settings.musicVolume !== undefined) {
      updates.push('music_volume = ?');
      values.push(settings.musicVolume);
    }
    if (settings.sfxVolume !== undefined) {
      updates.push('sfx_volume = ?');
      values.push(settings.sfxVolume);
    }

    if (updates.length > 0) {
      values.push(playerId);
      const stmt = this.db.prepare(`
        UPDATE settings SET ${updates.join(', ')} WHERE player_id = ?
      `);
      stmt.run(...values);
    }
  }

  // Leaderboard
  getLeaderboard(
    stat: 'wins' | 'goals' | 'saves' = 'wins',
    limit: number = 10
  ): Array<{ username: string; value: number }> {
    const stmt = this.db.prepare(`
      SELECT p.username, s.${stat} as value
      FROM stats s
      JOIN players p ON s.player_id = p.id
      ORDER BY s.${stat} DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<{ username: string; value: number }>;
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: GameDatabase | null = null;

export function getDatabase(): GameDatabase {
  if (!dbInstance) {
    dbInstance = new GameDatabase();
  }
  return dbInstance;
}
