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

export class PhysicsSystem {
  private scene: Scene;
  private world: CANNON.World | null = null;

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

    // Add physics ground plane
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({ mass: 0 });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world!.addBody(this.groundBody);

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
      this.addStaticBox(
        wallThickness / 2,
        wallHeight / 2,
        GAME_CONFIG.ARENA.LENGTH / 2,
        wall.position
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

      this.addStaticBox(
        sideWidth / 2,
        wallHeight / 2,
        wallThickness / 2,
        leftWall.position
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

      this.addStaticBox(
        sideWidth / 2,
        wallHeight / 2,
        wallThickness / 2,
        rightWall.position
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

      this.addStaticBox(
        goalWidth / 2,
        wallThickness / 4,
        wallThickness / 2,
        crossbar.position
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
}
