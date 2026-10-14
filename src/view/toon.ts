/** Swaps Lambert materials for toon materials so props match the Ink & Wash world shading. */
import * as THREE from 'three';
import { toonGradient } from '../engine/atlas';

export function toonify(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.Material;
    if (!(m instanceof THREE.MeshLambertMaterial)) return;
    mesh.material = new THREE.MeshToonMaterial({
      color: m.color,
      map: m.map,
      emissive: m.emissive,
      transparent: m.transparent,
      opacity: m.opacity,
      side: m.side,
      gradientMap: toonGradient(),
    });
    m.dispose();
  });
}
