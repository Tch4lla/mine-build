import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

/** Places the held block on the floor at (x, y, z) as a player looking north, from just above. */
async function placeAt(page: Page, x: number, y: number, z: number) {
  await page.evaluate(
    ({ x, y, z }) => {
      const g = window.__game!;
      g.player.teleport(x + 0.5, y + 2.6, z + 0.5);
      g.player.yaw = 0;
      g.player.pitch = -Math.PI / 2 + 0.02;
    },
    { x, y, z },
  );
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game!.debugUseHeld());
  // Placing has a short cooldown, in game time.
  await page.waitForTimeout(700);
}

async function newWorld(page: Page, name: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill(name);
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return errors;
}

/** Clears a 9×9 room with a stone floor around the player; returns the floor's top cell. */
async function clearRoom(page: Page) {
  return page.evaluate(() => {
    const g = window.__game!;
    const w = g.world;
    const x = Math.floor(g.player.position.x);
    const z = Math.floor(g.player.position.z);
    const y = Math.floor(g.player.position.y) + 3;
    for (let dx = -4; dx <= 4; dx++)
      for (let dz = -6; dz <= 4; dz++) {
        w.setBlock(x + dx, y - 1, z + dz, 3);
        for (let dy = 0; dy < 6; dy++) w.setBlock(x + dx, y + dy, z + dz, 0);
      }
    g.player.creative = true;
    g.player.flying = true;
    return { x, y, z };
  });
}

test('two doors side by side open from the middle, together', async ({ page }) => {
  const errors = await newWorld(page, 'Doors');
  const p = await clearRoom(page);
  const doors = { left: [p.x, p.y, p.z - 3], right: [p.x + 1, p.y, p.z - 3] };
  await page.evaluate(() => {
    const g = window.__game!;
    g.inventory.slots[0] = { id: 'oak_door', count: 2 };
    g.inventory.selected = 0;
  });
  // Place them looking north, side by side, aiming at the floor where each door goes.
  for (const dx of [0, 1]) await placeAt(page, p.x + dx, p.y, p.z - 3);
  const placed = await page.evaluate(({ left, right }) => {
    const g = window.__game!;
    return [left, right].map(([x, y, z]) => g.world.getBlock(x, y, z));
  }, doors);
  expect(placed[0]).toBeGreaterThan(27);
  expect(placed[1]).toBe(placed[0]);

  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.inventory.slots[0] = null;
    g.player.teleport(x + 1, y, z + 0.5);
    g.player.yaw = 0;
    g.player.pitch = 0.15;
  }, p);
  await page.waitForTimeout(600);
  await shot(page, 'doors-closed');

  // Right-click the left door: both open, swinging away from each other.
  const opened = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.teleport(x + 0.5, y, z + 0.5);
    g.player.yaw = 0;
    g.player.pitch = -0.1;
    return new Promise<number[]>((resolve) =>
      setTimeout(() => {
        g.debugUseHeld();
        resolve([g.world.getBlockState(x, y, z - 3), g.world.getBlockState(x + 1, y, z - 3)]);
      }, 300),
    );
  }, p);
  expect(opened[0] & 8).toBe(8);
  expect(opened[1] & 8).toBe(8);
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.teleport(x + 1, y, z + 0.5);
    g.player.yaw = 0;
    g.player.pitch = 0.15;
  }, p);
  await page.waitForTimeout(600);
  await shot(page, 'doors-open');
  expect(errors).toEqual([]);
});

test('a shelf is an open unit that shows what it holds', async ({ page }) => {
  const errors = await newWorld(page, 'Shelves');
  const p = await clearRoom(page);
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    // Two shelves facing the player (placed looking north), with a wall behind them.
    for (let dx = -2; dx <= 3; dx++)
      for (let dy = 0; dy < 3; dy++) g.world.setBlock(x + dx, y + dy, z - 4, 3);
  }, p);
  await page.evaluate(() => {
    const g = window.__game!;
    g.inventory.slots[0] = { id: 'oak_shelf', count: 4 };
    g.inventory.selected = 0;
  });
  for (const dx of [0, 1]) await placeAt(page, p.x + dx, p.y, p.z - 3);
  const placed = await page.evaluate(({ x, y, z }) => window.__game!.world.getBlock(x, y, z - 3), p);
  expect(placed).toBeGreaterThan(27);

  // Fill the left shelf (the storage test covers its screen).
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game! as unknown as { containers: Map<string, unknown[]> };
    const items = [
      'crystal',
      'blast_fruit',
      'ember',
      'stone_bricks',
      'wood_sword',
      'iron_chunk',
      'flint',
      'glass',
      'stick',
    ];
    g.containers.set(
      `${x},${y},${z - 3}`,
      items.map((id) => ({ id, count: 1 })),
    );
  }, p);
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.inventory.slots[0] = null;
    g.player.teleport(x + 1, y - 0.4, z + 0.2);
    g.player.yaw = 0;
    g.player.pitch = -0.42;
  }, p);
  await page.waitForTimeout(800);
  await shot(page, 'shelves');
  const shown = await page.evaluate(() => window.__game!.shelves.group.children.length);
  expect(shown).toBe(1);
  expect(errors).toEqual([]);
});
