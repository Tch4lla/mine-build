import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

test('library blocks: place, open, stand on, art style and catalogue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill('Library Blocks');
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  // Hover above a flat floor and place blocks on it through the normal item-use path.
  const placed = await page.evaluate(() => {
    const g = window.__game!;
    const w = g.world;
    g.player.creative = true;
    g.player.flying = true;
    const x = Math.floor(g.player.position.x);
    const z = Math.floor(g.player.position.z);
    const y = Math.floor(g.player.position.y) + 3;
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++) {
        w.setBlock(x + dx, y - 1, z + dz, 3);
        for (let dy = 0; dy < 6; dy++) w.setBlock(x + dx, y + dy, z + dz, 0);
      }
    w.flushDirtyNear(g.player.position);
    const use = (id: string, px: number, pz: number) => {
      g.player.teleport(px + 0.5, y + 2.6, pz + 0.5);
      g.player.pitch = -Math.PI / 2 + 0.02;
      g.player.yaw = 0;
      g.inventory.slots[g.inventory.selected] = { id, count: 8 };
      g.debugUseHeld();
    };
    use('oak_slab', x - 2, z);
    use('oak_door', x + 2, z);
    const slab = { id: w.getBlock(x - 2, y, z), key: g.debugBlockInfo()?.key };
    const door = [w.getBlock(x + 2, y, z), w.getBlock(x + 2, y + 1, z), w.getBlockState(x + 2, y + 1, z)];
    return { x, y, z, slab, door };
  });
  expect(placed.slab.id).toBeGreaterThan(27);
  expect(placed.door[0]).toBe(placed.door[1]);
  expect(placed.door[2] & 4).toBe(4); // the upper half

  // A bed is two blocks long; sleeping passes the time to the next sunrise or sunset.
  const bed = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    const w = g.world;
    g.mobs.spawningEnabled = false;
    for (const m of [...g.mobs.list]) g.mobs.remove(m);
    const aim = (px: number, pz: number) => {
      g.player.teleport(px + 0.5, y + 2.6, pz + 0.5);
      g.player.pitch = -Math.PI / 2 + 0.02;
      g.player.yaw = 0;
    };
    aim(x, z + 2);
    g.inventory.slots[g.inventory.selected] = { id: 'red_bed', count: 1 };
    g.debugUseHeld();
    const halves = [w.getBlock(x, y, z + 2), w.getBlock(x, y, z + 1), w.getBlockState(x, y, z + 1) & 4];
    g.inventory.slots[g.inventory.selected] = null;
    g.sky.time = 0.9;
    g.debugUseHeld();
    return { halves };
  }, placed);
  expect(bed.halves[0]).toBeGreaterThan(27);
  expect(bed.halves[1]).toBe(bed.halves[0]);
  expect(bed.halves[2]).toBe(4); // the head
  await page.waitForFunction(() => Math.abs(window.__game!.sky.time - 0.25) < 0.02, null, {
    timeout: 10_000,
  });
  const slept = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    const spawn = (g as unknown as { spawn: { x: number; y: number; z: number } }).spawn;
    g.sky.time = 0.4;
    g.debugUseHeld();
    return { spawn: [Math.floor(spawn.x), Math.floor(spawn.y), Math.floor(spawn.z)], bed: [x, y, z + 2] };
  }, placed);
  expect(slept.spawn).toEqual(slept.bed);
  await page.waitForFunction(() => Math.abs(window.__game!.sky.time - 0.75) < 0.02, null, {
    timeout: 10_000,
  });
  await page.waitForTimeout(1500);
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.teleport(x + 0.5, y + 1.6, z + 4.4);
    g.player.pitch = -0.55;
  }, placed);
  await page.waitForTimeout(800);
  await shot(page, 'lib-00-bed');
  const broken = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.teleport(x + 0.5, y + 2.6, z + 1.5);
    g.player.pitch = -Math.PI / 2 + 0.02;
    g.debugAttack();
    return [g.world.getBlock(x, y, z + 1), g.world.getBlock(x, y, z + 2)];
  }, placed);
  expect(broken).toEqual([0, 0]);

  // Right-click opens the door (both halves).
  const opened = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.teleport(x + 2.5, y + 2.6, z + 0.5);
    g.player.pitch = -Math.PI / 2 + 0.02;
    g.inventory.slots[g.inventory.selected] = null;
    g.debugUseHeld();
    return [g.world.getBlockState(x + 2, y + 1, z) & 8, g.world.getBlockState(x + 2, y, z) & 8];
  }, placed);
  expect(opened).toEqual([8, 8]);

  // The player stands on the slab's top, half a block up (in survival: creative players hover).
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.creative = false;
    g.player.flying = false;
    g.player.teleport(x - 1.5, y + 1.2, z + 0.5);
  }, placed);
  // Headless rendering is slow, so wait for the fall to finish rather than a fixed time.
  await page.waitForFunction((y) => window.__game!.player.position.y < y + 0.7, placed.y, {
    timeout: 10_000,
  });
  await page.waitForTimeout(500);
  const feet = await page.evaluate(() => window.__game!.player.position.y);
  expect(feet).toBeGreaterThan(placed.y + 0.4);
  expect(feet).toBeLessThan(placed.y + 0.7);
  await shot(page, 'lib-01-placed');
  await page.evaluate(() => (window.__game!.player.creative = true));

  // Library art for the original blocks, then back.
  const swapped = await page.evaluate(() => {
    const g = window.__game! as unknown as { settings: object; applySettings(s: object): void };
    g.applySettings({ ...g.settings, art: 'library' });
    return true;
  });
  expect(swapped).toBe(true);
  await page.waitForTimeout(1500);
  await shot(page, 'lib-02-library-art');
  await page.evaluate(() => {
    const g = window.__game! as unknown as { settings: object; applySettings(s: object): void };
    g.applySettings({ ...g.settings, art: 'world' });
  });

  // The creative catalogue finds library blocks by name.
  await page.evaluate(() => window.__game!.screens.show('inventory'));
  await page.getByTestId('catalog-search').fill('oak');
  const found = await page.locator('.catalog .slot').count();
  expect(found).toBeGreaterThan(10);
  await shot(page, 'lib-03-catalogue');

  expect(errors).toEqual([]);
});
