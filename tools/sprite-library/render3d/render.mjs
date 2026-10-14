/**
 * Batch-render 3D models to PNGs through the dev server (npx vite --port 5173).
 * Usage: node tools/sprite-library/render3d/render.mjs <outDir> <size> <turns(comma list)> <model...>
 * Writes <outDir>/<model>_<turn>.png with a transparent background.
 */
import { chromium } from '@playwright/test';

const [outDir, size, turns, ...models] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(size), height: Number(size) } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
for (const m of models) {
  for (const t of turns.split(',')) {
    const before = errs.length;
    await page.goto(`http://localhost:5173/tools/sprite-library/render3d/?model=${m}&size=${size}&turn=${t}`);
    try {
      await page.waitForFunction(() => window.__done, null, { timeout: 30000 });
      await page.locator('canvas').screenshot({ path: `${outDir}/${m}_${t}.png`, omitBackground: true });
    } catch {
      errs.push(`${m}@${t}: did not finish`);
    }
    if (errs.length > before) errs.splice(before, 0, `-- ${m}@${t}`);
  }
}
console.log('errors:', errs.join('\n') || 'none');
await browser.close();
