import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  Color4,
  ShadowGenerator,
} from '@babylonjs/core';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { InputSystem } from './systems/InputSystem';
import { CameraSystem } from './systems/CameraSystem';
import { GAME_CONFIG } from '../shared/constants';
import type { GamePhase } from '../shared/types';

export class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;

  // Systems
  private physicsSystem!: PhysicsSystem;
  private inputSystem!: InputSystem;
  private cameraSystem!: CameraSystem;

  // Game state
  private phase: GamePhase = 'menu';
  private timeRemaining: number = GAME_CONFIG.MATCH_DURATION;
  private score = { blue: 0, orange: 0 };

  // Lights and shadows
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create Babylon engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
  }

  async initialize(): Promise<void> {
    // Setup lighting
    this.setupLighting();

    // Initialize physics system
    this.physicsSystem = new PhysicsSystem(this.scene);
    await this.physicsSystem.initialize();

    // Create ground/arena floor
    this.createGround();

    // Initialize input system
    this.inputSystem = new InputSystem(this.scene);
    this.inputSystem.initialize();

    // Initialize camera system
    this.cameraSystem = new CameraSystem(this.scene, this.canvas);
    this.cameraSystem.initialize();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    console.log('Game systems initialized');
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.4;
    ambientLight.groundColor = new Color3(0.2, 0.2, 0.3);

    // Main directional light (sun)
    const sunLight = new DirectionalLight(
      'sunLight',
      new Vector3(-0.5, -1, -0.5),
      this.scene
    );
    sunLight.position = new Vector3(50, 100, 50);
    sunLight.intensity = 0.8;
    sunLight.diffuse = new Color3(1, 0.98, 0.95);

    // Shadow generator
    this.shadowGenerator = new ShadowGenerator(2048, sunLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.darkness = 0.3;

    // Stadium lights (4 corners)
    const stadiumLightPositions = [
      new Vector3(-40, 15, -30),
      new Vector3(40, 15, -30),
      new Vector3(-40, 15, 30),
      new Vector3(40, 15, 30),
    ];

    stadiumLightPositions.forEach((pos, i) => {
      const light = new DirectionalLight(
        `stadiumLight${i}`,
        new Vector3(0, -1, 0),
        this.scene
      );
      light.position = pos;
      light.intensity = 0.3;
      light.diffuse = new Color3(1, 0.95, 0.9);
    });
  }

  private createGround(): void {
    // Create the arena floor using the physics system
    this.physicsSystem.createArenaFloor();
  }

  start(): void {
    // Main render loop
    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });

    this.phase = 'playing';
    console.log('Game loop started');
  }

  private update(): void {
    const deltaTime = this.engine.getDeltaTime() / 1000;

    // Update input (will be used for car control in Phase 3)
    this.inputSystem.getInput();

    // Update physics
    this.physicsSystem.update(deltaTime);

    // Update camera
    this.cameraSystem.update(deltaTime);

    // Update game timer (only in playing phase)
    if (this.phase === 'playing') {
      this.timeRemaining -= deltaTime;
      if (this.timeRemaining <= 0) {
        this.onMatchEnd();
      }
      this.updateTimerDisplay();
    }
  }

  private updateTimerDisplay(): void {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = Math.floor(this.timeRemaining % 60);
      timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  private updateScoreDisplay(): void {
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
      const spans = scoreDisplay.querySelectorAll('span');
      if (spans.length >= 3) {
        spans[0].textContent = this.score.blue.toString();
        spans[2].textContent = this.score.orange.toString();
      }
    }
  }

  scoreGoal(team: 'blue' | 'orange'): void {
    this.score[team]++;
    this.updateScoreDisplay();
    this.phase = 'goal_scored';

    // Reset after delay
    setTimeout(() => {
      this.resetPositions();
      this.phase = 'playing';
    }, 3000);
  }

  private resetPositions(): void {
    // Reset ball and car positions (to be implemented)
    this.physicsSystem.resetBall();
  }

  private onMatchEnd(): void {
    this.phase = 'ended';
    console.log(`Match ended! Blue: ${this.score.blue} - Orange: ${this.score.orange}`);
    // Future: Show end screen, save match to database
  }

  // Getters for external access
  getScene(): Scene {
    return this.scene;
  }

  getEngine(): Engine {
    return this.engine;
  }

  getPhysicsSystem(): PhysicsSystem {
    return this.physicsSystem;
  }

  getCameraSystem(): CameraSystem {
    return this.cameraSystem;
  }

  getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  dispose(): void {
    this.inputSystem.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
