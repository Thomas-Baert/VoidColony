// ─── PlayerEntity — Pixel-space movement with tile collision ──────────────
//
// The player moves freely in world (screen) pixel space.
// Collision is resolved by converting the candidate position back to grid
// coordinates and checking against a Set of walkable tile keys.
//
// Architecture note: IPlayerEntity is the public contract.
// The concrete class uses AvatarRenderer for visual representation.
// ─────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { screenToGrid } from '../world/iso.utils';
import { AvatarRenderer } from './AvatarRenderer';

// ─── Direction enum (used to drive future animation frames) ──────────────
export enum Direction {
  NE   = 'NE',   // D key  — right on screen
  NW   = 'NW',   // Z key  — up-left on screen
  SE   = 'SE',   // S key  — down on screen
  SW   = 'SW',   // Q key  — left on screen
  IDLE = 'IDLE',
}

// ─── Contract ─────────────────────────────────────────────────────────────
export interface IPlayerEntity {
  /** Current world-pixel X position */
  readonly worldX: number;
  /** Current world-pixel Y position */
  readonly worldY: number;
  /** Facing direction (useful for sprite frames later) */
  readonly direction: Direction;

  /**
   * Advance the player by one frame.
   * @param dx  Raw horizontal screen-space direction (−1, 0, +1 or combination)
   * @param dy  Raw vertical screen-space direction
   * @param walkableSet  Set of "col,row" strings for tiles the player may occupy
   */
  update(dx: number, dy: number, walkableSet: Set<string>): void;

  /** Sync the visual representation to the internal world position */
  syncGraphics(targetElevation: number): void;

  destroy(): void;
}

// ─── Concrete implementation ──────────────────────────────────────────────
export class PlayerEntity implements IPlayerEntity {
  // ── Config ──────────────────────────────────────────────────────────────
  /** Pixels moved per frame (at 60 fps ≈ 150 px/s, ~0.4 s per tile) */
  private static readonly SPEED = 2.5;

  // ── State ────────────────────────────────────────────────────────────────
  private _worldX: number;
  private _worldY: number;
  private _direction: Direction = Direction.IDLE;
  
  public visualElevation: number = 0;
  private elevationTween: Phaser.Tweens.Tween | null = null;
  private elevationTarget: number = 0;
  private readonly scene: Phaser.Scene;

  // ── Rendering ────────────────────────────────────────────────────────────
  private readonly avatar: AvatarRenderer;

  // ─────────────────────────────────────────────────────────────────────────
  constructor(scene: Phaser.Scene, startX: number, startY: number) {
    this.scene = scene;
    this._worldX = startX;
    this._worldY = startY;

    this.avatar = new AvatarRenderer(scene, startX, startY);
  }

  // ── IPlayerEntity ─────────────────────────────────────────────────────────
  get worldX() { return this._worldX; }
  get worldY() { return this._worldY; }
  get direction() { return this._direction; }

  update(dx: number, dy: number, walkableSet: Set<string>): void {
    if (dx === 0 && dy === 0) {
      this._direction = Direction.IDLE;
      return;
    }

    const len = Math.hypot(dx, dy);
    const vx  = (dx / len) * PlayerEntity.SPEED;
    const vy  = (dy / len) * PlayerEntity.SPEED;

    this._direction = PlayerEntity.resolveDirection(dx, dy);

    if (this.tryMove(this._worldX + vx, this._worldY + vy, walkableSet)) return;
    if (this.tryMove(this._worldX + vx, this._worldY,      walkableSet)) return;
    this.tryMove(this._worldX,           this._worldY + vy, walkableSet);
  }

  syncGraphics(targetElevation: number): void {
    // If the target changed, restart the tween
    if (targetElevation !== this.elevationTarget) {
      if (this.elevationTween) {
        this.elevationTween.stop();
        this.elevationTween = null;
      }
      this.elevationTarget = targetElevation;

      this.elevationTween = this.scene.tweens.add({
        targets: this,
        visualElevation: targetElevation,
        duration: 150,
        ease: targetElevation > this.visualElevation ? 'Sine.easeOut' : 'Sine.easeIn',
        onComplete: () => {
          this.elevationTween = null;
          this.visualElevation = targetElevation;
        }
      });
    }

    // Apply the position to the avatar using the smoothly interpolated visual elevation
    this.avatar.setPosition(this._worldX, this._worldY, this.visualElevation);
  }

  setDepth(depth: number): void {
    this.avatar.setDepth(depth);
  }

  destroy(): void {
    if (this.elevationTween) this.elevationTween.stop();
    this.avatar.destroy();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private tryMove(nx: number, ny: number, walkableSet: Set<string>): boolean {
    const { col, row } = screenToGrid(nx, ny);
    if (!walkableSet.has(`${col},${row}`)) return false;
    this._worldX = nx;
    this._worldY = ny;
    return true;
  }

  private static resolveDirection(dx: number, dy: number): Direction {
    if (dx > 0 && dy <= 0) return Direction.NE;
    if (dx < 0 && dy <= 0) return Direction.NW;
    if (dx > 0 && dy > 0)  return Direction.SE;
    return Direction.SW;
  }
}
