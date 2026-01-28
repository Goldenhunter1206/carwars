import { Game } from './Game';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const loading = document.getElementById('loading') as HTMLDivElement;
  const hud = document.getElementById('hud') as HTMLDivElement;

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    // Create and initialize the game
    const game = new Game(canvas);
    await game.initialize();

    // Hide loading, show HUD
    loading.style.display = 'none';
    hud.style.display = 'block';

    // Start the game loop
    game.start();

    // Expose game instance for debugging
    (window as unknown as { game: Game }).game = game;

    console.log('Car Wars initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    loading.innerHTML = `
      <div style="color: #f44;">Failed to load game</div>
      <div style="font-size: 14px; margin-top: 10px;">${error}</div>
    `;
  }
});
