import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  GlowLayer,
  Animation,
} from '@babylonjs/core';
import { GAME_CONFIG } from '../../shared/constants';

export type BoostPadType = 'small' | 'large';

export interface BoostPadConfig {
  position: Vector3;
  type: BoostPadType;
}

export class BoostPad {
  private scene: Scene;
  private mesh: Mesh | null = null;
  private glowMesh: Mesh | null = null;
  private type: BoostPadType;
  private position: Vector3;
  private isActive: boolean = true;
  private respawnTimer: number = 0;
  private material: StandardMaterial | null = null;
  private baseMaterial: StandardMaterial | null = null;

  // Constants based on type
  private readonly radius: number;
  private readonly boostAmount: number;
  private readonly respawnTime: number;

  constructor(scene: Scene, config: BoostPadConfig) {
    this.scene = scene;
    this.type = config.type;
    this.position = config.position;

    // Set properties based on type
    if (this.type === 'large') {
      this.radius = 1.5;
      this.boostAmount = GAME_CONFIG.BOOST_PAD.FULL_AMOUNT;
      this.respawnTime = GAME_CONFIG.BOOST_PAD.FULL_RESPAWN;
    } else {
      this.radius = 0.8;
      this.boostAmount = GAME_CONFIG.BOOST_PAD.SMALL_AMOUNT;
      this.respawnTime = GAME_CONFIG.BOOST_PAD.SMALL_RESPAWN;
    }

    this.create();
  }

  private create(): void {
    // Base pad (on the ground)
    const basePad = MeshBuilder.CreateCylinder(
      `boostPadBase_${this.position.x}_${this.position.z}`,
      {
        diameter: this.radius * 2 + 0.3,
        height: 0.05,
      },
      this.scene
    );
    basePad.position = new Vector3(this.position.x, 0.03, this.position.z);

    this.baseMaterial = new StandardMaterial(
      `boostPadBaseMat_${this.position.x}_${this.position.z}`,
      this.scene
    );
    this.baseMaterial.diffuseColor = new Color3(0.2, 0.2, 0.25);
    this.baseMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    basePad.material = this.baseMaterial;

    // Main glowing pad
    this.mesh = MeshBuilder.CreateCylinder(
      `boostPad_${this.position.x}_${this.position.z}`,
      {
        diameter: this.radius * 2,
        height: 0.15,
      },
      this.scene
    );
    this.mesh.position = new Vector3(this.position.x, 0.1, this.position.z);

    // Create material with glow
    this.material = new StandardMaterial(
      `boostPadMat_${this.position.x}_${this.position.z}`,
      this.scene
    );

    if (this.type === 'large') {
      // Large pads are golden/yellow
      this.material.diffuseColor = new Color3(1, 0.8, 0.2);
      this.material.emissiveColor = new Color3(0.8, 0.6, 0.1);
    } else {
      // Small pads are orange
      this.material.diffuseColor = new Color3(1, 0.5, 0.1);
      this.material.emissiveColor = new Color3(0.6, 0.3, 0.05);
    }

    this.mesh.material = this.material;

    // Floating icon for large pads
    if (this.type === 'large') {
      this.createFloatingOrb();
    }
  }

