/** Tiny cube particles rendered with a single InstancedMesh. */
import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  color: THREE.Color;
}

const MAX = 600;

export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private readonly list: Particle[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      MAX,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, new THREE.Color());
  }

  burst(
    pos: THREE.Vector3,
    color: THREE.ColorRepresentation,
    count = 12,
    opts: { speed?: number; size?: number; life?: number; gravity?: number; up?: number } = {},
  ): void {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      if (this.list.length >= MAX) this.list.shift();
      const speed = opts.speed ?? 3;
      const v = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5 + (opts.up ?? 0.4),
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      const life = (opts.life ?? 0.7) * (0.6 + Math.random() * 0.6);
      const jitter = 0.85 + Math.random() * 0.3;
      this.list.push({
        pos: pos
          .clone()
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3,
            ),
          ),
        vel: v,
        life,
        maxLife: life,
        size: (opts.size ?? 0.09) * (0.7 + Math.random() * 0.6),
        gravity: opts.gravity ?? 9,
        color: c.clone().multiplyScalar(jitter),
      });
    }
  }

  update(dt: number): void {
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(1 - 1.5 * dt);
      p.pos.addScaledVector(p.vel, dt);
    }
    for (const p of this.list) {
      const k = p.size * Math.min(1, (p.life / p.maxLife) * 2);
      this.s.set(k, k, k);
      this.m.compose(p.pos, this.q, this.s);
      this.mesh.setMatrixAt(n, this.m);
      this.mesh.setColorAt(n, p.color);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
