// Game Constants - Based on Rocket League physics
export const GAME_CONFIG = {
  // Match settings
  MATCH_DURATION: 300, // 5 minutes in seconds
  COUNTDOWN_DURATION: 3,
  GOAL_REPLAY_DURATION: 5,

  // Physics
  PHYSICS_TIMESTEP: 1 / 60,
  GRAVITY: -30,

  // Arena dimensions (based on RL, scaled down slightly)
  ARENA: {
    LENGTH: 100, // goal to goal
    WIDTH: 70,
    HEIGHT: 20,
    WALL_HEIGHT: 4,
    GOAL_WIDTH: 8,
    GOAL_HEIGHT: 4,
    GOAL_DEPTH: 3,
    CORNER_RADIUS: 10,
  },

  // Boost pads
  BOOST_PAD: {
    SMALL_AMOUNT: 12,
    FULL_AMOUNT: 100,
    SMALL_RESPAWN: 4,
    FULL_RESPAWN: 10,
    MAX_BOOST: 100,
  },
} as const;

export const CAR_CONFIG = {
  // Dimensions
  LENGTH: 2.3,
  WIDTH: 1.3,
  HEIGHT: 0.5,

  // Physics
  MASS: 150,
  MAX_SPEED: 23, // m/s
  BOOST_MAX_SPEED: 33,
  ACCELERATION: 20,
  BRAKE_FORCE: 30,
  TURN_SPEED: 2.5,
  DRIFT_FACTOR: 0.95,

  // Jumping
  JUMP_FORCE: 500,
  DOUBLE_JUMP_FORCE: 400,
  JUMP_COOLDOWN: 1.5, // seconds
  MAX_JUMPS: 2,

  // Boost
  BOOST_FORCE: 40,
  BOOST_CONSUMPTION: 33, // per second

  // Air control
  AIR_CONTROL: 0.6,
  AIR_ROLL_SPEED: 3,

  // Suspension
  SUSPENSION_REST_LENGTH: 0.3,
  SUSPENSION_STIFFNESS: 50,
  DAMPING: 2.3,
} as const;

export const BALL_CONFIG = {
  RADIUS: 0.91, // meters (RL ball is 91.25 uu, roughly 91cm)
  MASS: 30,
  RESTITUTION: 0.6,
  FRICTION: 0.35,
  LINEAR_DAMPING: 0.3,
  ANGULAR_DAMPING: 0.1,
  MAX_SPEED: 60,
} as const;

export const NETWORK_CONFIG = {
  TICK_RATE: 30,
  INTERPOLATION_DELAY: 100, // ms
  MAX_PREDICTION_FRAMES: 10,
} as const;

// Input key mappings
export const KEY_BINDINGS = {
  ACCELERATE: ['KeyW', 'ArrowUp'],
  BRAKE: ['KeyS', 'ArrowDown'],
  STEER_LEFT: ['KeyA', 'ArrowLeft'],
  STEER_RIGHT: ['KeyD', 'ArrowRight'],
  JUMP: ['Space'],
  BOOST: ['ShiftLeft', 'ShiftRight'],
  AIR_ROLL_LEFT: ['KeyQ'],
  AIR_ROLL_RIGHT: ['KeyE'],
  CAMERA_TOGGLE: ['KeyC'],
  BALL_CAM: ['Tab'],
  PAUSE: ['Escape'],
} as const;
