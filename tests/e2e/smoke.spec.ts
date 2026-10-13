import { expect, test, type Page } from '@playwright/test';
import { gradientPng } from './png';
import type { Game } from '../../src/game';

declare global {
  interface Window {
    __game?: Game | null;
  }
}

const SHOTS = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Looks straight down so the crosshair targets the block under the player's feet. */
async function lookDown(page: Page) {
  await page.evaluate(() => {
    const g = window.__game!;
    g.player.pitch = -Math.PI / 2 + 0.02;
    g.player.yaw = 0;
  });
}

test('world, Tether, Bind, photos and saving', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill('E2E World');
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(3000);

  // 1. The world renders: sample pixels below the horizon and check they aren't all sky.
  const nonSky = await page.evaluate(() => {
    const c = document.querySelector('#viewport canvas') as HTMLCanvasElement;
    const tmp = document.createElement('canvas');
    tmp.width = c.width;
    tmp.height = c.height;
    const ctx = tmp.getContext('2d')!;
    ctx.drawImage(c, 0, 0);
    const d = ctx.getImageData(0, Math.floor(c.height * 0.75), c.width, 1).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (!(d[i + 2] > 200 && d[i] < 170)) n++;
    return n / (d.length / 4);
  });
  expect(nonSky).toBeGreaterThan(0.5);
  await shot(page, '01-world');

  // 2. Place and break a block through the normal item-use path.
  await lookDown(page);
  const placed = await page.evaluate(() => {
    const g = window.__game!;
    g.player.creative = true;
    const t = g.debugTarget()!;
    g.inventory.slots[0] = { id: 'brick', count: 4 };
    g.inventory.selected = 0;
    // Place on the side of the block under us by looking slightly forward instead.
    g.player.pitch = -1.0;
    const t2 = g.debugTarget()!;
    g.debugUseHeld();
    return { t, t2 };
  });
  expect(placed.t.kind).toBe('block');
  const brick = await page.evaluate(() => {
    const g = window.__game!;
    // Find the brick we placed near the targeted block.
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 3; dy++)
        for (let dz = -3; dz <= 2; dz++) {
          const p = g.player.position;
          const x = Math.floor(p.x) + dx,
            y = Math.floor(p.y) + dy,
            z = Math.floor(p.z) + dz;
          if (g.world.getBlock(x, y, z) === 13) return [x, y, z];
        }
    return null;
  });
  expect(brick).not.toBeNull();
  const broken = await page.evaluate(([x, y, z]) => {
    const g = window.__game!;
    g.breakBlock(x, y, z, false);
    return g.world.getBlock(x, y, z);
  }, brick!);
  expect(broken).toBe(0);

  // 3. Tether: hold a crate next to another one and join them into one body.
  const joined = await page.evaluate(async () => {
    const g = window.__game!;
    g.player.flying = true;
    g.player.pitch = 0;
    g.player.yaw = 0;
    const eye = g.player.eye();
    const look = g.player.look();
    const anchor = eye.clone().addScaledVector(look, 3);
    anchor.x += 1.0; // beside the held crate (we look along -Z)
    const a = g.contraptions.spawn('crate', anchor);
    a.body.setGravityScale(0, true);
    const b = g.contraptions.spawn('crate', eye.clone().addScaledVector(look, 3));
    g.tether.grab(b, b.parts[0], b.position, 3, g.player.yaw);
    // Wait (up to 8 s, software WebGL is slow) for the held crate to reach the other one.
    for (let i = 0; i < 80 && !g.tether.candidate; i++) await new Promise((r) => setTimeout(r, 100));
    const hadCandidate = !!g.tether.candidate;
    const merged = g.tether.join();
    return { hadCandidate, parts: merged?.parts.length ?? 0, contraptions: g.contraptions.list.length };
  });
  expect(joined.hadCandidate).toBe(true);
  expect(joined.parts).toBe(2);
  expect(joined.contraptions).toBe(1);
  await shot(page, '02-joined');

  // 4. Bind a rock onto a stick at the Workbench.
  const hammer = await page.evaluate(async () => {
    const g = window.__game!;
    g.inventory.slots[1] = { id: 'stick', count: 1 };
    g.inventory.selected = 1;
    g.inventory.add({ id: 'rock', count: 1 });
    g.screens.show('workbench');
    return true;
  });
  expect(hammer).toBe(true);
  await page.getByRole('button', { name: /^Rock ×/ }).click();
  await page.getByRole('button', { name: 'Bind', exact: true }).click();
  await shot(page, '03-workbench');
  const stick = await page.evaluate(() => window.__game!.inventory.slots[1]);
  expect(stick?.data?.fuse).toBe('rock');
  await page.evaluate(() => window.__game!.screens.hide());

  // 5. Import a photo through the gallery's file input, turn it into a frame and hang it.
  await page.evaluate(() => window.__game!.screens.show('gallery'));
  await page
    .getByTestId('photo-input')
    .setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: gradientPng(160, 100) });
  await expect(page.locator('.photo-card')).toHaveCount(1, { timeout: 10_000 });
  await page.getByRole('button', { name: /Frame 2×/ }).click();
  await shot(page, '04-gallery');
  await page.evaluate(() => window.__game!.screens.hide());
  const frame = await page.evaluate(async () => {
    const g = window.__game!;
    const slot = g.inventory.slots.findIndex((s) => s?.id === 'photo_frame');
    g.inventory.swap(slot, 2);
    g.inventory.selected = 2;
    g.player.flying = false;
    g.player.pitch = -Math.PI / 2 + 0.02;
    const kind = g.debugUseHeld();
    await new Promise((r) => setTimeout(r, 1000));
    const f = g.photos.frameList[0];
    return { kind, count: g.photos.frameList.length, photoId: f?.photoId, ny: f?.ny };
  });
  expect(frame.kind).toBe('block');
  expect(frame.count).toBe(1);
  expect(frame.photoId).toBeTruthy();
  expect(frame.ny).toBe(1);
  await page.evaluate(() => {
    const g = window.__game!;
    g.player.pitch = -0.9;
  });
  await page.waitForTimeout(500);
  await shot(page, '05-frame');

  // 6. Save, reload, reopen the world and check everything persisted.
  const before = await page.evaluate(async () => {
    const g = window.__game!;
    await g.save();
    return {
      id: g.meta.id,
      frames: g.photos.frameList.length,
      parts: g.contraptions.partCount,
      fuse: g.inventory.slots[1]?.data?.fuse,
    };
  });
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    const g = window.__game!;
    return {
      id: g.meta.id,
      frames: g.photos.frameList.length,
      parts: g.contraptions.partCount,
      fuse: g.inventory.slots[1]?.data?.fuse,
    };
  });
  expect(after).toEqual(before);
  await shot(page, '06-reloaded');

  expect(errors).toEqual([]);
});
