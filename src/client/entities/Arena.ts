import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Texture,
  DynamicTexture,
} from '@babylonjs/core';
import { GAME_CONFIG } from '../../shared/constants';

export class Arena {
  private scene: Scene;

  // Arena meshes
  private floor: Mesh | null = null;
  private walls: Mesh[] = [];
  private goals: { blue: Mesh[]; orange: Mesh[] } = { blue: [], orange: [] };

  // Materials
  private floorMaterial: StandardMaterial | null = null;
  private wallMaterial: StandardMaterial | null = null;
  private goalFrameMaterial: StandardMaterial | null = null;
  private goalNetMaterial: StandardMaterial | null = null;
  private blueGoalMaterial: StandardMaterial | null = null;
  private orangeGoalMaterial: StandardMaterial | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  create(): void {
    this.createMaterials();
    this.createFloor();
    this.createFieldMarkings();
    this.createWallsWithCurvedCorners();
    this.createGoals();
  }

  private createMaterials(): void {
    // Floor material with grass texture
    this.floorMaterial = new StandardMaterial('floorMaterial', this.scene);
    this.floorMaterial.diffuseColor = new Color3(0.1, 0.35, 0.1);
    this.floorMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    this.floorMaterial.specularPower = 8;

    // Create a procedural grass texture
    const grassTexture = this.createGrassTexture();
    this.floorMaterial.diffuseTexture = grassTexture;

    // Wall material
    this.wallMaterial = new StandardMaterial('wallMaterial', this.scene);
    this.wallMaterial.diffuseColor = new Color3(0.25, 0.25, 0.3);
    this.wallMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
    this.wallMaterial.specularPower = 32;

    // Goal frame material
    this.goalFrameMaterial = new StandardMaterial('goalFrameMaterial', this.scene);
    this.goalFrameMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7);
    this.goalFrameMaterial.specularColor = new Color3(0.8, 0.8, 0.8);
    this.goalFrameMaterial.specularPower = 64;

    // Goal net material (semi-transparent)
    this.goalNetMaterial = new StandardMaterial('goalNetMaterial', this.scene);
    this.goalNetMaterial.diffuseColor = new Color3(0.9, 0.9, 0.9);
    this.goalNetMaterial.alpha = 0.3;

    // Blue goal accent
    this.blueGoalMaterial = new StandardMaterial('blueGoalMaterial', this.scene);
    this.blueGoalMaterial.diffuseColor = new Color3(0.1, 0.3, 0.8);
    this.blueGoalMaterial.emissiveColor = new Color3(0.05, 0.15, 0.4);

