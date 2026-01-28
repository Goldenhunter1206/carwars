// Vector3 type for positions and velocities
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Quaternion for rotations
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Transform for position and rotation
export interface Transform {
  position: Vec3;
  rotation: Quat;
}

// Car state for networking
export interface CarState extends Transform {
  velocity: Vec3;
  angularVelocity: Vec3;
  boost: number;
  isGrounded: boolean;
  jumpsRemaining: number;
}

// Ball state for networking
export interface BallState extends Transform {
  velocity: Vec3;
  angularVelocity: Vec3;
}

// Player input for networking
export interface PlayerInput {
  throttle: number; // -1 to 1
  steer: number; // -1 to 1
  jump: boolean;
  boost: boolean;
  airRollLeft: boolean;
  airRollRight: boolean;
  timestamp: number;
  sequence: number;
}

// Game state
export type GamePhase =
  | 'menu'
  | 'countdown'
  | 'playing'
  | 'goal_scored'
  | 'overtime'
  | 'ended';

export interface GameState {
  phase: GamePhase;
  timeRemaining: number;
  score: {
    blue: number;
    orange: number;
  };
  ball: BallState;
  cars: Map<string, CarState>;
}

// Player info
export interface Player {
  id: number;
  username: string;
  createdAt: Date;
  lastLogin: Date;
}

// Player statistics
export interface PlayerStats {
  playerId: number;
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  playTimeSeconds: number;
}

// Match info
export interface Match {
  id: number;
  playedAt: Date;
  durationSeconds: number;
  team1Score: number;
  team2Score: number;
  matchType: 'casual' | 'ranked';
}

// Match player entry
export interface MatchPlayer {
  matchId: number;
  playerId: number;
  team: 1 | 2;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
}

// Player settings
export interface PlayerSettings {
  playerId: number;
  cameraDistance: number;
  cameraHeight: number;
  musicVolume: number;
  sfxVolume: number;
}

// Team enum
export enum Team {
  Blue = 1,
  Orange = 2,
}

// Boost pad type
export interface BoostPad {
  id: number;
  position: Vec3;
  isFull: boolean;
  isActive: boolean;
  respawnTime: number;
}

// Network messages
export interface ServerMessage {
  type: 'state_update' | 'goal_scored' | 'match_start' | 'match_end';
  payload: unknown;
  timestamp: number;
}

export interface ClientMessage {
  type: 'input' | 'join' | 'leave' | 'ready';
  payload: unknown;
  timestamp: number;
}
