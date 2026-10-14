/**
 * Contraptions: Tether builds. Each contraption is ONE Rapier rigid body holding a collider per
 * part (much more stable than chains of joints). Wheels are Rapier ray-cast vehicle wheels.
 */
import * as THREE from 'three';
import { RAPIER, GROUPS, type Physics } from '../physics/physicsWorld';
import { PARTS, type PartDef } from './parts';
import { uid } from '../engine/rng';
import { toonify } from '../view/toon';

export interface PartInstance {
  uid: string;
  def: PartDef;
  /** Transform relative to the contraption body. */
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  collider: RAPIER.Collider;
  mesh: THREE.Object3D;
  active: boolean;
  timer: number;
  light?: THREE.PointLight;
}

export class Contraption {
  readonly id = uid();
  readonly group = new THREE.Group();
  parts: PartInstance[] = [];
  vehicle: RAPIER.DynamicRayCastVehicleController | null = null;
  wheels: PartInstance[] = [];
  occupiedSeat: PartInstance | null = null;
  constructor(readonly body: RAPIER.RigidBody) {}

  worldTransformOf(p: PartInstance): { pos: THREE.Vector3; quat: THREE.Quaternion } {
    const t = this.body.translation();
    const r = this.body.rotation();
    const bq = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    return {
      pos: p.pos
        .clone()
        .applyQuaternion(bq)
        .add(new THREE.Vector3(t.x, t.y, t.z)),
      quat: bq.clone().multiply(p.quat),
    };
  }

  get position(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  get rotation(): THREE.Quaternion {
    const r = this.body.rotation();
    return new THREE.Quaternion(r.x, r.y, r.z, r.w);
  }
}

export interface SerializedPart {
  def: string;
  pos: number[];
  quat: number[];
  active: boolean;
}
export interface SerializedContraption {
  pos: number[];
  quat: number[];
  vel: number[];
  parts: SerializedPart[];
}

export interface DriveInput {
  throttle: number;
  steer: number;
  toggleDevices: boolean;
}

const Y_TO_X = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);
const WHEEL_RADIUS = 0.45;
const SUSPENSION_REST = 0.25;
export const MAX_PARTS = 160;
const MAX_CAR_SPEED = 9;

export class ContraptionManager {
  readonly group = new THREE.Group();
  readonly list: Contraption[] = [];
  private readonly byCollider = new Map<number, { c: Contraption; p: PartInstance }>();
  /** Called when a spring fires (so the game can launch a player standing on it). */
  onSpring: (pos: THREE.Vector3, up: THREE.Vector3) => void = () => undefined;
  maxLights = 6;

  constructor(private readonly physics: Physics) {
    this.group.name = 'contraptions';
  }

  get partCount(): number {
    return this.list.reduce((n, c) => n + c.parts.length, 0);
  }

  private createBody(pos: THREE.Vector3, quat: THREE.Quaternion): Contraption {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setLinearDamping(0.05)
      .setAngularDamping(0.4)
      .setCcdEnabled(true);
    const c = new Contraption(this.physics.world.createRigidBody(desc));
    this.list.push(c);
    this.group.add(c.group);
    return c;
  }

