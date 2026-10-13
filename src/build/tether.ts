/**
 * Tether: grab a build, float it in front of you, rotate it, and join it to others.
 */
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type Physics } from '../physics/physicsWorld';
import type { Contraption, ContraptionManager, PartInstance } from './contraptions';

export interface FuseCandidate {
  target: Contraption;
  /** World-space closest points on the held and target shapes. */
  heldPoint: THREE.Vector3;
  targetPoint: THREE.Vector3;
  distance: number;
}

const SNAP_DISTANCE = 0.45;
const HELD_TINT = new THREE.Color(0x2a6cff);
const TARGET_TINT = new THREE.Color(0x22ff66);

export class Tether {
  held: {
    c: Contraption;
    p: PartInstance;
    distance: number;
    localGrab: THREE.Vector3;
    targetQuat: THREE.Quaternion;
  } | null = null;
  candidate: FuseCandidate | null = null;
  private lastYaw = 0;
  readonly line: THREE.Line;
  readonly beam: THREE.Line;

  constructor(
    private readonly physics: Physics,
    private readonly contraptions: ContraptionManager,
  ) {
    const mk = (color: number) => {
      const g = new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
      );
      const l = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }),
      );
      l.renderOrder = 10;
      l.visible = false;
      l.frustumCulled = false;
      return l;
    };
    this.line = mk(0x22ff66);
    this.beam = mk(0x7ab8ff);
  }

  /** Ray-casts for a part under the crosshair. */
  pick(
    eye: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
  ): { c: Contraption; p: PartInstance; toi: number } | null {
    const ray = new RAPIER.Ray(eye, dir);
    const hit = this.physics.world.castRay(ray, maxDist, true, undefined, groups(0xffff, GROUP.PART));
    if (!hit) return null;
    const found = this.contraptions.find(hit.collider);
    return found ? { ...found, toi: hit.timeOfImpact } : null;
  }

  grab(c: Contraption, p: PartInstance, hitPoint: THREE.Vector3, distance: number, yaw: number): void {
    this.release();
    const localGrab = hitPoint.clone().sub(c.position).applyQuaternion(c.rotation.invert());
    this.held = { c, p, distance: Math.max(1.5, Math.min(10, distance)), localGrab, targetQuat: c.rotation };
    this.lastYaw = yaw;
    c.body.setGravityScale(0, true);
    c.body.setAngularDamping(4);
    c.body.wakeUp();
    this.tint(c, HELD_TINT, 0.35);
  }

  release(): void {
    if (!this.held) return;
    const c = this.held.c;
    if (this.contraptions.list.includes(c)) {
      c.body.setGravityScale(1, true);
      c.body.setAngularDamping(0.4);
      // Don't fling things when letting go.
      const v = c.body.linvel();
      c.body.setLinvel({ x: v.x * 0.3, y: Math.min(v.y * 0.3, 2), z: v.z * 0.3 }, true);
      this.tint(c, null, 0);
    }
    this.clearCandidate();
    this.held = null;
    this.line.visible = false;
    this.beam.visible = false;
  }

  /** Rotate the held object 45° around the world up axis (yaw) or the camera's right axis (pitch). */
  rotate(kind: 'yaw' | 'pitch' | 'roll', look: THREE.Vector3, sign = 1): void {
    if (!this.held) return;
    let axis: THREE.Vector3;
    if (kind === 'yaw') axis = new THREE.Vector3(0, 1, 0);
    else if (kind === 'pitch')
      axis = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0)).normalize();
    else axis = new THREE.Vector3(look.x, 0, look.z).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(axis, (sign * Math.PI) / 4);
    this.held.targetQuat.premultiply(q);
  }

  changeDistance(delta: number): void {
    if (this.held) this.held.distance = Math.max(1.5, Math.min(12, this.held.distance + delta));
  }

  update(eye: THREE.Vector3, look: THREE.Vector3, yaw: number): void {
    const h = this.held;
    if (!h) return;
    if (!this.contraptions.list.includes(h.c)) {
      this.held = null;
      this.clearCandidate();
      this.line.visible = false;
      this.beam.visible = false;
      return;
    }
    // Held objects turn with the player.
    const dYaw = yaw - this.lastYaw;
    this.lastYaw = yaw;
    if (dYaw !== 0)
      h.targetQuat.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dYaw));

    const body = h.c.body;
    const target = eye.clone().addScaledVector(look, h.distance);
    const grabWorld = h.localGrab.clone().applyQuaternion(h.c.rotation).add(h.c.position);
    const v = target.sub(grabWorld).multiplyScalar(12);
    if (v.length() > 25) v.setLength(25);
    body.setLinvel(v, true);

    const err = h.targetQuat.clone().multiply(h.c.rotation.invert());
    if (err.w < 0) err.set(-err.x, -err.y, -err.z, -err.w);
    const angle = 2 * Math.acos(Math.min(1, err.w));
    const s = Math.sqrt(1 - err.w * err.w);
    const w =
      s < 1e-4
        ? new THREE.Vector3()
        : new THREE.Vector3(err.x / s, err.y / s, err.z / s).multiplyScalar(angle * 10);
    body.setAngvel(w, true);

    this.findCandidate();

    // Beam from the player's hand to the grab point.
    const bp = this.beam.geometry.getAttribute('position') as THREE.BufferAttribute;
    const hand = eye
      .clone()
      .add(new THREE.Vector3(0, -0.3, 0))
      .addScaledVector(look, 0.4);
    bp.setXYZ(0, hand.x, hand.y, hand.z);
    bp.setXYZ(1, grabWorld.x, grabWorld.y, grabWorld.z);
    bp.needsUpdate = true;
    this.beam.visible = true;
  }

  private findCandidate(): void {
    const h = this.held!;
    let best: FuseCandidate | null = null;
    const heldPos = h.c.position;
    const heldRadius = h.c.parts.reduce((m, p) => Math.max(m, p.pos.length() + 1.2), 0);
    for (const other of this.contraptions.list) {
      if (other === h.c) continue;
      const otherRadius = other.parts.reduce((m, p) => Math.max(m, p.pos.length() + 1.2), 0);
      if (other.position.distanceTo(heldPos) > heldRadius + otherRadius + SNAP_DISTANCE) continue;
      for (const hp of h.c.parts) {
        for (const op of other.parts) {
          const contact = hp.collider.contactCollider(op.collider, SNAP_DISTANCE);
          if (contact && (!best || contact.distance < best.distance)) {
            best = {
              target: other,
              heldPoint: new THREE.Vector3(contact.point1.x, contact.point1.y, contact.point1.z),
              targetPoint: new THREE.Vector3(contact.point2.x, contact.point2.y, contact.point2.z),
              distance: contact.distance,
            };
          }
        }
      }
    }
    if (best?.target !== this.candidate?.target) {
      this.clearCandidate();
      if (best) this.tint(best.target, TARGET_TINT, 0.3);
    }
    this.candidate = best;
    if (best) {
      const pos = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, best.heldPoint.x, best.heldPoint.y, best.heldPoint.z);
      pos.setXYZ(1, best.targetPoint.x, best.targetPoint.y, best.targetPoint.z);
      pos.needsUpdate = true;
      this.line.visible = true;
    } else this.line.visible = false;
  }

  private clearCandidate(): void {
    if (this.candidate && this.contraptions.list.includes(this.candidate.target))
      this.tint(this.candidate.target, null, 0);
    this.candidate = null;
  }

  /** Glue the held contraption onto the highlighted one. Returns the merged contraption. */
  join(): Contraption | null {
    const h = this.held;
    const cand = this.candidate;
    if (!h || !cand) return null;
    // Close the gap so the shapes touch before welding.
    if (cand.distance > 0) {
      const shift = cand.targetPoint.clone().sub(cand.heldPoint);
      const t = h.c.body.translation();
      h.c.body.setTranslation({ x: t.x + shift.x, y: t.y + shift.y, z: t.z + shift.z }, true);
    }
    const src = h.c;
    const dst = cand.target;
    this.release();
    // Keep the bigger body as the base so large builds don't jump around.
    const [from, into] = src.parts.length > dst.parts.length ? [dst, src] : [src, dst];
    const merged = this.contraptions.merge(from, into);
    merged.body.setGravityScale(1, true);
    return merged;
  }

  /** Split the grabbed part off its contraption and keep holding just that part. */
  detachHeld(): boolean {
    const h = this.held;
    if (!h || h.c.parts.length <= 1) return false;
    const old = h.c;
    const grabWorld = h.localGrab.clone().applyQuaternion(old.rotation).add(old.position);
    this.tint(old, null, 0);
    old.body.setGravityScale(1, true);
    old.body.setAngularDamping(0.4);
    const n = this.contraptions.detach(old, h.p);
    this.held = null;
    this.grab(n, n.parts[0], grabWorld, h.distance, this.lastYaw);
    return true;
  }

  private tint(c: Contraption, color: THREE.Color | null, amount: number): void {
    for (const p of c.parts) {
      p.mesh.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
        if (m && 'emissive' in m) {
          if (color) m.emissive.copy(color).multiplyScalar(amount);
          else m.emissive.setRGB(0, 0, 0);
        }
      });
    }
  }
}
