/** First-person held item ("viewmodel"), rendered in its own scene on top of the world. */
import * as THREE from 'three';
import type { ItemStack } from '../items/inventory';
import { item } from '../items/items';
import { itemModel } from '../items/icons';
import { photoTexture } from '../photos/photoTextures';

export class ViewModel {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly holder = new THREE.Group();
  private current: THREE.Object3D | null = null;
  private key = '';
  private swing = 0;
  private bob = 0;
  guarding = false;
  private guardT = 0;
  private equipT = 1;
  readonly light = new THREE.DirectionalLight(0xffffff, 1.2);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.6);

  constructor(fov: number) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 10);
    this.scene.add(this.holder, this.light, this.ambient);
    this.light.position.set(1, 2, 1.5);
  }

  setStack(stack: ItemStack | null): void {
    const key = stack ? `${stack.id}|${stack.data?.fuse ?? ''}|${stack.data?.photoId ?? ''}` : '';
    if (key === this.key) return;
    this.key = key;
    this.equipT = 0;
    if (this.current) this.holder.remove(this.current);
    this.current = null;
    if (!stack) {
      // Blocky arm.
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.7),
        new THREE.MeshLambertMaterial({ color: 0xd9a77a }),
      );
      arm.position.set(0, -0.05, 0.1);
      this.current = arm;
      this.holder.add(arm);
      return;
    }
    const def = item(stack.id);
    const build = (tex?: THREE.Texture) => {
      if (this.key !== key) return;
      if (this.current) this.holder.remove(this.current);
      const m = itemModel(stack, tex);
      if (def.block !== undefined) {
        m.scale.setScalar(0.24);
        m.rotation.set(0.1, 0.75, 0);
      } else if (def.kind === 'tool' && def.tool?.cls !== 'shield') {
        // Mirror the sprite so the handle sits in the bottom-right, head pointing up-left.
        m.scale.setScalar(0.3);
        m.rotation.set(0.1, Math.PI - 0.6, 0.15);
        m.position.set(0, 0.06, 0);
      } else if (def.tool?.cls === 'shield') {
        m.scale.setScalar(0.34);
        m.rotation.set(0, -0.3, 0);
      } else {
        m.scale.setScalar(0.26);
        m.rotation.set(0, -0.4, 0);
      }
      this.current = m;
      this.holder.add(m);
    };
    build();
    if (stack.data?.photoId) void photoTexture(stack.data.photoId).then((t) => t && build(t.texture));
  }

  doSwing(): void {
    this.swing = 1;
  }

  update(dt: number, moving: boolean, aspect: number, fov: number): void {
    this.camera.aspect = aspect;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.swing = Math.max(0, this.swing - dt * 4);
    this.bob += dt * (moving ? 9 : 0);
    this.equipT = Math.min(1, this.equipT + dt * 5);
    this.guardT += ((this.guarding ? 1 : 0) - this.guardT) * Math.min(1, dt * 12);
    const s = Math.sin(this.swing * Math.PI);
    const bx = moving ? Math.sin(this.bob) * 0.02 : 0;
    const by = moving ? Math.abs(Math.cos(this.bob)) * 0.02 : 0;
    const g = this.guardT;
    this.holder.position.set(
      THREE.MathUtils.lerp(0.36, 0.05, g) + bx - s * 0.12,
      THREE.MathUtils.lerp(-0.3, -0.18, g) + by + s * 0.05 - (1 - this.equipT) * 0.4,
      THREE.MathUtils.lerp(-0.6, -0.5, g) - s * 0.12,
    );
    this.holder.rotation.set(-s * 1.1, s * 0.4 + g * 0.3, 0);
  }

  setLighting(intensity: number): void {
    this.light.intensity = 0.4 + intensity * 0.9;
    this.ambient.intensity = 0.25 + intensity * 0.45;
  }
}
