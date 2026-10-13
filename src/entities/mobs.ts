/** Slimes (hostile, bouncy) and training dummies (for testing Fuse weapons). */
import * as THREE from 'three';
import { RAPIER, GROUPS, type Physics } from '../physics/physicsWorld';
import { GRASS, SAND, SNOW } from '../world/blocks';
import type { World } from '../world/world';

export type MobKind = 'slime' | 'dummy';

export interface Mob {
  id: number;
  kind: MobKind;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Object3D;
  hp: number;
  maxHp: number;
  hopTimer: number;
  burn: number;
  burnTick: number;
  hurtFlash: number;
  wobble: number;
  wobbleVel: number;
  attackCooldown: number;
  size: number;
}

export interface HitResult {
  killed: boolean;
  damage: number;
  position: THREE.Vector3;
}

let nextId = 1;

function slimeMesh(size: number): THREE.Object3D {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshLambertMaterial({ color: 0x7ed957, transparent: true, opacity: 0.75 }),
  );
  outer.name = 'body';
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.55, size * 0.55, size * 0.55),
    new THREE.MeshLambertMaterial({ color: 0x4fae34 }),
  );
  g.add(inner, outer);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a2a10 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.16, 0.02), eyeMat);
    eye.position.set(s * size * 0.2, size * 0.1, -size / 2 - 0.011);
    g.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(size * 0.12, size * 0.08, 0.02), eyeMat);
  mouth.position.set(size * 0.05, -size * 0.15, -size / 2 - 0.011);
  g.add(mouth);
  return g;
}

function dummyMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const wobble = new THREE.Group();
  wobble.name = 'wobble';
  const wood = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  const straw = new THREE.MeshLambertMaterial({ color: 0xd9b866 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), wood);
  post.position.y = 0.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), straw);
  body.position.y = 1.15;
  body.name = 'body';
  const arms = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), wood);
  arms.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), straw);
  head.position.y = 1.75;
  const target = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 16),
    new THREE.MeshBasicMaterial({ color: 0xd84a3a }),
  );
  target.position.set(0, 1.15, -0.18);
  target.rotation.y = Math.PI;
  wobble.add(post, body, arms, head, target);
  g.add(wobble);
  return g;
}

export class Mobs {
  readonly group = new THREE.Group();
  readonly list: Mob[] = [];
  private readonly byCollider = new Map<number, Mob>();
  private spawnTimer = 3;
  spawningEnabled = true;
  maxSlimes = 6;
  onSlimeDeath: (pos: THREE.Vector3) => void = () => undefined;

  constructor(
    private readonly physics: Physics,
    private readonly world: World,
  ) {}

