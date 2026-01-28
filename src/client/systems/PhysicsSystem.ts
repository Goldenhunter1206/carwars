import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Quaternion,
} from '@babylonjs/core';
import * as CANNON from 'cannon-es';
import { GAME_CONFIG, BALL_CONFIG } from '../../shared/constants';
import { Arena } from '../entities/Arena';
import { BoostPadManager } from '../entities/BoostPad';

export class PhysicsSystem {
  private scene: Scene;
  private world: CANNON.World | null = null;

  // Arena and boost pads
  private arena: Arena | null = null;
  private boostPadManager: BoostPadManager | null = null;

  // Physics bodies
  private ballMesh: Mesh | null = null;
  private ballBody: CANNON.Body | null = null;
  private groundBody: CANNON.Body | null = null;

  // Track all physics bodies for updates
  private physicsBodies: Array<{ mesh: Mesh; body: CANNON.Body }> = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    // Initialize Cannon.js physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, GAME_CONFIG.GRAVITY, 0);

    // Improve solver for better stability
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Default contact material
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.5;

    console.log('Cannon-ES physics initialized');
  }

  createArenaFloor(): void {
    // Create the visual arena (meshes only, no physics)
    this.arena = new Arena(this.scene);
    this.arena.create();

    // Add physics ground plane
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({ mass: 0 });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world!.addBody(this.groundBody);

    // Create physics colliders for arena walls
    this.createArenaPhysics();

    // Create boost pad system
    this.boostPadManager = new BoostPadManager(this.scene);
    this.boostPadManager.initialize();

    // Create the ball
    this.createBall();

    // Create test car placeholder (for camera target)
    this.createTestCar();

    console.log('Arena created with curved corners, goals, and boost pads');
  }

  private createArenaPhysics(): void {
    const { LENGTH, WIDTH, WALL_HEIGHT, CORNER_RADIUS, GOAL_WIDTH } = GAME_CONFIG.ARENA;
    const wallThickness = 1;

    // Calculate dimensions accounting for corners
    const straightLengthZ = LENGTH - 2 * CORNER_RADIUS;

    // Side walls (along Z axis)
    [-1, 1].forEach((side) => {
      this.addStaticBox(
        wallThickness / 2,
        WALL_HEIGHT / 2,
        straightLengthZ / 2,
        new Vector3((side * (WIDTH + wallThickness)) / 2, WALL_HEIGHT / 2, 0)
      );
    });

    // Back walls (with goal openings)
    const straightLengthX = WIDTH - 2 * CORNER_RADIUS;
    const sideWidth = (straightLengthX - GOAL_WIDTH) / 2;

    [-1, 1].forEach((side) => {
      // Left section
      this.addStaticBox(
        sideWidth / 2,
        WALL_HEIGHT / 2,
        wallThickness / 2,
        new Vector3(
          -(GOAL_WIDTH / 2 + sideWidth / 2),
          WALL_HEIGHT / 2,
          (side * (LENGTH + wallThickness)) / 2
        )
      );

      // Right section
      this.addStaticBox(
        sideWidth / 2,
        WALL_HEIGHT / 2,
        wallThickness / 2,
        new Vector3(
          GOAL_WIDTH / 2 + sideWidth / 2,
          WALL_HEIGHT / 2,
          (side * (LENGTH + wallThickness)) / 2
        )
      );
    });

    // Curved corner physics (approximated with boxes)
    this.createCornerPhysics(CORNER_RADIUS, WALL_HEIGHT, wallThickness);

    // Goal physics colliders
    this.createGoalPhysics();
  }

  private createCornerPhysics(radius: number, height: number, thickness: number): void {
    const { LENGTH, WIDTH } = GAME_CONFIG.ARENA;
    const segments = 8;

    const cornerPositions = [
      { x: WIDTH / 2 - radius, z: LENGTH / 2 - radius, startAngle: 0 },
      { x: -WIDTH / 2 + radius, z: LENGTH / 2 - radius, startAngle: Math.PI / 2 },
      { x: -WIDTH / 2 + radius, z: -LENGTH / 2 + radius, startAngle: Math.PI },
      { x: WIDTH / 2 - radius, z: -LENGTH / 2 + radius, startAngle: (3 * Math.PI) / 2 },
    ];

    cornerPositions.forEach((corner) => {
      for (let i = 0; i < segments; i++) {
        const angle1 = corner.startAngle + (i * Math.PI) / (2 * segments);
        const angle2 = corner.startAngle + ((i + 1) * Math.PI) / (2 * segments);
        const midAngle = (angle1 + angle2) / 2;
        const segmentLength = (2 * radius * Math.sin(Math.PI / (4 * segments))) * 1.05;

        const posX = corner.x + (radius + thickness / 2) * Math.cos(midAngle);
        const posZ = corner.z + (radius + thickness / 2) * Math.sin(midAngle);

        // Create rotated box for corner segment
        const shape = new CANNON.Box(new CANNON.Vec3(segmentLength / 2, height / 2, thickness / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(posX, height / 2, posZ);
        body.quaternion.setFromEuler(0, -midAngle + Math.PI / 2, 0);
        this.world!.addBody(body);
      }
    });
  }

  private createGoalPhysics(): void {
    const { LENGTH, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } = GAME_CONFIG.ARENA;

    // Goal colliders for both ends
    [-1, 1].forEach((side) => {
      const goalZ = (side * LENGTH) / 2;
      const direction = side;

      // Goal posts (vertical cylinders approximated as boxes)
      [-1, 1].forEach((postSide) => {
        this.addStaticBox(
          0.15,
          GOAL_HEIGHT / 2,
          0.15,
          new Vector3(
            (postSide * GOAL_WIDTH) / 2,
            GOAL_HEIGHT / 2,
            goalZ + direction * 0.15
          )
        );
      });

      // Crossbar
      this.addStaticBox(
        GOAL_WIDTH / 2,
        0.15,
        0.15,
        new Vector3(0, GOAL_HEIGHT, goalZ + direction * 0.15)
      );

      // Goal back wall
      this.addStaticBox(
        GOAL_WIDTH / 2,
        GOAL_HEIGHT / 2,
        0.1,
        new Vector3(0, GOAL_HEIGHT / 2, goalZ + direction * (GOAL_DEPTH + 0.1))
      );

      // Goal side walls
      [-1, 1].forEach((wallSide) => {
        this.addStaticBox(
          0.1,
          GOAL_HEIGHT / 2,
          GOAL_DEPTH / 2,
          new Vector3(
            (wallSide * GOAL_WIDTH) / 2,
            GOAL_HEIGHT / 2,
            goalZ + direction * (GOAL_DEPTH / 2 + 0.1)
          )
        );
      });

      // Goal roof
      this.addStaticBox(
        GOAL_WIDTH / 2,
        0.1,
        GOAL_DEPTH / 2,
        new Vector3(0, GOAL_HEIGHT, goalZ + direction * (GOAL_DEPTH / 2 + 0.1))
      );
    });
  }

  private addStaticBox(halfX: number, halfY: number, halfZ: number, position: Vector3): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(position.x, position.y, position.z);
    this.world!.addBody(body);
    return body;
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
    this.ballMesh.position = new Vector3(0, BALL_CONFIG.RADIUS + 2, 0);

    // Ball material (soccer ball look)
    const ballMaterial = new StandardMaterial('ballMaterial', this.scene);
    ballMaterial.diffuseColor = Color3.White();
    ballMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    ballMaterial.specularPower = 32;
    this.ballMesh.material = ballMaterial;

    // Add physics to ball
    const ballShape = new CANNON.Sphere(BALL_CONFIG.RADIUS);
    this.ballBody = new CANNON.Body({
      mass: BALL_CONFIG.MASS,
      shape: ballShape,
      position: new CANNON.Vec3(0, BALL_CONFIG.RADIUS + 2, 0),
      linearDamping: BALL_CONFIG.LINEAR_DAMPING,
      angularDamping: BALL_CONFIG.ANGULAR_DAMPING,
    });

    // Set material properties
    this.ballBody.material = new CANNON.Material('ball');
    const ballGroundContact = new CANNON.ContactMaterial(
      this.ballBody.material,
      new CANNON.Material('ground'),
      {
        friction: BALL_CONFIG.FRICTION,
        restitution: BALL_CONFIG.RESTITUTION,
      }
    );
    this.world!.addContactMaterial(ballGroundContact);
    this.world!.addBody(this.ballBody);

    this.physicsBodies.push({ mesh: this.ballMesh, body: this.ballBody });
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
    car.position = new Vector3(0, 1, 20);

    const carMaterial = new StandardMaterial('carMaterial', this.scene);
    carMaterial.diffuseColor = new Color3(0.2, 0.5, 1); // Blue team car
    carMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    car.material = carMaterial;

    // Add physics to car
    const carShape = new CANNON.Box(new CANNON.Vec3(0.65, 0.25, 1.15));
    const carBody = new CANNON.Body({
      mass: 150,
      shape: carShape,
      position: new CANNON.Vec3(0, 1, 20),
      linearDamping: 0.3,
      angularDamping: 0.5,
    });
    this.world!.addBody(carBody);
    this.physicsBodies.push({ mesh: car, body: carBody });

    // Store reference for camera
    this.scene.metadata = this.scene.metadata || {};
    this.scene.metadata.playerCar = car;
  }

  update(deltaTime: number): void {
    if (!this.world) return;

    // Step the physics simulation
    this.world.step(1 / 60, deltaTime, 3);

    // Sync mesh positions with physics bodies
    for (const { mesh, body } of this.physicsBodies) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.rotationQuaternion = new Quaternion(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    }

    // Update boost pads (respawn timers)
    if (this.boostPadManager) {
      this.boostPadManager.update(deltaTime);
    }

    // Clamp ball speed
    if (this.ballBody) {
      const velocity = this.ballBody.velocity;
      const speed = velocity.length();

      if (speed > BALL_CONFIG.MAX_SPEED) {
        velocity.scale(BALL_CONFIG.MAX_SPEED / speed, velocity);
      }
    }
  }

  resetBall(): void {
    if (this.ballMesh && this.ballBody) {
      // Reset position
      this.ballBody.position.set(0, BALL_CONFIG.RADIUS + 2, 0);
      this.ballMesh.position = new Vector3(0, BALL_CONFIG.RADIUS + 2, 0);

      // Reset velocities
      this.ballBody.velocity.set(0, 0, 0);
      this.ballBody.angularVelocity.set(0, 0, 0);
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

  getWorld(): CANNON.World | null {
    return this.world;
  }
}
