import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const SHOTS = process.env.SCREENSHOT_DIR;
const FIXTURE = fileURLToPath(new URL('../fixtures/world-v1.json', import.meta.url));

test('imports a version 1 world and keeps block state across a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.locator('input[type=file][accept*=json]').setInputFiles(FIXTURE);
  const item = page.locator('.world-item', { hasText: 'Old Format World (imported)' });
  await item.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  // The marker built into the old-format chunk: a brick pillar topped by a lamp, ringed with glass.
  const marker = await page.evaluate(() => {
    const w = window.__game!.world;
    return { pillar: w.getBlock(8, 43, 8), lamp: w.getBlock(8, 46, 8), glass: w.getBlock(5, 41, 5) };
  });
  expect(marker).toEqual({ pillar: 13, lamp: 19, glass: 9 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/v1-01-imported.png` });

  // Give the pillar's top brick a state, save, reload and check both survive.
  await page.evaluate(() => {
    const g = window.__game!;
    g.player.teleport(8.5, 47.2, 8.5);
    g.player.pitch = -Math.PI / 2 + 0.02;
  });
  await page.waitForTimeout(300);
  const set = await page.evaluate(async () => {
    const g = window.__game!;
    const info = g.debugBlockInfo();
    g.debugSetState(11);
    await g.save();
    return { info, after: g.debugBlockInfo() };
  });
  expect(set.info?.key).toBe('lamp');
  expect(set.after?.state).toBe(11);

  await page.reload();
  await page
    .locator('.world-item', { hasText: 'Old Format World (imported)' })
    .getByRole('button', { name: 'Play' })
    .click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(() => {
    const w = window.__game!.world;
    return { lamp: w.getBlock(8, 46, 8), state: w.getBlockState(8, 46, 8), pillar: w.getBlock(8, 43, 8) };
  });
  expect(reloaded).toEqual({ lamp: 19, state: 11, pillar: 13 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/v1-02-reloaded.png` });

  expect(errors).toEqual([]);
});
