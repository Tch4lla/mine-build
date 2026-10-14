import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

/** Hover above the chest so the crosshair targets it. */
async function aimAtChest(page: Page, p: { x: number; y: number; z: number }) {
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.creative = true;
    g.player.flying = true;
    g.player.teleport(x + 0.5, y + 2.6, z + 0.5);
    g.player.pitch = -Math.PI / 2 + 0.02;
    g.player.yaw = 0;
  }, p);
}

test('chests keep what you put in them, and spill it when broken', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill('Storage');
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  // Place a chest on a stone floor; holding right-click on it afterwards places nothing on top.
  const p = await page.evaluate(() => {
    const g = window.__game!;
    const w = g.world;
    const x = Math.floor(g.player.position.x);
    const z = Math.floor(g.player.position.z);
    const y = Math.floor(g.player.position.y) + 3;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        w.setBlock(x + dx, y - 1, z + dz, 3);
        for (let dy = 0; dy < 5; dy++) w.setBlock(x + dx, y + dy, z + dz, 0);
      }
    return { x, y, z };
  });
  await aimAtChest(page, p);
  const placed = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.inventory.slots[0] = { id: 'chest', count: 2 };
    g.inventory.selected = 0;
    g.debugUseHeld();
    for (let i = 0; i < 3; i++) g.debugUseHeld(false);
    return { chest: g.world.getBlock(x, y, z), above: g.world.getBlock(x, y + 1, z) };
  }, p);
  expect(placed.chest).toBeGreaterThan(27);
  expect(placed.above).toBe(0);

  // Open it and Shift-click a stack of bricks from the hotbar into it.
  await page.evaluate(() => {
    const g = window.__game!;
    g.inventory.slots[1] = { id: 'stone_bricks', count: 10 };
    g.debugOpenContainer();
  });
  await expect(page.getByTestId('container-grid')).toBeVisible();
  // Player slots are listed backpack first (27), then the hotbar.
  await page
    .locator('[data-box=player]')
    .nth(27 + 1)
    .click({ modifiers: ['Shift'] });
  await expect(page.locator('[data-box=container] img')).toHaveCount(1);
  await shot(page, 'storage-01-open');
  const moved = await page.evaluate(() => window.__game!.inventory.slots[1]);
  expect(moved).toBeNull();
  await page.keyboard.press('Escape');

  // Save, reload and reopen: the bricks are still in the chest.
  await page.evaluate(() => window.__game!.save());
  await page.reload();
  await page.locator('.world-item', { hasText: 'Storage' }).getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await aimAtChest(page, p);
  expect(await page.evaluate(() => window.__game!.debugOpenContainer())).toBe(true);
  await expect(page.locator('[data-box=container] img')).toHaveCount(1);
  await page.keyboard.press('Escape');

  // Breaking the chest spills the bricks into the world.
  const spilled = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.player.creative = false;
    const before = g.dropped.list.length;
    g.breakBlock(x, y, z, true);
    return g.dropped.list.length - before;
  }, p);
  expect(spilled).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
