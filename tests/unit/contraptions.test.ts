import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GROUPS, Physics, RAPIER, initPhysics } from '../../src/physics/physicsWorld';
import { ContraptionManager, type DriveInput } from '../../src/build/contraptions';

beforeAll(async () => {
  await initPhysics();
});

function flatGround(physics: Physics) {
  const vox: number[] = [];
  for (let x = -40; x < 40; x++) for (let z = -40; z < 40; z++) vox.push(x, 0, z);
  physics.world.createCollider(
    RAPIER.ColliderDesc.voxels(new Int32Array(vox), { x: 1, y: 1, z: 1 })
      .setCollisionGroups(GROUPS.terrain)
      .setFriction(0.9),
  );
}

function run(physics: Physics, mgr: ContraptionManager, seconds: number, drive: DriveInput | null = null) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    mgr.step(1 / 60, drive, drive ? mgr.list[0] : null);
    physics.world.step();
  }
}

/** Board chassis with a seat and four wheels, assembled through the public merge API. */
function buildCar(mgr: ContraptionManager) {
  const board = mgr.spawn('board', new THREE.Vector3(0, 2, 0));
  const seat = mgr.spawn('seat', new THREE.Vector3(0, 2.33, 0.1));
  mgr.merge(seat, board);
  for (const [x, z] of [
    [-1.15, -0.5],
    [1.15, -0.5],
    [-1.15, 0.5],
    [1.15, 0.5],
  ]) {
    mgr.merge(mgr.spawn('wheel', new THREE.Vector3(x, 1.85, z)), board);
  }
  board.occupiedSeat = board.parts.find((p) => p.def.id === 'seat')!;
  return board;
}

describe('contraptions', () => {
  it('merges parts into one body and preserves world transforms through detach', () => {
    const physics = new Physics();
    const mgr = new ContraptionManager(physics);
    const a = mgr.spawn('crate', new THREE.Vector3(0, 5, 0));
    const b = mgr.spawn(
      'crate',
      new THREE.Vector3(0.9, 5, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7),
    );
    const before = b.worldTransformOf(b.parts[0]);
    const merged = mgr.merge(b, a);
    expect(mgr.list.length).toBe(1);
    expect(merged.parts.length).toBe(2);
    const moved = merged.parts[1];
    const after = merged.worldTransformOf(moved);
    expect(after.pos.distanceTo(before.pos)).toBeLessThan(1e-4);
    expect(after.quat.angleTo(before.quat)).toBeLessThan(1e-4);
    // Every collider maps back to its contraption.
    for (const p of merged.parts) expect(mgr.find(p.collider)?.c).toBe(merged);

    const split = mgr.detach(merged, moved);
    expect(mgr.list.length).toBe(2);
    expect(split.worldTransformOf(split.parts[0]).pos.distanceTo(before.pos)).toBeLessThan(1e-4);
  });

  it('round-trips through serialize/load', () => {
    const physics = new Physics();
    const mgr = new ContraptionManager(physics);
    const car = buildCar(mgr);
    expect(car.parts.length).toBe(6);
    const data = mgr.serialize();
    mgr.load(data);
    expect(mgr.list.length).toBe(1);
    expect(mgr.list[0].parts.length).toBe(6);
    expect(mgr.list[0].vehicle?.numWheels()).toBe(4);
  });

  it('balloons lift a board', () => {
    const physics = new Physics();
    flatGround(physics);
    const mgr = new ContraptionManager(physics);
    const board = mgr.spawn('board', new THREE.Vector3(0, 1.2, 0));
    mgr.merge(mgr.spawn('balloon', new THREE.Vector3(-0.6, 1.9, 0)), board);
    mgr.merge(mgr.spawn('balloon', new THREE.Vector3(0.6, 1.9, 0)), board);
    run(physics, mgr, 3);
    expect(board.position.y).toBeGreaterThan(3);
  });

  it('drives a car forward (seat faces -Z) and steers', () => {
    const physics = new Physics();
    flatGround(physics);
    const mgr = new ContraptionManager(physics);
    const car = buildCar(mgr);
    run(physics, mgr, 1.5); // settle on its suspension
    const start = car.position.clone();
    expect(start.y).toBeGreaterThan(1.2);
    run(physics, mgr, 2.5, { throttle: 1, steer: 0, toggleDevices: false });
    const moved = car.position.clone().sub(start);
    expect(moved.z).toBeLessThan(-2); // forward = -Z
    expect(Math.abs(moved.x)).toBeLessThan(Math.abs(moved.z) / 3);

    // Steering right (steer = +1) should curve towards +X while driving forward.
    const s2 = car.position.clone();
    run(physics, mgr, 2, { throttle: 1, steer: 1, toggleDevices: false });
    expect(car.position.x - s2.x).toBeGreaterThan(0.5);
  });

  it('a fan pushes along its local +Z', () => {
    const physics = new Physics();
    flatGround(physics);
    const mgr = new ContraptionManager(physics);
    const board = mgr.spawn('board', new THREE.Vector3(0, 1.2, 0));
    mgr.merge(mgr.spawn('fan', new THREE.Vector3(0, 1.6, 0.3)), board);
    const fan = board.parts.find((p) => p.def.id === 'fan')!;
    run(physics, mgr, 0.5);
    mgr.activate(board, fan);
    const start = board.position.clone();
    run(physics, mgr, 2);
    expect(board.position.z - start.z).toBeGreaterThan(0.5);
  });

  it('a rocket launches upward', () => {
    const physics = new Physics();
    flatGround(physics);
    const mgr = new ContraptionManager(physics);
    const r = mgr.spawn('rocket', new THREE.Vector3(0, 1.5, 0));
    run(physics, mgr, 0.5);
    mgr.activate(r, r.parts[0]);
    run(physics, mgr, 1.5);
    expect(r.position.y).toBeGreaterThan(5);
  });
});
