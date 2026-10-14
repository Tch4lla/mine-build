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
