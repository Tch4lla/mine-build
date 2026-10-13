/** First-person player using Rapier's kinematic character controller. */
import * as THREE from 'three';
import { RAPIER, GROUPS, type Physics } from '../physics/physicsWorld';
import type { Input } from '../engine/input';
import { WATER } from '../world/blocks';
import type { World } from '../world/world';

const HALF_HEIGHT = 0.6;
const RADIUS = 0.3;
export const PLAYER_HEIGHT = 2 * (HALF_HEIGHT + RADIUS);
const EYE = 1.62;

export class Player {
  readonly position = new THREE.Vector3(); // feet
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  flying = false;
  onGround = false;
  inWater = false;
  health = 20;
  readonly maxHealth = 20;
  creative = false;
  /** Set while sitting in a contraption seat. */
  seated: { worldPosition: () => THREE.Vector3; exit: () => void } | null = null;

  private readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private invulnerable = 0;
  private regenTimer = 0;
  private fallStartY: number | null = null;
  onDamage: (amount: number) => void = () => undefined;
  onDeath: () => void = () => undefined;

  constructor(
    physics: Physics,
    private readonly world: World,
  ) {
    const w = physics.world;
    this.body = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    this.collider = w.createCollider(
      RAPIER.ColliderDesc.capsule(HALF_HEIGHT, RADIUS).setCollisionGroups(GROUPS.player),
      this.body,
    );
    this.controller = w.createCharacterController(0.02);
    this.controller.enableAutostep(0.6, 0.2, false);
    this.controller.enableSnapToGround(0.3);
    this.controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(70);
  }

  teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.body.setTranslation({ x, y: y + HALF_HEIGHT + RADIUS, z }, true);
    this.body.setNextKinematicTranslation({ x, y: y + HALF_HEIGHT + RADIUS, z });
    this.fallStartY = null;
  }

  eye(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.position).add(new THREE.Vector3(0, EYE, 0));
  }

  look(target = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return target.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  applyLook(input: Input): void {
    this.yaw -= input.mouseDX * input.sensitivity;
    this.pitch -= input.mouseDY * input.sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  /** Called once per fixed physics step. */
  step(dt: number, input: Input): void {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.regenTimer += dt;
    if (this.regenTimer > 4 && this.health < this.maxHealth && this.health > 0) {
      this.health = Math.min(this.maxHealth, this.health + 1);
      this.regenTimer = 0;
    }

    if (this.seated) {
      const p = this.seated.worldPosition();
      this.position.set(p.x, p.y - EYE + 0.95, p.z);
      this.body.setNextKinematicTranslation({ x: p.x, y: this.position.y + HALF_HEIGHT + RADIUS, z: p.z });
      this.velocity.set(0, 0, 0);
      this.fallStartY = null;
      return;
    }

    if (input.doubleTapSpace && this.creative) this.flying = !this.flying;
    if (!this.creative) this.flying = false;

    const head = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 1.2),
      Math.floor(this.position.z),
    );
    const feet = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.3),
      Math.floor(this.position.z),
    );
    this.inWater = head === WATER || feet === WATER;

    // Desired horizontal movement in the camera's yaw frame.
    const f = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const s = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const sprint = input.isDown('ControlLeft') ? 1 : 0;
    const speed = this.flying ? 11 + sprint * 8 : this.inWater ? 3 : 4.6 + sprint * 2.4;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let mx = -sin * f + cos * s;
    let mz = -cos * f - sin * s;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = (mx / len) * speed;
      mz = (mz / len) * speed;
    }
    // Smoothly approach the target horizontal velocity (keeps knockback readable).
    const accel = this.onGround || this.flying ? 14 : 4;
    const k = Math.min(1, accel * dt);
    this.velocity.x += (mx - this.velocity.x) * k;
    this.velocity.z += (mz - this.velocity.z) * k;

    if (this.flying) {
      const up = (input.isDown('Space') ? 1 : 0) - (input.isDown('ShiftLeft') ? 1 : 0);
      this.velocity.y += (up * speed - this.velocity.y) * Math.min(1, 10 * dt);
    } else if (this.inWater) {
      this.velocity.y += -9 * dt;
      if (input.isDown('Space')) this.velocity.y = Math.min(this.velocity.y + 30 * dt, 3.5);
      this.velocity.y = Math.max(this.velocity.y, -3);
    } else {
      this.velocity.y -= 28 * dt;
      if (this.onGround && input.isDown('Space') && this.velocity.y <= 0.5) this.velocity.y = 8.6;
      this.velocity.y = Math.max(this.velocity.y, -60);
    }

    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
    this.controller.computeColliderMovement(this.collider, desired, undefined, GROUPS.player);
    const m = this.controller.computedMovement();
    const wasGround = this.onGround;
    this.onGround = this.controller.computedGrounded();
    const t = this.body.translation();
    const next = { x: t.x + m.x, y: t.y + m.y, z: t.z + m.z };
    // Keep the player out of the void.
    if (next.y < -20) {
      next.y = this.world.surfaceY(Math.floor(next.x), Math.floor(next.z)) + 2 + HALF_HEIGHT + RADIUS;
      this.velocity.set(0, 0, 0);
    }
    this.body.setNextKinematicTranslation(next);
    this.position.set(next.x, next.y - HALF_HEIGHT - RADIUS, next.z);

    if (dt > 0 && Math.abs(m.y - desired.y) > 1e-4 && desired.y > 0) this.velocity.y = 0; // bumped head
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;

    // Fall damage.
    if (!this.onGround && !this.flying && !this.inWater) {
      if (this.fallStartY === null || this.position.y > this.fallStartY) this.fallStartY = this.position.y;
    } else {
      if (!wasGround && this.fallStartY !== null && !this.creative) {
        const fell = this.fallStartY - this.position.y;
        if (fell > 4) this.damage(Math.floor(fell - 3));
      }
      this.fallStartY = null;
    }
  }

  /** Adds an impulse-like velocity change (knockback, shield jumps...). */
  launch(v: THREE.Vector3): void {
    this.velocity.add(v);
    this.onGround = false;
    if (v.y > 0) this.fallStartY = null;
  }

  damage(amount: number, knockback?: THREE.Vector3): void {
    if (this.creative || this.invulnerable > 0 || this.health <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.6;
    this.regenTimer = 0;
    if (knockback) this.launch(knockback);
    this.onDamage(amount);
    if (this.health <= 0) this.onDeath();
  }

  /** Axis-aligned bounds (for preventing block placement inside the player). */
  intersectsBlock(x: number, y: number, z: number): boolean {
    if (this.seated) return false;
    const p = this.position;
    return (
      x + 1 > p.x - RADIUS &&
      x < p.x + RADIUS &&
      z + 1 > p.z - RADIUS &&
      z < p.z + RADIUS &&
      y + 1 > p.y &&
      y < p.y + PLAYER_HEIGHT
    );
  }

  setColliderEnabled(on: boolean): void {
    this.collider.setEnabled(on);
  }
}
