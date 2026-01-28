import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Mesh,
} from '@babylonjs/core';

export class CameraSystem {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private camera: ArcRotateCamera | null = null;

  // Camera settings
  private targetOffset = new Vector3(0, 1.5, 0);
  private cameraDistance = 8;
  private cameraHeight = 3;
  private smoothSpeed = 5;

  // Ball cam
  private ballCamEnabled = false;
  private ballMesh: Mesh | null = null;

  // Target tracking
  private currentTarget = Vector3.Zero();
  private targetMesh: Mesh | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
  }

  initialize(): void {
    // Create ArcRotateCamera for third-person view
    this.camera = new ArcRotateCamera(
      'mainCamera',
      Math.PI, // Alpha (horizontal rotation)
      Math.PI / 3, // Beta (vertical angle)
      this.cameraDistance,
      Vector3.Zero(),
      this.scene
    );

    // Camera settings
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 20;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;

    // Attach camera to canvas (for debug controls)
    this.camera.attachControl(this.canvas, true);

    // Set initial position looking at the field
    this.camera.setPosition(new Vector3(0, 15, 30));
    this.camera.setTarget(new Vector3(0, 0, 0));

    // Get reference to player car if it exists
    if (this.scene.metadata?.playerCar) {
      this.targetMesh = this.scene.metadata.playerCar;
    }

    // Find ball mesh
    this.ballMesh = this.scene.getMeshByName('ball') as Mesh;

    console.log('Camera system initialized');
  }

  update(deltaTime: number): void {
    if (!this.camera) return;

    // Get target position
    let targetPosition: Vector3;

    if (this.targetMesh) {
      targetPosition = this.targetMesh.position.add(this.targetOffset);
    } else {
      targetPosition = this.currentTarget;
    }

    // Smooth camera target movement
    this.currentTarget = Vector3.Lerp(
      this.currentTarget,
      targetPosition,
      this.smoothSpeed * deltaTime
    );

    // Update camera target
    if (this.ballCamEnabled && this.ballMesh) {
      // Ball cam mode - camera looks at ball
      const ballPos = this.ballMesh.position;
      const carPos = this.targetMesh?.position || Vector3.Zero();

      // Position camera behind car, looking at ball
      const toBall = ballPos.subtract(carPos).normalize();
      const cameraPos = carPos.subtract(toBall.scale(this.cameraDistance));
      cameraPos.y = carPos.y + this.cameraHeight;

      this.camera.setTarget(
        Vector3.Lerp(
          this.camera.target,
          ballPos,
          this.smoothSpeed * deltaTime
        )
      );
    } else {
      // Normal follow camera
      this.camera.setTarget(this.currentTarget);
    }
  }

  setTarget(mesh: Mesh): void {
    this.targetMesh = mesh;
  }

  setBallCam(enabled: boolean): void {
    this.ballCamEnabled = enabled;
  }

  toggleBallCam(): void {
    this.ballCamEnabled = !this.ballCamEnabled;
  }

  isBallCamEnabled(): boolean {
    return this.ballCamEnabled;
  }

  setCameraDistance(distance: number): void {
    this.cameraDistance = Math.max(3, Math.min(20, distance));
    if (this.camera) {
      this.camera.radius = this.cameraDistance;
    }
  }

  setCameraHeight(height: number): void {
    this.cameraHeight = Math.max(1, Math.min(10, height));
  }

  getCamera(): ArcRotateCamera | null {
    return this.camera;
  }

  // Shake effect for impacts
  shake(intensity: number = 0.5, duration: number = 0.2): void {
    if (!this.camera) return;

    const originalRadius = this.camera.radius;
    const startTime = performance.now();

    const shakeLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed < duration) {
        const decay = 1 - elapsed / duration;
        const offset = (Math.random() - 0.5) * intensity * decay;
        this.camera!.radius = originalRadius + offset;
        requestAnimationFrame(shakeLoop);
      } else {
        this.camera!.radius = originalRadius;
      }
    };

    shakeLoop();
  }
}