  private addPart(
    c: Contraption,
    def: PartDef,
    pos: THREE.Vector3,
    quat: THREE.Quaternion,
    active?: boolean,
  ): PartInstance {
    const s = def.shape;
    let desc: RAPIER.ColliderDesc;
    let shapeQuat = new THREE.Quaternion();
    if (s.type === 'box') desc = RAPIER.ColliderDesc.cuboid(s.hx, s.hy, s.hz);
    else if (s.type === 'ball') desc = RAPIER.ColliderDesc.ball(s.radius);
    else {
      desc = RAPIER.ColliderDesc.cylinder(s.halfHeight, s.radius);
      if (s.type === 'cylinderX') shapeQuat = Y_TO_X;
    }
    const q = quat.clone().multiply(shapeQuat);
    desc
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setMass(def.mass)
      .setFriction(def.friction)
      .setRestitution(def.restitution)
      .setCollisionGroups(GROUPS.part);
    const collider = this.physics.world.createCollider(desc, c.body);
    const mesh = def.buildMesh();
    // Give each part its own materials so highlights don't leak to other parts.
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = (m.material as THREE.Material).clone();
    });
    toonify(mesh);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    c.group.add(mesh);
    const p: PartInstance = {
      uid: uid(),
      def,
      pos: pos.clone(),
      quat: quat.clone(),
      collider,
      mesh,
      active: active ?? def.behavior === 'light',
      timer: 0,
    };
    if (def.behavior === 'light') {
      p.light = new THREE.PointLight(0xffe7a0, 0, 14, 1.5);
      mesh.add(p.light);
    }
    c.parts.push(p);
    this.byCollider.set(collider.handle, { c, p });
    return p;
  }

  private removePartInternal(c: Contraption, p: PartInstance): void {
    this.byCollider.delete(p.collider.handle);
    this.physics.world.removeCollider(p.collider, false);
    c.group.remove(p.mesh);
    c.parts = c.parts.filter((x) => x !== p);
    if (c.occupiedSeat === p) c.occupiedSeat = null;
  }

  private refresh(c: Contraption): void {
    this.rebuildVehicle(c);
    const balloons = c.parts.filter((p) => p.def.behavior === 'balloon').length;
    c.body.setLinearDamping(balloons > 0 ? 0.6 : 0.05);
    c.body.setAngularDamping(balloons > 0 ? 1.5 : 0.4);
    c.body.wakeUp();
  }

  spawn(defId: string, pos: THREE.Vector3, quat = new THREE.Quaternion()): Contraption {
    const def = PARTS[defId];
    if (!def) throw new Error(`Unknown part ${defId}`);
    const c = this.createBody(pos, quat);
    this.addPart(c, def, new THREE.Vector3(), new THREE.Quaternion());
    this.refresh(c);
    return c;
  }

  find(collider: RAPIER.Collider | number): { c: Contraption; p: PartInstance } | undefined {
    return this.byCollider.get(typeof collider === 'number' ? collider : collider.handle);
  }

  /** Moves every part of `src` into `dst`, keeping world transforms. `src` is destroyed. */
  merge(src: Contraption, dst: Contraption): Contraption {
    if (src === dst) return dst;
    const dstPos = dst.position;
    const dstInv = dst.rotation.invert();
    for (const p of [...src.parts]) {
      const w = src.worldTransformOf(p);
      const local = w.pos.sub(dstPos).applyQuaternion(dstInv);
      const lq = dstInv.clone().multiply(w.quat);
      this.removePartInternal(src, p);
      this.addPart(dst, p.def, local, lq, p.active).timer = p.timer;
    }
    this.destroy(src);
    this.refresh(dst);
    return dst;
  }

  /** Splits one part off into its own contraption (returns it). */
  detach(c: Contraption, p: PartInstance): Contraption {
    if (c.parts.length <= 1) return c;
    const w = c.worldTransformOf(p);
    const lv = c.body.linvel();
    this.removePartInternal(c, p);
    const n = this.createBody(w.pos, w.quat);
    this.addPart(n, p.def, new THREE.Vector3(), new THREE.Quaternion(), p.active);
    n.body.setLinvel(lv, true);
    this.refresh(c);
    this.refresh(n);
    return n;
  }

  /** Removes a part entirely (picked back up). */
  removePart(c: Contraption, p: PartInstance): void {
    this.removePartInternal(c, p);
    if (c.parts.length === 0) this.destroy(c);
    else this.refresh(c);
  }

  destroy(c: Contraption): void {
    for (const p of [...c.parts]) this.removePartInternal(c, p);
    if (c.vehicle) this.physics.world.removeVehicleController(c.vehicle);
    c.vehicle = null;
    this.physics.world.removeRigidBody(c.body);
    this.group.remove(c.group);
    const i = this.list.indexOf(c);
    if (i >= 0) this.list.splice(i, 1);
  }

  clear(): void {
    for (const c of [...this.list]) this.destroy(c);
  }

  private rebuildVehicle(c: Contraption): void {
    if (c.vehicle) this.physics.world.removeVehicleController(c.vehicle);
    c.vehicle = null;
    c.wheels = c.parts.filter((p) => p.def.behavior === 'wheel');
    if (c.wheels.length === 0 || c.parts.length === c.wheels.length) {
      // A lone wheel (or wheels only) just rolls around as a rigid body.
      c.wheels = [];
      return;
    }
    const vc = this.physics.world.createVehicleController(c.body);
    for (const w of c.wheels) {
      const axle = new THREE.Vector3(1, 0, 0).applyQuaternion(w.quat);
      axle.y = 0;
      if (axle.lengthSq() < 1e-4) axle.set(1, 0, 0);
      axle.normalize();
      const conn = w.pos.clone().addScaledVector(UP, SUSPENSION_REST);
      vc.addWheel(conn, { x: 0, y: -1, z: 0 }, axle, SUSPENSION_REST, WHEEL_RADIUS);
      const i = vc.numWheels() - 1;
      vc.setWheelSuspensionStiffness(i, 40);
      vc.setWheelSuspensionCompression(i, 2.5);
      vc.setWheelSuspensionRelaxation(i, 3.5);
      vc.setWheelMaxSuspensionTravel(i, 0.3);
      vc.setWheelFrictionSlip(i, 2.2);
      vc.setWheelSideFrictionStiffness(i, 1.2);
      vc.setWheelMaxSuspensionForce(i, 4000);
    }
    c.vehicle = vc;
  }

  /** Toggle a device (fan, rocket, spring, light). Returns true if something happened. */
  activate(c: Contraption, p: PartInstance): boolean {
    if (!p.def.activatable) return false;
    if (p.def.behavior === 'spring') {
      this.fireSpring(c, p);
      return true;
    }
    if (p.def.behavior === 'rocket') {
      if (p.active || p.timer < 0) return false;
      p.active = true;
      p.timer = 2.5;
      return true;
    }
    p.active = !p.active;
    c.body.wakeUp();
    return true;
  }

  private fireSpring(c: Contraption, p: PartInstance): void {
    const w = c.worldTransformOf(p);
    const up = UP.clone().applyQuaternion(w.quat);
    const mass = c.body.mass();
    c.body.applyImpulseAtPoint(up.clone().multiplyScalar(Math.min(60, 6 + mass * 1.2)), w.pos, true);
    p.timer = 0.3;
    this.onSpring(w.pos, up);
  }

  step(dt: number, drive: DriveInput | null, driven: Contraption | null): void {
    let lights = 0;
    for (const c of this.list) {
      const body = c.body;
      if (!body.isEnabled()) continue;
      const bt = body.translation();
      const br = body.rotation();
      const bq = new THREE.Quaternion(br.x, br.y, br.z, br.w);
      const bpos = new THREE.Vector3(bt.x, bt.y, bt.z);
      const isDriven = c === driven && drive !== null;

      if (isDriven && drive!.toggleDevices) {
        const devices = c.parts.filter((p) => p.def.behavior === 'fan' || p.def.behavior === 'rocket');
        const anyOn = devices.some((p) => p.active);
        for (const p of devices) {
          if (p.def.behavior === 'rocket') {
            if (!anyOn) this.activate(c, p);
          } else p.active = !anyOn;
        }
      }

      for (const p of c.parts) {
        const wq = bq.clone().multiply(p.quat);
        const wp = p.pos.clone().applyQuaternion(bq).add(bpos);
        const at = { x: wp.x, y: wp.y, z: wp.z };
        switch (p.def.behavior) {
          case 'fan':
            if (p.active) {
              const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(wq).multiplyScalar(120 * dt);
              body.applyImpulseAtPoint(dir, at, true);
            }
            break;
          case 'rocket':
            if (p.active) {
              const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(wq).multiplyScalar(420 * dt);
              body.applyImpulseAtPoint(dir, at, true);
              p.timer -= dt;
              if (p.timer <= 0) {
                p.active = false;
                p.timer = -1.5; // cooldown
              }
            } else if (p.timer < 0) p.timer = Math.min(0, p.timer + dt);
            break;
          case 'balloon':
            body.applyImpulseAtPoint({ x: 0, y: 9.81 * 7.5 * dt, z: 0 }, at, true);
            break;
          case 'spring':
            if (p.timer > 0) p.timer = Math.max(0, p.timer - dt);
            break;
          case 'light':
            if (p.light) {
              const on = p.active && lights < this.maxLights;
              p.light.intensity = on ? 6 : 0;
              if (on) lights++;
            }
            break;
          default:
            break;
        }
      }

      if (c.vehicle) {
        const vc = c.vehicle;
        const seat = c.occupiedSeat;
        const fwd = seat
          ? new THREE.Vector3(0, 0, -1).applyQuaternion(seat.quat)
          : new THREE.Vector3(0, 0, -1);
        const com = body.localCom();
        const comLocal = new THREE.Vector3(com.x, com.y, com.z);
        // Engine force fades out towards the top speed.
        const lv = body.linvel();
        const speed = Math.hypot(lv.x, lv.z);
        const power = THREE.MathUtils.clamp(1 - speed / MAX_CAR_SPEED, 0, 1);
        c.wheels.forEach((w, i) => {
          const axle = new THREE.Vector3(1, 0, 0).applyQuaternion(w.quat);
          const wheelFwd = new THREE.Vector3().crossVectors(UP, axle);
          const sign = Math.sign(wheelFwd.dot(fwd)) || 1;
          const throttle = isDriven ? drive!.throttle : 0;
          vc.setWheelEngineForce(i, throttle * 70 * sign * power);
          vc.setWheelBrake(i, isDriven && throttle === 0 ? 0.6 : 0.02);
          const front = w.pos.clone().sub(comLocal).dot(fwd) > 0.05;
          vc.setWheelSteering(i, isDriven && front ? -drive!.steer * 0.5 * sign : 0);
        });
        // Ignore this contraption's own colliders when ray-casting the wheels.
        vc.updateVehicle(dt, undefined, undefined, (col) => this.byCollider.get(col.handle)?.c !== c);
      } else if (isDriven && drive!.steer !== 0) {
        // No wheels: steer by yawing (works for fan boats / gliders).
        body.applyTorqueImpulse(
          { x: 0, y: -drive!.steer * 6 * dt * Math.max(1, body.mass() / 10), z: 0 },
          true,
        );
      }
    }
  }

  /** Copies physics transforms to meshes and animates parts. */
  sync(time: number): void {
    for (const c of this.list) {
      const t = c.body.translation();
      const r = c.body.rotation();
      c.group.position.set(t.x, t.y, t.z);
      c.group.quaternion.set(r.x, r.y, r.z, r.w);
      for (const p of c.parts) {
        if (p.def.behavior === 'fan') {
          const spin = p.mesh.getObjectByName('spin');
          if (spin && p.active) spin.rotation.z = time * 25;
        } else if (p.def.behavior === 'rocket') {
          const flame = p.mesh.getObjectByName('flame');
          if (flame) {
            flame.visible = p.active;
            flame.scale.y = 0.8 + Math.sin(time * 60) * 0.25;
          }
        } else if (p.def.behavior === 'spring') {
          const top = p.mesh.getObjectByName('top');
          if (top) top.position.y = 0.17 + p.timer * 0.6;
        }
      }
      if (c.vehicle) {
        c.wheels.forEach((w, i) => {
          const spin = w.mesh.getObjectByName('spin');
          if (spin) spin.rotation.x = c.vehicle!.wheelRotation(i) ?? 0;
          const steer = c.vehicle!.wheelSteering(i) ?? 0;
          w.mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(UP, steer).multiply(w.quat));
          const len = c.vehicle!.wheelSuspensionLength(i) ?? SUSPENSION_REST;
          w.mesh.position.copy(w.pos).addScaledVector(UP, SUSPENSION_REST - len);
        });
      }
    }
  }

  /** Pushes contraption bodies in a cone (wind gusts, explosions use radius instead). */
  impulseCone(origin: THREE.Vector3, dir: THREE.Vector3, range: number, strength: number): void {
    for (const c of this.list) {
      const to = c.position.sub(origin);
      const d = to.length();
      if (d > range || d < 1e-3) continue;
      if (to.clone().normalize().dot(dir) < 0.6) continue;
      const k = strength * (1 - d / range);
      c.body.applyImpulse(dir.clone().multiplyScalar(k * Math.max(1, c.body.mass() * 0.3)), true);
    }
  }

  impulseRadial(origin: THREE.Vector3, radius: number, strength: number): void {
    for (const c of this.list) {
      const to = c.position.sub(origin);
      const d = to.length();
      if (d > radius) continue;
      to.normalize()
        .add(new THREE.Vector3(0, 0.6, 0))
        .normalize();
      c.body.applyImpulse(
        to.multiplyScalar(strength * (1 - d / radius) * Math.max(1, c.body.mass() * 0.3)),
        true,
      );
    }
  }

  /** Disables bodies far from the player so they don't fall through unloaded terrain. */
  updateActivity(center: THREE.Vector3, radius: number): void {
    for (const c of this.list) {
      const near = c.position.distanceTo(center) < radius;
      if (near !== c.body.isEnabled()) c.body.setEnabled(near);
    }
  }

  serialize(): SerializedContraption[] {
    return this.list.map((c) => {
      const t = c.body.translation();
      const r = c.body.rotation();
      const v = c.body.linvel();
      return {
        pos: [t.x, t.y, t.z],
        quat: [r.x, r.y, r.z, r.w],
        vel: [v.x, v.y, v.z],
        parts: c.parts.map((p) => ({
          def: p.def.id,
          pos: p.pos.toArray(),
          quat: p.quat.toArray(),
          active: p.active,
        })),
      };
    });
  }

  load(data: SerializedContraption[]): void {
    this.clear();
    for (const s of data) {
      const parts = s.parts.filter((p) => PARTS[p.def]);
      if (parts.length === 0) continue;
      const c = this.createBody(
        new THREE.Vector3().fromArray(s.pos),
        new THREE.Quaternion().fromArray(s.quat),
      );
      for (const p of parts) {
        this.addPart(
          c,
          PARTS[p.def],
          new THREE.Vector3().fromArray(p.pos),
          new THREE.Quaternion().fromArray(p.quat),
          p.active,
        );
      }
      c.body.setLinvel({ x: s.vel[0], y: s.vel[1], z: s.vel[2] }, false);
      this.refresh(c);
    }
  }
}