    // Orange goal accent
    this.orangeGoalMaterial = new StandardMaterial('orangeGoalMaterial', this.scene);
    this.orangeGoalMaterial.diffuseColor = new Color3(1, 0.5, 0.1);
    this.orangeGoalMaterial.emissiveColor = new Color3(0.5, 0.25, 0.05);
  }

  private createGrassTexture(): Texture {
    // Create a dynamic texture for the grass field
    const textureResolution = 1024;
    const dynamicTexture = new DynamicTexture(
      'grassTexture',
      textureResolution,
      this.scene,
      false
    );
    const ctx = dynamicTexture.getContext();

    // Base green
    ctx.fillStyle = '#1a5a1a';
    ctx.fillRect(0, 0, textureResolution, textureResolution);

    // Add grass pattern stripes (like real soccer fields)
    const stripeWidth = textureResolution / 16;
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#1f6b1f';
      } else {
        ctx.fillStyle = '#185518';
      }
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, textureResolution);
    }

    // Add some noise/variation
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * textureResolution;
      const y = Math.random() * textureResolution;
      const brightness = Math.random() * 30 - 15;
      const green = 90 + brightness;
      ctx.fillStyle = `rgb(20, ${green}, 20)`;
      ctx.fillRect(x, y, 2, 2);
    }

    dynamicTexture.update();

    // Set texture scaling
    dynamicTexture.uScale = 4;
    dynamicTexture.vScale = 4;

    return dynamicTexture;
  }

  private createFloor(): void {
    const { LENGTH, WIDTH } = GAME_CONFIG.ARENA;

    // Create the main floor (physics handled by PhysicsSystem with Cannon-ES)
    this.floor = MeshBuilder.CreateGround(
      'arenaFloor',
      {
        width: WIDTH,
        height: LENGTH,
        subdivisions: 4,
      },
      this.scene
    );

    this.floor.material = this.floorMaterial;
    this.floor.receiveShadows = true;
  }

  private createFieldMarkings(): void {
    const { LENGTH, WIDTH } = GAME_CONFIG.ARENA;

    const lineMaterial = new StandardMaterial('lineMaterial', this.scene);
    lineMaterial.diffuseColor = Color3.White();
    lineMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);

    // Center circle
    const centerCircle = MeshBuilder.CreateTorus(
      'centerCircle',
      {
        diameter: 18,
        thickness: 0.2,
        tessellation: 64,
      },
      this.scene
    );
    centerCircle.position.y = 0.02;
    centerCircle.rotation.x = Math.PI / 2;
    centerCircle.material = lineMaterial;

    // Center dot
    const centerDot = MeshBuilder.CreateCylinder(
      'centerDot',
      {
        diameter: 1,
        height: 0.02,
      },
      this.scene
    );
    centerDot.position.y = 0.02;
    centerDot.material = lineMaterial;

    // Center line
    const centerLine = MeshBuilder.CreateBox(
      'centerLine',
      {
        width: WIDTH - 1,
        height: 0.03,
        depth: 0.25,
      },
      this.scene
    );
    centerLine.position.y = 0.02;
    centerLine.material = lineMaterial;

    // Goal boxes
    const goalBoxWidth = 24;
    const goalBoxDepth = 12;

    this.createGoalBox(-LENGTH / 2 + goalBoxDepth / 2, goalBoxWidth, goalBoxDepth, lineMaterial);
    this.createGoalBox(LENGTH / 2 - goalBoxDepth / 2, goalBoxWidth, goalBoxDepth, lineMaterial);

    // Penalty arcs (semi-circles at goal boxes)
    this.createPenaltyArc(-LENGTH / 2 + goalBoxDepth, lineMaterial);
    this.createPenaltyArc(LENGTH / 2 - goalBoxDepth, lineMaterial);

    // Goal line accent strips (colored strips indicating team)
    this.createGoalLineAccent(-LENGTH / 2, this.blueGoalMaterial!);
    this.createGoalLineAccent(LENGTH / 2, this.orangeGoalMaterial!);
  }

  private createGoalBox(
    z: number,
    width: number,
    depth: number,
    material: StandardMaterial
  ): void {
    const lineThickness = 0.25;
    const lineHeight = 0.03;

    // Front line
    const frontLine = MeshBuilder.CreateBox(
      `goalBoxFront_${z}`,
      { width, height: lineHeight, depth: lineThickness },
      this.scene
    );
    frontLine.position = new Vector3(0, 0.02, z + (z < 0 ? depth / 2 : -depth / 2));
    frontLine.material = material;

    // Side lines
    [-1, 1].forEach((side) => {
      const sideLine = MeshBuilder.CreateBox(
        `goalBoxSide_${z}_${side}`,
        { width: lineThickness, height: lineHeight, depth },
        this.scene
      );
      sideLine.position = new Vector3((side * width) / 2, 0.02, z);
      sideLine.material = material;
    });
  }

  private createPenaltyArc(z: number, material: StandardMaterial): void {
    // Create a semi-circular arc using line segments
    const radius = 6;
    const segments = 16;
    const startAngle = z < 0 ? Math.PI : 0;

    for (let i = 0; i < segments; i++) {
      const angle1 = startAngle + (i * Math.PI) / segments;
      const angle2 = startAngle + ((i + 1) * Math.PI) / segments;

      const x1 = Math.cos(angle1) * radius;
      const z1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const z2 = Math.sin(angle2) * radius;

      const segment = MeshBuilder.CreateBox(
        `penaltyArcSeg_${z}_${i}`,
        {
          width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2)) + 0.1,
          height: 0.03,
          depth: 0.2,
        },
        this.scene
      );

      segment.position = new Vector3(
        (x1 + x2) / 2,
        0.02,
        z + (z1 + z2) / 2
      );
      segment.rotation.y = Math.atan2(z2 - z1, x2 - x1);
      segment.material = material;
    }
  }

  private createGoalLineAccent(z: number, material: StandardMaterial): void {
    const { GOAL_WIDTH } = GAME_CONFIG.ARENA;

    const accent = MeshBuilder.CreateBox(
      `goalAccent_${z}`,
      {
        width: GOAL_WIDTH + 2,
        height: 0.05,
        depth: 0.5,
      },
      this.scene
    );
    accent.position = new Vector3(0, 0.03, z + (z < 0 ? 0.5 : -0.5));
    accent.material = material;
  }

  private createWallsWithCurvedCorners(): void {
    const { LENGTH, WIDTH, WALL_HEIGHT, CORNER_RADIUS, GOAL_WIDTH } = GAME_CONFIG.ARENA;
    const wallThickness = 1;

    // Calculate dimensions accounting for corners
    const straightLengthX = WIDTH - 2 * CORNER_RADIUS;
    const straightLengthZ = LENGTH - 2 * CORNER_RADIUS;

    // Side walls (along Z axis, with gaps for corners)
    // Physics handled by PhysicsSystem with Cannon-ES
    [-1, 1].forEach((side) => {
      const wall = MeshBuilder.CreateBox(
        `sideWall_${side}`,
        {
          width: wallThickness,
          height: WALL_HEIGHT,
          depth: straightLengthZ,
        },
        this.scene
      );
      wall.position = new Vector3(
        (side * (WIDTH + wallThickness)) / 2,
        WALL_HEIGHT / 2,
        0
      );
      wall.material = this.wallMaterial;
      wall.receiveShadows = true;
      this.walls.push(wall);
    });

    // Back walls (along X axis, with goal openings and gaps for corners)
    [-1, 1].forEach((side) => {
      const sideWidth = (straightLengthX - GOAL_WIDTH) / 2;

      // Left section
      const leftWall = MeshBuilder.CreateBox(
        `backWall_${side}_left`,
        {
          width: sideWidth,
          height: WALL_HEIGHT,
          depth: wallThickness,
        },
        this.scene
      );
      leftWall.position = new Vector3(
        -(GOAL_WIDTH / 2 + sideWidth / 2),
        WALL_HEIGHT / 2,
        (side * (LENGTH + wallThickness)) / 2
      );
      leftWall.material = this.wallMaterial;
      leftWall.receiveShadows = true;
      this.walls.push(leftWall);

      // Right section
      const rightWall = MeshBuilder.CreateBox(
        `backWall_${side}_right`,
        {
          width: sideWidth,
          height: WALL_HEIGHT,
          depth: wallThickness,
        },
        this.scene
      );
      rightWall.position = new Vector3(
        GOAL_WIDTH / 2 + sideWidth / 2,
        WALL_HEIGHT / 2,
        (side * (LENGTH + wallThickness)) / 2
      );
      rightWall.material = this.wallMaterial;
      rightWall.receiveShadows = true;
      this.walls.push(rightWall);
    });

    // Curved corners
    this.createCurvedCorners(CORNER_RADIUS, WALL_HEIGHT, wallThickness);
  }

  private createCurvedCorners(
    radius: number,
    height: number,
    thickness: number
  ): void {
    const { LENGTH, WIDTH } = GAME_CONFIG.ARENA;
    const segments = 8;

    // Corner positions (relative to arena center)
    const cornerPositions = [
      { x: WIDTH / 2 - radius, z: LENGTH / 2 - radius, startAngle: 0 },
      { x: -WIDTH / 2 + radius, z: LENGTH / 2 - radius, startAngle: Math.PI / 2 },
      { x: -WIDTH / 2 + radius, z: -LENGTH / 2 + radius, startAngle: Math.PI },
      { x: WIDTH / 2 - radius, z: -LENGTH / 2 + radius, startAngle: (3 * Math.PI) / 2 },
    ];

    cornerPositions.forEach((corner, cornerIndex) => {
      // Create curved wall segments for each corner
      // Physics handled by PhysicsSystem with Cannon-ES
      for (let i = 0; i < segments; i++) {
        const angle1 = corner.startAngle + (i * Math.PI) / (2 * segments);
        const angle2 = corner.startAngle + ((i + 1) * Math.PI) / (2 * segments);

        const midAngle = (angle1 + angle2) / 2;
        const segmentLength =
          (2 * radius * Math.sin(Math.PI / (4 * segments))) * 1.05;

        const segment = MeshBuilder.CreateBox(
          `corner_${cornerIndex}_${i}`,
          {
            width: segmentLength,
            height: height,
            depth: thickness,
          },
          this.scene
        );

        // Position at the midpoint of the arc segment
        const posX = corner.x + (radius + thickness / 2) * Math.cos(midAngle);
        const posZ = corner.z + (radius + thickness / 2) * Math.sin(midAngle);

        segment.position = new Vector3(posX, height / 2, posZ);
        segment.rotation.y = -midAngle + Math.PI / 2;
        segment.material = this.wallMaterial;
        segment.receiveShadows = true;
        this.walls.push(segment);
      }
    });
  }

  private createGoals(): void {
    const { LENGTH } = GAME_CONFIG.ARENA;

    // Blue goal (negative Z)
    this.createGoal(-LENGTH / 2, 'blue');

    // Orange goal (positive Z)
    this.createGoal(LENGTH / 2, 'orange');
  }

  private createGoal(zPosition: number, team: 'blue' | 'orange'): void {
    const { GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } = GAME_CONFIG.ARENA;
    const frameThickness = 0.3;
    const isBlue = team === 'blue';
    const direction = isBlue ? -1 : 1;

    const goalMeshes: Mesh[] = [];
    const teamMaterial = isBlue ? this.blueGoalMaterial : this.orangeGoalMaterial;

    // Goal posts (vertical) - physics handled by PhysicsSystem
    [-1, 1].forEach((side) => {
      const post = MeshBuilder.CreateCylinder(
        `goalPost_${team}_${side}`,
        {
          diameter: frameThickness,
          height: GOAL_HEIGHT,
        },
        this.scene
      );
      post.position = new Vector3(
        (side * GOAL_WIDTH) / 2,
        GOAL_HEIGHT / 2,
        zPosition + direction * frameThickness / 2
      );
      post.material = this.goalFrameMaterial;
      goalMeshes.push(post);
    });

    // Crossbar (horizontal)
    const crossbar = MeshBuilder.CreateCylinder(
      `goalCrossbar_${team}`,
      {
        diameter: frameThickness,
        height: GOAL_WIDTH,
      },
      this.scene
    );
    crossbar.position = new Vector3(
      0,
      GOAL_HEIGHT,
      zPosition + direction * frameThickness / 2
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.material = this.goalFrameMaterial;
    goalMeshes.push(crossbar);

    // Goal back wall
    const backWall = MeshBuilder.CreateBox(
      `goalBack_${team}`,
      {
        width: GOAL_WIDTH,
        height: GOAL_HEIGHT,
        depth: 0.2,
      },
      this.scene
    );
    backWall.position = new Vector3(
      0,
      GOAL_HEIGHT / 2,
      zPosition + direction * (GOAL_DEPTH + 0.1)
    );
    backWall.material = this.goalNetMaterial;
    goalMeshes.push(backWall);

    // Goal side walls (inside the goal)
    [-1, 1].forEach((side) => {
      const sideWall = MeshBuilder.CreateBox(
        `goalSide_${team}_${side}`,
        {
          width: 0.2,
          height: GOAL_HEIGHT,
          depth: GOAL_DEPTH,
        },
        this.scene
      );
      sideWall.position = new Vector3(
        (side * GOAL_WIDTH) / 2,
        GOAL_HEIGHT / 2,
        zPosition + direction * (GOAL_DEPTH / 2 + 0.1)
      );
      sideWall.material = this.goalNetMaterial;
      goalMeshes.push(sideWall);
    });

    // Goal roof
    const roof = MeshBuilder.CreateBox(
      `goalRoof_${team}`,
      {
        width: GOAL_WIDTH,
        height: 0.2,
        depth: GOAL_DEPTH,
      },
      this.scene
    );
    roof.position = new Vector3(
      0,
      GOAL_HEIGHT,
      zPosition + direction * (GOAL_DEPTH / 2 + 0.1)
    );
    roof.material = this.goalNetMaterial;
    goalMeshes.push(roof);

    // Goal floor (colored by team)
    const goalFloor = MeshBuilder.CreateBox(
      `goalFloor_${team}`,
      {
        width: GOAL_WIDTH,
        height: 0.05,
        depth: GOAL_DEPTH,
      },
      this.scene
    );
    goalFloor.position = new Vector3(
      0,
      0.025,
      zPosition + direction * (GOAL_DEPTH / 2 + 0.1)
    );
    goalFloor.material = teamMaterial;
    goalMeshes.push(goalFloor);

    // Goal line glow strip
    const goalLine = MeshBuilder.CreateBox(
      `goalLine_${team}`,
      {
        width: GOAL_WIDTH + 0.5,
        height: 0.1,
        depth: 0.3,
      },
      this.scene
    );
    goalLine.position = new Vector3(0, 0.05, zPosition);
    goalLine.material = teamMaterial;
    goalMeshes.push(goalLine);

    // Store goal meshes
    this.goals[team] = goalMeshes;
  }

  getFloor(): Mesh | null {
    return this.floor;
  }

  getWalls(): Mesh[] {
    return this.walls;
  }

  getGoals(): { blue: Mesh[]; orange: Mesh[] } {
    return this.goals;
  }

  dispose(): void {
    this.floor?.dispose();
    this.walls.forEach((wall) => wall.dispose());
    this.goals.blue.forEach((mesh) => mesh.dispose());
    this.goals.orange.forEach((mesh) => mesh.dispose());
  }
}
