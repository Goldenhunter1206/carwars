import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDatabase } from './db/database.js';
import playersRouter from './routes/players.js';
import matchesRouter from './routes/matches.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());

// Initialize database
const db = getDatabase();
console.log('Database initialized');

// API Routes
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.io connection handling (for future multiplayer)
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_game', (data: { username: string }) => {
    console.log(`Player ${data.username} joining game`);
    // Future: handle game joining logic
  });

  socket.on('player_input', (input) => {
    // Future: handle player input for multiplayer
    socket.broadcast.emit('player_update', {
      playerId: socket.id,
      input,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/players');
  console.log('  GET  /api/players/:id');
  console.log('  GET  /api/players/:id/stats');
  console.log('  GET  /api/matches/:playerId');
  console.log('  GET  /api/leaderboard');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  db.close();
  httpServer.close(() => {
    process.exit(0);
  });
});
