import { expect, test } from '@playwright/test';

test('broken blocks drop where they were, and walking over them picks them up', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('new-world').click();
  await page.getByTestId('world-name').fill('Drops');
  await page.getByTestId('world-seed').fill('424242');
  await page.getByTestId('create-world').click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  // A stone floor around the player; a brick is placed and broken a few blocks away.
  const p = await page.evaluate(() => {
    const g = window.__game!;
    const w = g.world;
    const x = Math.floor(g.player.position.x);
    const z = Math.floor(g.player.position.z);
    const y = Math.floor(g.player.position.y) + 3;
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -6; dz <= 3; dz++) {
        w.setBlock(x + dx, y - 1, z + dz, 3);
        for (let dy = 0; dy < 4; dy++) w.setBlock(x + dx, y + dy, z + dz, 0);
      }
    g.player.flying = false;
    g.player.teleport(x + 0.5, y, z + 0.5);
    g.inventory.slots.fill(null);
    return { x, y, z };
  });

  for (const creative of [true, false]) {
    const dropped = await page.evaluate(
      ({ x, y, z, creative }) => {
        const g = window.__game!;
        g.player.creative = creative;
        g.world.setBlock(x, y, z - 4, 13); // brick: drops one brick
        // Only what lands by the brick counts: a Puffball may drop gel elsewhere meanwhile.
        const near = () =>
          g.dropped.list.filter((d) => Math.abs(d.pos.x - (x + 0.5)) < 2 && Math.abs(d.pos.z - (z - 3.5)) < 2)
            .length;
        const before = near();
        g.breakBlock(x, y, z - 4, true);
        return {
          drops: near() - before,
          inInventory: g.inventory.slots.filter(Boolean).length,
        };
      },
      { ...p, creative },
    );
    // It lies on the ground instead of jumping straight into the inventory.
    expect(dropped).toEqual({ drops: 1, inInventory: 0 });

    // Walk over it: it's picked up.
    await page.evaluate(({ x, y, z }) => window.__game!.player.teleport(x + 0.5, y, z - 3.5), p);
    await page.waitForFunction(() => window.__game!.dropped.list.length === 0, null, { timeout: 15_000 });
    const picked = await page.evaluate(() =>
      window.__game!.inventory.slots.filter(Boolean).map((s) => s!.id),
    );
    expect(picked.length).toBe(1);
    await page.evaluate(({ x, y, z }) => {
      const g = window.__game!;
      g.inventory.slots.fill(null);
      g.player.teleport(x + 0.5, y, z + 0.5);
    }, p);
  }
  expect(errors).toEqual([]);
});