  spawnSlime(pos: THREE.Vector3, size = 0.8 + Math.random() * 0.4): Mob {
    const body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .lockRotations()
        .setLinearDamping(0.3),
    );
    const collider = this.physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
        .setMass(4 * size)
        .setFriction(0.9)
        .setRestitution(0.2)
        .setCollisionGroups(GROUPS.mob),
      body,
    );
    const mesh = slimeMesh(size);
    return this.add({ kind: 'slime', body, collider, mesh, hp: 8, maxHp: 8, size });
  }

  spawnDummy(pos: THREE.Vector3, yaw: number): Mob {
    const body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pos.x, pos.y, pos.z)
        .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)),
    );
    const collider = this.physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.35, 0.95, 0.25).setTranslation(0, 0.95, 0).setCollisionGroups(GROUPS.mob),
      body,
    );
    const mesh = dummyMesh();
    mesh.rotation.y = yaw;
    return this.add({ kind: 'dummy', body, collider, mesh, hp: Infinity, maxHp: Infinity, size: 1 });
  }

  private add(
    m: Omit<
      Mob,
      'id' | 'hopTimer' | 'burn' | 'burnTick' | 'hurtFlash' | 'wobble' | 'wobbleVel' | 'attackCooldown'
    >,
  ): Mob {
    const mob: Mob = {
      ...m,
      id: nextId++,
      hopTimer: 1 + Math.random() * 2,
      burn: 0,
      burnTick: 0,
      hurtFlash: 0,
      wobble: 0,
      wobbleVel: 0,
      attackCooldown: 0,
    };
    this.list.push(mob);
    this.byCollider.set(mob.collider.handle, mob);
    this.group.add(mob.mesh);
    return mob;
  }

  find(collider: RAPIER.Collider): Mob | undefined {
    return this.byCollider.get(collider.handle);
  }

  remove(m: Mob): void {
    this.byCollider.delete(m.collider.handle);
    this.physics.world.removeRigidBody(m.body);
    this.group.remove(m.mesh);
    const i = this.list.indexOf(m);
    if (i >= 0) this.list.splice(i, 1);
  }

  clear(): void {
    for (const m of [...this.list]) this.remove(m);
  }

  position(m: Mob): THREE.Vector3 {
    const t = m.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  hit(m: Mob, damage: number, knockback: THREE.Vector3, fire = false): HitResult {
    const pos = this.position(m);
    if (m.kind === 'dummy') {
      m.wobbleVel += Math.min(6, 1 + knockback.length() * 0.6);
      if (fire) m.burn = 3;
      return { killed: false, damage, position: pos.add(new THREE.Vector3(0, 1.9, 0)) };
    }
    m.hp -= damage;
    m.hurtFlash = 0.25;
    if (fire) m.burn = 4;
    m.body.applyImpulse(knockback.clone().multiplyScalar(m.body.mass()), true);
    if (m.hp <= 0) {
      this.onSlimeDeath(pos.clone());
      this.remove(m);
      return { killed: true, damage, position: pos };
    }
    return { killed: false, damage, position: pos.add(new THREE.Vector3(0, m.size, 0)) };
  }

  impulseCone(origin: THREE.Vector3, dir: THREE.Vector3, range: number, strength: number): void {
    for (const m of this.list) {
      if (m.kind !== 'slime') continue;
      const to = this.position(m).sub(origin);
      const d = to.length();
      if (d > range || d < 1e-3 || to.normalize().dot(dir) < 0.6) continue;
      m.body.applyImpulse(
        dir
          .clone()
          .add(new THREE.Vector3(0, 0.3, 0))
          .multiplyScalar(strength * (1 - d / range) * m.body.mass()),
        true,
      );
    }
  }

  /** Damages and pushes mobs in a radius; returns positions of mobs hit (for effects). */
  explode(origin: THREE.Vector3, radius: number, damage: number): void {
    for (const m of [...this.list]) {
      const p = this.position(m);
      const d = p.distanceTo(origin);
      if (d > radius) continue;
      const dir = p
        .clone()
        .sub(origin)
        .normalize()
        .add(new THREE.Vector3(0, 0.8, 0))
        .normalize();
      this.hit(m, damage * (1 - d / radius) + 1, dir.multiplyScalar(10 * (1 - d / radius)), false);
    }
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerContact: (m: Mob, dir: THREE.Vector3) => void,
    onBurnDamage: (m: Mob, pos: THREE.Vector3) => void,
    nightFactor: number,
  ): void {
    // Spawning: slimes appear on grass/sand/snow around the player, more at night.
    this.spawnTimer -= dt;
    const slimes = this.list.filter((m) => m.kind === 'slime');
    if (this.spawningEnabled && this.spawnTimer <= 0) {
      this.spawnTimer = 6 + Math.random() * 6 - nightFactor * 4;
      const cap = Math.round(this.maxSlimes * (0.5 + nightFactor * 0.5));
      if (slimes.length < cap) {
        const a = Math.random() * Math.PI * 2;
        const r = 14 + Math.random() * 12;
        const x = Math.floor(playerPos.x + Math.cos(a) * r);
        const z = Math.floor(playerPos.z + Math.sin(a) * r);
        if (this.world.isLoaded(x, z)) {
          const y = this.world.surfaceY(x, z);
          const top = this.world.getBlock(x, y, z);
          if (y > 0 && (top === GRASS || top === SAND || top === SNOW))
            this.spawnSlime(new THREE.Vector3(x + 0.5, y + 1.6, z + 0.5));
        }
      }
    }

    for (const m of [...this.list]) {
      const pos = this.position(m);
      if (m.kind === 'slime') {
        // Despawn far away or fallen out of the world.
        if (pos.distanceTo(playerPos) > 80 || pos.y < -10) {
          this.remove(m);
          continue;
        }
        const near = pos.distanceTo(playerPos) < 30;
        if (near !== m.body.isEnabled()) m.body.setEnabled(near);
        if (!near) continue;
        m.hopTimer -= dt;
        m.attackCooldown = Math.max(0, m.attackCooldown - dt);
        const v = m.body.linvel();
        const grounded = Math.abs(v.y) < 0.2;
        const toPlayer = playerPos.clone().sub(pos);
        const dist = toPlayer.length();
        if (grounded && m.hopTimer <= 0) {
          m.hopTimer = 1.2 + Math.random() * 1.5;
          const dir =
            dist < 16
              ? toPlayer.setY(0).normalize()
              : new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          const mass = m.body.mass();
          m.body.applyImpulse({ x: dir.x * 3.2 * mass, y: 6.5 * mass, z: dir.z * 3.2 * mass }, true);
          m.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
        }
        // Squash and stretch.
        const stretch = THREE.MathUtils.clamp(1 + v.y * 0.05, 0.75, 1.3);
        m.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        if (dist < 0.5 + m.size * 0.6 + 0.3 && m.attackCooldown <= 0) {
          m.attackCooldown = 1;
          onPlayerContact(m, toPlayer.clone().setY(0).normalize());
        }
      } else {
        // Dummy wobble spring.
        m.wobbleVel += -m.wobble * 60 * dt - m.wobbleVel * 4 * dt;
        m.wobble += m.wobbleVel * dt;
        const w = m.mesh.getObjectByName('wobble');
        if (w) w.rotation.x = m.wobble * 0.25;
      }

      // Burning.
      if (m.burn > 0) {
        m.burn -= dt;
        m.burnTick -= dt;
        if (m.burnTick <= 0) {
          m.burnTick = 0.7;
          onBurnDamage(m, pos);
          if (m.kind === 'slime') {
            m.hp -= 1;
            m.hurtFlash = 0.2;
            if (m.hp <= 0) {
              this.onSlimeDeath(pos.clone());
              this.remove(m);
              continue;
            }
          }
        }
      }
      m.hurtFlash = Math.max(0, m.hurtFlash - dt);
      const body = m.mesh.getObjectByName('body') as THREE.Mesh | undefined;
      if (body) {
        const mat = body.material as THREE.MeshLambertMaterial;
        mat.emissive.setRGB(m.hurtFlash > 0 ? 0.8 : m.burn > 0 ? 0.5 : 0, m.burn > 0 ? 0.2 : 0, 0);
      }
    }
  }

  sync(): void {
    for (const m of this.list) {
      const t = m.body.translation();
      if (m.kind === 'slime') m.mesh.position.set(t.x, t.y, t.z);
      else m.mesh.position.set(t.x, t.y, t.z);
    }
  }

  serializeDummies(): { pos: number[]; yaw: number }[] {
    return this.list
      .filter((m) => m.kind === 'dummy')
      .map((m) => {
        const t = m.body.translation();
        return { pos: [t.x, t.y, t.z], yaw: m.mesh.rotation.y };
      });
  }
}
