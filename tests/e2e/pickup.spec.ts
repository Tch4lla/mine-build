import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SCREENSHOT_DIR;

/** A fresh creative world with a stone floor around the player; returns the floor's top cell. */
async function creativeRoom(page: Page) {
  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill('Pickup');
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const g = window.__game!;
    const w = g.world;
    const x = Math.floor(g.player.position.x);
    const z = Math.floor(g.player.position.z);
    const y = Math.floor(g.player.position.y) + 3;
    for (let dx = -4; dx <= 4; dx++)
      for (let dz = -6; dz <= 4; dz++) {
        w.setBlock(x + dx, y - 1, z + dz, 3);
        for (let dy = 0; dy < 5; dy++) w.setBlock(x + dx, y + dy, z + dz, 0);
      }
    g.player.creative = true;
    g.player.flying = false;
    g.player.teleport(x + 0.5, y, z + 0.5);
    g.player.yaw = 0;
    g.player.pitch = 0;
    g.inventory.slots.fill(null);
    g.inventory.changed();
    return { x, y, z };
  });
}

const countOf = (page: Page, id: string) => page.evaluate((id) => window.__game!.inventory.count(id), id);

test('in creative, broken blocks go straight into the inventory', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const p = await creativeRoom(page);
  const res = await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.world.setBlock(x, y, z - 3, 13); // brick
    const before = g.dropped.list.length;
    g.breakBlock(x, y, z - 3, true);
    return { bricks: g.inventory.count('brick'), dropped: g.dropped.list.length - before };
  }, p);
  expect(res).toEqual({ bricks: 1, dropped: 0 });
  expect(errors).toEqual([]);
});

test('a stack dropped from the inventory screen comes back, even up on a step', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const p = await creativeRoom(page);
  // A one-block step just ahead, where a tossed item lands out of the player's feet's reach.
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -3; dz <= -1; dz++) g.world.setBlock(x + dx, y, z + dz, 3);
  }, p);

  await page.evaluate(() => window.__game!.screens.show('inventory'));
  await page.locator('.tabs button', { hasText: 'Creative' }).first().click();
  await page.locator('.catalog .slot').first().dispatchEvent('mousedown');
  await page.getByText('Drop held stack').click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__game!.setPaused(false));
  const id = await page.evaluate(() => window.__game!.dropped.list.at(-1)!.stack.id);
  expect(await countOf(page, id)).toBe(0);

  // The player stays where they are: the stack is drawn back in and collected.
  await page.waitForFunction((id) => window.__game!.inventory.count(id) > 0, id, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('items are picked up from below while flying over them', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const p = await creativeRoom(page);
  await page.evaluate(({ x, y, z }) => {
    const g = window.__game!;
    g.dropped.drop(
      { id: 'glass', count: 5 },
      g.player.position.clone().set(x + 0.5, y, z - 2.5),
      undefined,
      0,
    );
    g.player.flying = true;
    g.player.teleport(x + 0.5, y + 1.5, z - 2.5);
  }, p);
  if (SHOTS) {
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOTS}/pickup-flying.png` });
  }
  await page.waitForFunction(() => window.__game!.inventory.count('glass') === 5, null, { timeout: 30_000 });
  expect(errors).toEqual([]);
});