  private createFloatingOrb(): void {
    // Create a floating orb above large boost pads
    this.glowMesh = MeshBuilder.CreateSphere(
      `boostOrb_${this.position.x}_${this.position.z}`,
      {
        diameter: 0.8,
        segments: 16,
      },
      this.scene
    );
    this.glowMesh.position = new Vector3(this.position.x, 1.2, this.position.z);

    const orbMaterial = new StandardMaterial(
      `boostOrbMat_${this.position.x}_${this.position.z}`,
      this.scene
    );
    orbMaterial.diffuseColor = new Color3(1, 0.9, 0.3);
    orbMaterial.emissiveColor = new Color3(1, 0.8, 0.2);
    orbMaterial.alpha = 0.8;
    this.glowMesh.material = orbMaterial;

    // Add floating animation
    const floatAnimation = new Animation(
      'floatAnimation',
      'position.y',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      { frame: 0, value: 1.0 },
      { frame: 30, value: 1.4 },
      { frame: 60, value: 1.0 },
    ];
    floatAnimation.setKeys(keys);
    this.glowMesh.animations.push(floatAnimation);
    this.scene.beginAnimation(this.glowMesh, 0, 60, true);

    // Add rotation animation
    const rotateAnimation = new Animation(
      'rotateAnimation',
      'rotation.y',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const rotKeys = [
      { frame: 0, value: 0 },
      { frame: 120, value: Math.PI * 2 },
    ];
    rotateAnimation.setKeys(rotKeys);
    this.glowMesh.animations.push(rotateAnimation);
    this.scene.beginAnimation(this.glowMesh, 0, 120, true);
  }

  update(deltaTime: number): void {
    if (!this.isActive) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    }
  }

  collect(): number {
    if (!this.isActive) return 0;

    this.isActive = false;
    this.respawnTimer = this.respawnTime;

    // Hide the pad
    if (this.mesh) {
      this.mesh.isVisible = false;
    }
    if (this.glowMesh) {
      this.glowMesh.isVisible = false;
    }

    return this.boostAmount;
  }

  private respawn(): void {
    this.isActive = true;

    // Show the pad
    if (this.mesh) {
      this.mesh.isVisible = true;
    }
    if (this.glowMesh) {
      this.glowMesh.isVisible = true;
    }
  }

  isCollectable(): boolean {
    return this.isActive;
  }

  getPosition(): Vector3 {
    return this.position.clone();
  }

  getType(): BoostPadType {
    return this.type;
  }

  getRadius(): number {
    return this.radius;
  }

  getBoostAmount(): number {
    return this.boostAmount;
  }

  dispose(): void {
    this.mesh?.dispose();
    this.glowMesh?.dispose();
  }
}

