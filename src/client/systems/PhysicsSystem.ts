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

export class PhysicsSystem {
  private scene: Scene;
  private havokPlugin: HavokPlugin | null = null;

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
    // Create the ground mesh
    const ground = MeshBuilder.CreateGround(
      'ground',
      {
        width: GAME_CONFIG.ARENA.WIDTH,
        height: GAME_CONFIG.ARENA.LENGTH,
        subdivisions: 2,
      },
      this.scene
    );

    // Create material for the ground
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new Color3(0.15, 0.4, 0.15); // Soccer field green
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Add physics to ground
    new PhysicsAggregate(
      ground,
      PhysicsShapeType.BOX,
      {
        mass: 0, // Static object
        friction: 0.8,
        restitution: 0.3,
      },
      this.scene
    );

    // Create field lines
    this.createFieldLines();

    // Create arena walls
    this.createArenaWalls();

    // Create the ball
    this.createBall();

    // Create test car placeholder (for camera target)
    this.createTestCar();
  }

  private createFieldLines(): void {
    // Center circle
    const centerCircle = MeshBuilder.CreateTorus(
      'centerCircle',
      {
        diameter: 20,
        thickness: 0.15,
        tessellation: 64,
      },
      this.scene
    );
    centerCircle.position.y = 0.01;
    centerCircle.rotation.x = Math.PI / 2;

    const lineMaterial = new StandardMaterial('lineMaterial', this.scene);
    lineMaterial.diffuseColor = Color3.White();
    lineMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
    centerCircle.material = lineMaterial;

    // Center line
    const centerLine = MeshBuilder.CreateBox(
      'centerLine',
      {
        width: GAME_CONFIG.ARENA.WIDTH,
        height: 0.02,
        depth: 0.2,
      },
      this.scene
    );
    centerLine.position.y = 0.01;
    centerLine.material = lineMaterial;

    // Goal boxes (simplified)
    const goalBoxWidth = 20;
    const goalBoxDepth = 10;

    // Blue goal box
    this.createGoalBox(-GAME_CONFIG.ARENA.LENGTH / 2 + goalBoxDepth / 2, goalBoxWidth, goalBoxDepth, lineMaterial);

    // Orange goal box
    this.createGoalBox(GAME_CONFIG.ARENA.LENGTH / 2 - goalBoxDepth / 2, goalBoxWidth, goalBoxDepth, lineMaterial);
  }

  private createGoalBox(z: number, width: number, depth: number, material: StandardMaterial): void {
    // Front line
    const frontLine = MeshBuilder.CreateBox(
      `goalBoxFront_${z}`,
      { width, height: 0.02, depth: 0.2 },
      this.scene
    );
    frontLine.position = new Vector3(0, 0.01, z + (z < 0 ? depth / 2 : -depth / 2));
    frontLine.material = material;

    // Side lines
    [-1, 1].forEach((side) => {
      const sideLine = MeshBuilder.CreateBox(
        `goalBoxSide_${z}_${side}`,
        { width: 0.2, height: 0.02, depth },
        this.scene
      );
      sideLine.position = new Vector3((side * width) / 2, 0.01, z);
      sideLine.material = material;
    });
  }

  private createArenaWalls(): void {
    const wallHeight = GAME_CONFIG.ARENA.WALL_HEIGHT;
    const wallThickness = 1;

    const wallMaterial = new StandardMaterial('wallMaterial', this.scene);
    wallMaterial.diffuseColor = new Color3(0.3, 0.3, 0.35);
    wallMaterial.specularColor = new Color3(0.5, 0.5, 0.5);

    // Side walls (along the length)
    [-1, 1].forEach((side) => {
      const wall = MeshBuilder.CreateBox(
        `sideWall_${side}`,
        {
          width: wallThickness,
          height: wallHeight,
          depth: GAME_CONFIG.ARENA.LENGTH,
        },
        this.scene
      );
      wall.position = new Vector3(
        (side * (GAME_CONFIG.ARENA.WIDTH + wallThickness)) / 2,
        wallHeight / 2,
        0
      );
      wall.material = wallMaterial;
      wall.receiveShadows = true;

      // Add physics
      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.3, restitution: 0.5 },
        this.scene
      );
    });

    // Back walls (with goal openings)
    [-1, 1].forEach((side) => {
      const goalWidth = GAME_CONFIG.ARENA.GOAL_WIDTH;
      const sideWidth = (GAME_CONFIG.ARENA.WIDTH - goalWidth) / 2;

      // Left section
      const leftWall = MeshBuilder.CreateBox(
        `backWall_${side}_left`,
        {
          width: sideWidth,
          height: wallHeight,
          depth: wallThickness,
        },
        this.scene
      );
      leftWall.position = new Vector3(
        -(goalWidth / 2 + sideWidth / 2),
        wallHeight / 2,
        (side * (GAME_CONFIG.ARENA.LENGTH + wallThickness)) / 2
      );
      leftWall.material = wallMaterial;

      new PhysicsAggregate(
        leftWall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.3, restitution: 0.5 },
        this.scene
      );

      // Right section
      const rightWall = MeshBuilder.CreateBox(
        `backWall_${side}_right`,
        {
          width: sideWidth,
          height: wallHeight,
          depth: wallThickness,
        },
        this.scene
      );
      rightWall.position = new Vector3(
        goalWidth / 2 + sideWidth / 2,
        wallHeight / 2,
        (side * (GAME_CONFIG.ARENA.LENGTH + wallThickness)) / 2
      );
      rightWall.material = wallMaterial;

      new PhysicsAggregate(
        rightWall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.3, restitution: 0.5 },
        this.scene
      );

      // Goal crossbar
      const crossbar = MeshBuilder.CreateBox(
        `crossbar_${side}`,
        {
          width: goalWidth,
          height: wallThickness / 2,
          depth: wallThickness,
        },
        this.scene
      );
      crossbar.position = new Vector3(
        0,
        GAME_CONFIG.ARENA.GOAL_HEIGHT,
        (side * (GAME_CONFIG.ARENA.LENGTH + wallThickness)) / 2
      );
      crossbar.material = wallMaterial;

      new PhysicsAggregate(
        crossbar,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.3, restitution: 0.5 },
        this.scene
      );
    });
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

  update(_deltaTime: number): void {
    // Physics is automatically stepped by Babylon's physics plugin
    // Additional game physics logic can go here

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
}
