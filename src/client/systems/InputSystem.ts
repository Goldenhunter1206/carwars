import { Scene, KeyboardEventTypes } from '@babylonjs/core';
import { KEY_BINDINGS } from '../../shared/constants';
import type { PlayerInput } from '../../shared/types';

export class InputSystem {
  private scene: Scene;
  private keysDown: Set<string> = new Set();
  private inputSequence: number = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  initialize(): void {
    // Keyboard input handling
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const code = kbInfo.event.code;

      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          this.keysDown.add(code);
          break;
        case KeyboardEventTypes.KEYUP:
          this.keysDown.delete(code);
          break;
      }
    });

    // Prevent default for game keys
    window.addEventListener('keydown', (e) => {
      const gameKeys: string[] = [
        ...KEY_BINDINGS.ACCELERATE,
        ...KEY_BINDINGS.BRAKE,
        ...KEY_BINDINGS.STEER_LEFT,
        ...KEY_BINDINGS.STEER_RIGHT,
        ...KEY_BINDINGS.JUMP,
        ...KEY_BINDINGS.BOOST,
        ...KEY_BINDINGS.BALL_CAM,
      ];

      if (gameKeys.includes(e.code)) {
        e.preventDefault();
      }
    });

    console.log('Input system initialized');
  }

  private isKeyDown(keys: readonly string[]): boolean {
    return keys.some((key) => this.keysDown.has(key));
  }

  getInput(): PlayerInput {
    // Calculate throttle (-1 to 1)
    let throttle = 0;
    if (this.isKeyDown(KEY_BINDINGS.ACCELERATE)) throttle += 1;
    if (this.isKeyDown(KEY_BINDINGS.BRAKE)) throttle -= 1;

    // Calculate steering (-1 to 1)
    let steer = 0;
    if (this.isKeyDown(KEY_BINDINGS.STEER_LEFT)) steer -= 1;
    if (this.isKeyDown(KEY_BINDINGS.STEER_RIGHT)) steer += 1;

    return {
      throttle,
      steer,
      jump: this.isKeyDown(KEY_BINDINGS.JUMP),
      boost: this.isKeyDown(KEY_BINDINGS.BOOST),
      airRollLeft: this.isKeyDown(KEY_BINDINGS.AIR_ROLL_LEFT),
      airRollRight: this.isKeyDown(KEY_BINDINGS.AIR_ROLL_RIGHT),
      timestamp: performance.now(),
      sequence: this.inputSequence++,
    };
  }

  isKeyPressed(keys: readonly string[]): boolean {
    return this.isKeyDown(keys);
  }

  isBallCamPressed(): boolean {
    return this.isKeyDown(KEY_BINDINGS.BALL_CAM);
  }

  isCameraTogglePressed(): boolean {
    return this.isKeyDown(KEY_BINDINGS.CAMERA_TOGGLE);
  }

  isPausePressed(): boolean {
    return this.isKeyDown(KEY_BINDINGS.PAUSE);
  }

  dispose(): void {
    this.keysDown.clear();
  }
}