// Boost pad positions based on Rocket League arena layout
// Scaled to our arena dimensions (100 x 70)
export function getBoostPadPositions(): BoostPadConfig[] {
  const { LENGTH, WIDTH } = GAME_CONFIG.ARENA;
  const halfLength = LENGTH / 2;
  const halfWidth = WIDTH / 2;

  const pads: BoostPadConfig[] = [];

  // === LARGE BOOST PADS (6 total) ===
  // Back corners (4 pads)
  const largeCornerX = halfWidth - 6;
  const largeCornerZ = halfLength - 10;

  pads.push(
    { position: new Vector3(-largeCornerX, 0, -largeCornerZ), type: 'large' },
    { position: new Vector3(largeCornerX, 0, -largeCornerZ), type: 'large' },
    { position: new Vector3(-largeCornerX, 0, largeCornerZ), type: 'large' },
    { position: new Vector3(largeCornerX, 0, largeCornerZ), type: 'large' }
  );

  // Mid-field sides (2 pads)
  const largeMidX = halfWidth - 5;
  pads.push(
    { position: new Vector3(-largeMidX, 0, 0), type: 'large' },
    { position: new Vector3(largeMidX, 0, 0), type: 'large' }
  );

  // === SMALL BOOST PADS (28 total) ===

  // Center line pads (6 pads)
  const smallCenterSpacing = 12;
  for (let i = -2; i <= 2; i++) {
    if (i !== 0) {
      pads.push({
        position: new Vector3(i * smallCenterSpacing, 0, 0),
        type: 'small',
      });
    }
  }
  // Center pad
  pads.push({ position: new Vector3(0, 0, 0), type: 'small' });

  // Goal area pads (4 pads per side = 8 total)
  const goalAreaZ = halfLength - 5;
  const goalAreaX = 10;
  pads.push(
    { position: new Vector3(-goalAreaX, 0, -goalAreaZ), type: 'small' },
    { position: new Vector3(goalAreaX, 0, -goalAreaZ), type: 'small' },
    { position: new Vector3(-goalAreaX, 0, goalAreaZ), type: 'small' },
    { position: new Vector3(goalAreaX, 0, goalAreaZ), type: 'small' }
  );

  // Inner goal area pads
  const innerGoalZ = halfLength - 15;
  pads.push(
    { position: new Vector3(-goalAreaX, 0, -innerGoalZ), type: 'small' },
    { position: new Vector3(goalAreaX, 0, -innerGoalZ), type: 'small' },
    { position: new Vector3(-goalAreaX, 0, innerGoalZ), type: 'small' },
    { position: new Vector3(goalAreaX, 0, innerGoalZ), type: 'small' }
  );

  // Mid-field arc pads (8 pads)
  const midArcZ = 18;
  const midArcX1 = 5;
  const midArcX2 = 20;
  pads.push(
    { position: new Vector3(-midArcX1, 0, -midArcZ), type: 'small' },
    { position: new Vector3(midArcX1, 0, -midArcZ), type: 'small' },
    { position: new Vector3(-midArcX2, 0, -midArcZ), type: 'small' },
    { position: new Vector3(midArcX2, 0, -midArcZ), type: 'small' },
    { position: new Vector3(-midArcX1, 0, midArcZ), type: 'small' },
    { position: new Vector3(midArcX1, 0, midArcZ), type: 'small' },
    { position: new Vector3(-midArcX2, 0, midArcZ), type: 'small' },
    { position: new Vector3(midArcX2, 0, midArcZ), type: 'small' }
  );

  // Side pads near walls (6 pads)
  const sideX = halfWidth - 12;
  const sideZ1 = 15;
  const sideZ2 = 30;
  pads.push(
    { position: new Vector3(-sideX, 0, -sideZ1), type: 'small' },
    { position: new Vector3(sideX, 0, -sideZ1), type: 'small' },
    { position: new Vector3(-sideX, 0, sideZ1), type: 'small' },
    { position: new Vector3(sideX, 0, sideZ1), type: 'small' },
    { position: new Vector3(-sideX, 0, -sideZ2), type: 'small' },
    { position: new Vector3(sideX, 0, sideZ2), type: 'small' }
  );

  return pads;
}

export class BoostPadManager {
  private scene: Scene;
  private boostPads: BoostPad[] = [];
  private glowLayer: GlowLayer | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  initialize(): void {
    // Create glow layer for boost pads
    this.glowLayer = new GlowLayer('boostGlow', this.scene);
    this.glowLayer.intensity = 0.5;

    // Create all boost pads
    const positions = getBoostPadPositions();
    positions.forEach((config) => {
      const pad = new BoostPad(this.scene, config);
      this.boostPads.push(pad);
    });

    console.log(`Created ${this.boostPads.length} boost pads`);
  }

  update(deltaTime: number): void {
    this.boostPads.forEach((pad) => pad.update(deltaTime));
  }

  checkCollection(position: Vector3, collectionRadius: number = 1.5): number {
    let totalBoost = 0;

    for (const pad of this.boostPads) {
      if (!pad.isCollectable()) continue;

      const padPos = pad.getPosition();
      const distance = Vector3.Distance(
        new Vector3(position.x, 0, position.z),
        new Vector3(padPos.x, 0, padPos.z)
      );

      if (distance < pad.getRadius() + collectionRadius) {
        totalBoost += pad.collect();
      }
    }

    return totalBoost;
  }

  getBoostPads(): BoostPad[] {
    return this.boostPads;
  }

  resetAll(): void {
    // Force respawn all pads
    this.boostPads.forEach((pad) => {
      if (!pad.isCollectable()) {
        // Access private method through any cast (not ideal, but works for reset)
        (pad as any).respawn();
      }
    });
  }

  dispose(): void {
    this.boostPads.forEach((pad) => pad.dispose());
    this.glowLayer?.dispose();
  }
}
