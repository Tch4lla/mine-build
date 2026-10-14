/** Day/night cycle: sky colour, fog, sun/moon, lighting and drifting clouds. */
import * as THREE from 'three';
import { mulberry32 } from '../engine/rng';

export const DAY_LENGTH = 720; // seconds for a full day

// Ink & Wash: a warm paper sky by day, indigo ink at night.
const DAY_SKY = new THREE.Color(0xf2e8d5);
const DUSK_SKY = new THREE.Color(0xe9b08a);
const NIGHT_SKY = new THREE.Color(0x1c2233);
const WATER_FOG = new THREE.Color(0x3b6478);

export class Sky {
  /** 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. */
  time = 0.3;
  readonly sun = new THREE.DirectionalLight(0xffffff, 1.6);
  readonly hemi = new THREE.HemisphereLight(0xfff6e6, 0xb3a184, 0.9);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.25);
  readonly group = new THREE.Group();
  private readonly sunMesh: THREE.Mesh;
  private readonly moonMesh: THREE.Mesh;
  private readonly clouds: THREE.Mesh;
  private readonly stars: THREE.Points;
  readonly fog: THREE.Fog;
  readonly skyColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.fog = new THREE.Fog(DAY_SKY, 40, 100);
    scene.fog = this.fog;
    scene.background = this.skyColor;
    scene.add(this.sun, this.sun.target, this.hemi, this.ambient, this.group);
    const disc = (color: number, size: number) => {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(size / 2, 48),
        new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false }),
      );
      m.renderOrder = -1;
      return m;
    };
    this.sunMesh = disc(0xd8573c, 34); // vermilion sun
    this.moonMesh = disc(0xf2ead8, 20);
    this.group.add(this.sunMesh, this.moonMesh);

    // Stars.
    const rnd = mulberry32(7);
    const pts: number[] = [];
    for (let i = 0; i < 600; i++) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.2 - 0.2, rnd() * 2 - 1)
        .normalize()
        .multiplyScalar(380);
      pts.push(v.x, v.y, v.z);
    }
    this.stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.6,
        sizeAttenuation: false,
        fog: false,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.group.add(this.stars);

    // Soft, puffy clouds: clusters of radial gradients drawn so they wrap seamlessly.
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;
    const puff = (x: number, y: number, r: number) => {
      for (const ox of [-S, 0, S])
        for (const oy of [-S, 0, S]) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.85)');
          g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
    };
    for (let k = 0; k < 9; k++) {
      const cx = rnd() * S;
      const cy = rnd() * S;
      for (let j = 0; j < 6; j++) puff(cx + (rnd() - 0.5) * 50, cy + (rnd() - 0.5) * 18, 10 + rnd() * 16);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    this.clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    this.clouds.rotation.x = -Math.PI / 2;
    this.group.add(this.clouds);
  }

  /** 0 at day, 1 at night. */
  get night(): number {
    const sunH = Math.sin(2 * Math.PI * (this.time - 0.25));
    return THREE.MathUtils.clamp(0.5 - sunH * 2.5, 0, 1);
  }

  setRenderDistance(blocks: number): void {
    this.fog.near = blocks * 0.55;
    this.fog.far = blocks * 0.95;
  }

  update(dt: number, center: THREE.Vector3, underwater: boolean, fogNear: number, fogFar: number): void {
    this.time = (this.time + dt / DAY_LENGTH) % 1;
    const angle = 2 * Math.PI * (this.time - 0.25);
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.25).normalize();
    const sunH = sunDir.y;
    const night = this.night;
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(sunH) * 4, 0, 1);

    this.skyColor
      .copy(DAY_SKY)
      .lerp(NIGHT_SKY, night)
      .lerp(DUSK_SKY, dusk * 0.5 * (1 - night * 0.5));
    this.fog.color.copy(underwater ? WATER_FOG : this.skyColor);
    this.fog.near = underwater ? 1 : fogNear;
    this.fog.far = underwater ? 18 : fogFar;

    this.sun.position.copy(center).addScaledVector(sunH > -0.05 ? sunDir : sunDir.clone().negate(), 100);
    this.sun.target.position.copy(center);
    this.sun.intensity = THREE.MathUtils.lerp(1.6, 0.18, night);
    this.sun.color.setHex(sunH > -0.05 ? 0xfff2e0 : 0x9bb0ff);
    this.hemi.intensity = THREE.MathUtils.lerp(0.95, 0.22, night);
    this.ambient.intensity = THREE.MathUtils.lerp(0.3, 0.12, night);

    this.group.position.copy(center);
    this.sunMesh.position.copy(sunDir).multiplyScalar(350);
    this.group.updateMatrixWorld();
    this.sunMesh.lookAt(center);
    this.moonMesh.position.copy(sunDir).multiplyScalar(-350);
    this.moonMesh.lookAt(center);
    (this.stars.material as THREE.PointsMaterial).opacity = night;
    this.clouds.position.set(0, 110 - center.y, 0);
    const map = (this.clouds.material as THREE.MeshBasicMaterial).map!;
    map.offset.set((center.x / 1200) * 3 + this.time * 30, (-center.z / 1200) * 3);
    // Clouds read as pale washes against the paper sky, and dim to ink-blue at night.
    (this.clouds.material as THREE.MeshBasicMaterial).color
      .setHex(0xe4dfd4)
      .lerp(new THREE.Color(0x2c3448), night);
  }
}
