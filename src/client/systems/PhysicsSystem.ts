import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import HavokPhysics from '@babylonjs/havok';
import { GAME_CONFIG, BALL_CONFIG } from '../../shared/constants';
import { Arena } from '../entities/Arena';
import { BoostPadManager } from '../entities/BoostPad';

export class PhysicsSystem {
  private scene: Scene;
  private havokPlugin: HavokPlugin | null = null;

  // Arena and boost pads
  private arena: Arena | null = null;
  private boostPadManager: BoostPadManager | null = null;

  // Physics bodies
  private ballMesh: Mesh | null = null;
  private ballAggregate: PhysicsAggregate | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    // Initialize Havok physics
    const havokInstance = await HavokPhysics();
    this.havokPlugin = new HavokPlugin(true, havokInstance);

    // Enable physics in the scene
    this.scene.enablePhysics(
      new Vector3(0, GAME_CONFIG.GRAVITY, 0),
      this.havokPlugin
    );

    console.log('Havok physics initialized');
  }

  createArenaFloor(): void {
    // Create the arena with curved corners, goals, and field markings
    this.arena = new Arena(this.scene);
    this.arena.create();

    // Create boost pad system
    this.boostPadManager = new BoostPadManager(this.scene);
    this.boostPadManager.initialize();

    // Create the ball
    this.createBall();

    // Create test car placeholder (for camera target)
    this.createTestCar();

    console.log('Arena created with curved corners, goals, and boost pads');
  }

  private createBall(): void {
    // Create ball mesh
    this.ballMesh = MeshBuilder.CreateSphere(
      'ball',
      {
        diameter: BALL_CONFIG.RADIUS * 2,
        segments: 32,
      },
      this.scene
    );
    this.ballMesh.position = new Vector3(0, BALL_CONFIG.RADIUS + 0.5, 0);

    // Ball material (soccer ball look)
    const ballMaterial = new StandardMaterial('ballMaterial', this.scene);
    ballMaterial.diffuseColor = Color3.White();
    ballMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    ballMaterial.specularPower = 32;
    this.ballMesh.material = ballMaterial;

    // Add physics to ball
    this.ballAggregate = new PhysicsAggregate(
      this.ballMesh,
      PhysicsShapeType.SPHERE,
      {
        mass: BALL_CONFIG.MASS,
        friction: BALL_CONFIG.FRICTION,
        restitution: BALL_CONFIG.RESTITUTION,
      },
      this.scene
    );

    // Apply some damping
    const body = this.ballAggregate.body;
    body.setLinearDamping(BALL_CONFIG.LINEAR_DAMPING);
    body.setAngularDamping(BALL_CONFIG.ANGULAR_DAMPING);
  }

  private createTestCar(): void {
    // Create a simple box to represent the car (placeholder for Phase 3)
    const car = MeshBuilder.CreateBox(
      'testCar',
      {
        width: 1.3,
        height: 0.5,
        depth: 2.3,
      },
      this.scene
    );
    car.position = new Vector3(0, 0.5, 20);

    const carMaterial = new StandardMaterial('carMaterial', this.scene);
    carMaterial.diffuseColor = new Color3(0.2, 0.5, 1); // Blue team car
    carMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    car.material = carMaterial;

    // Add physics to car
    new PhysicsAggregate(
      car,
      PhysicsShapeType.BOX,
      {
        mass: 150,
        friction: 0.5,
        restitution: 0.2,
      },
      this.scene
    );

    // Store reference for camera
    this.scene.metadata = this.scene.metadata || {};
    this.scene.metadata.playerCar = car;
  }

  update(deltaTime: number): void {
    // Physics is automatically stepped by Babylon's physics plugin
    // Additional game physics logic can go here

    // Update boost pads (respawn timers)
    if (this.boostPadManager) {
      this.boostPadManager.update(deltaTime);
    }

    // Clamp ball speed
    if (this.ballAggregate) {
      const velocity = this.ballAggregate.body.getLinearVelocity();
      const speed = velocity.length();

      if (speed > BALL_CONFIG.MAX_SPEED) {
        const clampedVelocity = velocity.normalize().scale(BALL_CONFIG.MAX_SPEED);
        this.ballAggregate.body.setLinearVelocity(clampedVelocity);
      }
    }
  }

  resetBall(): void {
    if (this.ballMesh && this.ballAggregate) {
      // Reset position
      this.ballMesh.position = new Vector3(0, BALL_CONFIG.RADIUS + 0.5, 0);

      // Reset velocities
      this.ballAggregate.body.setLinearVelocity(Vector3.Zero());
      this.ballAggregate.body.setAngularVelocity(Vector3.Zero());
    }
  }

  getBallMesh(): Mesh | null {
    return this.ballMesh;
  }

  getBallPosition(): Vector3 {
    return this.ballMesh?.position.clone() || Vector3.Zero();
  }

  getArena(): Arena | null {
    return this.arena;
  }

  getBoostPadManager(): BoostPadManager | null {
    return this.boostPadManager;
  }

  // Check if a car at the given position can collect boost
  collectBoost(carPosition: Vector3, carRadius: number = 1.5): number {
    if (!this.boostPadManager) return 0;
    return this.boostPadManager.checkCollection(carPosition, carRadius);
  }

  // Reset all boost pads (called after goal or match start)
  resetBoostPads(): void {
    this.boostPadManager?.resetAll();
  }

  // Check if ball is in goal zone
  checkGoal(): 'blue' | 'orange' | null {
    if (!this.ballMesh) return null;

    const ballPos = this.ballMesh.position;
    const { LENGTH, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } = GAME_CONFIG.ARENA;
    const halfLength = LENGTH / 2;

    // Check if ball is within goal boundaries
    if (Math.abs(ballPos.x) < GOAL_WIDTH / 2 && ballPos.y < GOAL_HEIGHT) {
      // Blue goal (negative Z)
      if (ballPos.z < -halfLength && ballPos.z > -halfLength - GOAL_DEPTH) {
        return 'orange'; // Orange team scored
      }
      // Orange goal (positive Z)
      if (ballPos.z > halfLength && ballPos.z < halfLength + GOAL_DEPTH) {
        return 'blue'; // Blue team scored
      }
    }

    return null;
  }
}
