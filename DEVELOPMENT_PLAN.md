# Car Wars - Rocket League Clone with Babylon.js

## Project Overview

A browser-based 3D car soccer game inspired by Rocket League, built with Babylon.js and TypeScript. Features physics-based gameplay, persistent player data, and potential multiplayer support.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Game Engine | Babylon.js 6.x |
| Physics | Cannon.js (via @babylonjs/cannon) |
| Language | TypeScript |
| Build Tool | Vite |
| Database | SQLite (better-sqlite3) |
| Backend | Express.js |
| Multiplayer (future) | Socket.io |
| Assets | GLTF/GLB models |

---

## Database Schema

### Players Table
```sql
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### Stats Table
```sql
CREATE TABLE stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    play_time_seconds INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### Matches Table
```sql
CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,
    team1_score INTEGER,
    team2_score INTEGER,
    match_type TEXT DEFAULT 'casual'
);
```

### Match Players Table
```sql
CREATE TABLE match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team INTEGER NOT NULL,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### Settings Table
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    camera_distance REAL DEFAULT 5.0,
    camera_height REAL DEFAULT 2.0,
    music_volume REAL DEFAULT 0.7,
    sfx_volume REAL DEFAULT 1.0,
    FOREIGN KEY (player_id) REFERENCES players(id)
);
```

---

## Development Phases

### Phase 1: Project Setup & Core Engine ✅ (Current)

**Objectives:**
- [x] Initialize project with TypeScript + Vite
- [x] Install Babylon.js and physics dependencies
- [x] Set up database with SQLite
- [x] Create basic scene with lighting and ground
- [x] Implement physics engine
- [x] Create third-person camera system

**Deliverables:**
- Working dev server with hot reload
- Basic 3D scene rendering
- Physics simulation running
- Database initialized with schema
- Camera following a test object

---

### Phase 2: Arena Environment

**Objectives:**
- [ ] Build rectangular arena with curved corners
- [ ] Add goals at each end with mesh and colliders
- [ ] Create boost pad positions (34 pads like RL)
- [ ] Add arena boundaries with physics
- [ ] Visual elements: field markings, basic textures

**Deliverables:**
- Complete playable arena
- Goals with trigger zones
- Boost pad system

---

### Phase 3: Vehicle Physics

**Objectives:**
- [ ] Create/load car mesh
- [ ] Implement raycast vehicle or wheel colliders
- [ ] Basic controls: WASD + Arrow keys
- [ ] Jump mechanic (spacebar)
- [ ] Double jump / dodge flip
- [ ] Boost system (shift key)
- [ ] Air roll controls

**Key Physics Parameters:**
```typescript
const CAR_CONFIG = {
    mass: 150,
    maxSpeed: 23, // m/s (like RL)
    boostMaxSpeed: 33,
    acceleration: 20,
    brakeForce: 30,
    turnSpeed: 2.5,
    jumpForce: 500,
    boostForce: 40,
    airControl: 0.6,
    gravity: -30
};
```

**Deliverables:**
- Fully controllable car
- Responsive arcade-style physics
- All movement mechanics working

---

### Phase 4: Ball Physics

**Objectives:**
- [ ] Create ball with appropriate size and mass
- [ ] Configure bounce dynamics
- [ ] Car-ball collision with momentum transfer
- [ ] Ball spin (optional, visual)
- [ ] Ball prediction trajectory (optional)

**Key Ball Parameters:**
```typescript
const BALL_CONFIG = {
    radius: 0.91, // meters (RL ball)
    mass: 30,
    restitution: 0.6,
    friction: 0.3,
    linearDamping: 0.3,
    angularDamping: 0.1
};
```

**Deliverables:**
- Physics-accurate ball behavior
- Satisfying car-ball interaction

---

### Phase 5: Game Logic

**Objectives:**
- [ ] Goal detection with trigger zones
- [ ] Scoring system
- [ ] Match timer (5 minutes default)
- [ ] Game states: Menu, Countdown, Playing, Goal, Overtime, End
- [ ] Reset positions after goal
- [ ] Boost pad pickup and respawn (10s for small, 4s for full)
- [ ] Basic AI opponent

**HUD Elements:**
- Score display (Team 1 vs Team 2)
- Timer
- Boost meter
- Speed indicator (optional)

**Deliverables:**
- Complete match flow
- Working HUD
- Basic AI to play against

---

### Phase 6: Polish & Effects

**Objectives:**
- [ ] Particle systems: boost trail, ball trail, goal explosion
- [ ] Sound effects: engine, boost, ball hit, goal horn
- [ ] Background music
- [ ] Camera shake on impacts
- [ ] Goal replay (slow-mo camera)
- [ ] Car customization (colors, decals)
- [ ] Menu system

**Deliverables:**
- Polished game feel
- Audio-visual feedback
- Main menu and settings

---

### Phase 7: Multiplayer

**Objectives:**
- [ ] Express + Socket.io server
- [ ] Game state synchronization
- [ ] Client-side prediction
- [ ] Server reconciliation
- [ ] Lobby system
- [ ] Matchmaking

**Network Architecture:**
```
Client                    Server
  |                         |
  |-- Input -------------->|
  |                         |-- Physics Tick
  |<-- State Update -------|
  |                         |
  |-- Predict locally       |
  |-- Reconcile on update   |
```

**Deliverables:**
- 1v1 online matches
- Low-latency gameplay
- Lobby/room system

---

## Project Structure

```
carwars/
├── src/
│   ├── client/
│   │   ├── main.ts              # Entry point
│   │   ├── Game.ts              # Main game class
│   │   ├── scenes/
│   │   │   ├── MainMenu.ts
│   │   │   └── GameScene.ts
│   │   ├── entities/
│   │   │   ├── Car.ts
│   │   │   ├── Ball.ts
│   │   │   └── Arena.ts
│   │   ├── systems/
│   │   │   ├── PhysicsSystem.ts
│   │   │   ├── InputSystem.ts
│   │   │   └── CameraSystem.ts
│   │   ├── ui/
│   │   │   ├── HUD.ts
│   │   │   └── Menu.ts
│   │   └── utils/
│   │       └── helpers.ts
│   ├── server/
│   │   ├── index.ts             # Server entry
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   └── schema.sql
│   │   ├── routes/
│   │   │   ├── players.ts
│   │   │   └── matches.ts
│   │   └── game/
│   │       └── GameServer.ts
│   └── shared/
│       ├── constants.ts
│       └── types.ts
├── public/
│   ├── index.html
│   └── assets/
│       ├── models/
│       ├── textures/
│       └── sounds/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── DEVELOPMENT_PLAN.md
```

---

## Controls

| Action | Key |
|--------|-----|
| Accelerate | W / Up Arrow |
| Reverse | S / Down Arrow |
| Steer Left | A / Left Arrow |
| Steer Right | D / Right Arrow |
| Jump | Spacebar |
| Boost | Shift |
| Air Roll Left | Q |
| Air Roll Right | E |
| Camera Toggle | C |
| Ball Cam | Tab |
| Pause | Escape |

---

## Performance Targets

- **FPS:** 60 FPS stable
- **Physics Tick:** 60 Hz
- **Network Tick:** 30 Hz (multiplayer)
- **Load Time:** < 5 seconds

---

## Resources

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [Cannon.js Physics](https://schteppe.github.io/cannon.js/)
- [Rocket League Wiki (for reference)](https://rocketleague.fandom.com/)
- [GDC Talk: It IS Rocket Science](https://www.youtube.com/watch?v=ueEmiDM94IE)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-28 | 0.1.0 | Initial project setup, Phase 1 |
