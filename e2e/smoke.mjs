// Smoke test: serve the production build, load it in Chromium, check for errors,
// frame budgets, camera modes, and save screenshots to e2e/out/.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node-tools/node_modules/playwright']) {
    if (!id) continue;
    try { return require(id); } catch {}
  }
  throw new Error('Playwright not found: npm i -D playwright, or set PLAYWRIGHT_PATH');
}
const { chromium, devices } = loadPlaywright();
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'e2e/out';
mkdirSync(OUT, { recursive: true });
const BUDGET = { calls: 300, triangles: 500000 };

let server;
let url = process.env.SMOKE_URL;
if (!url) {
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
  url = 'http://localhost:4173/';
  // Poll until the preview server answers (its log output is colorized, so don't parse it).
  const start = Date.now();
  for (;;) {
    try { if ((await fetch(url)).ok) break; } catch {}
    if (Date.now() - start > 20000) throw new Error('preview server timeout');
    await new Promise((r) => setTimeout(r, 250));
  }
}

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function openPage(contextOpts) {
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => window.__pelican?.ready, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  return { context, page, errors };
}

const stats = (page) => page.evaluate(() => {
  const { renderer, mode } = window.__pelican;
  const r = renderer.info.render;
  return { calls: r.calls, triangles: r.triangles, mode };
});

try {
  // Desktop
  const { page, errors } = await openPage({ viewport: { width: 1280, height: 800 } });
  const s = await stats(page);
  console.log('desktop stats', s);
  check(s.calls < BUDGET.calls, `draw calls ${s.calls} < ${BUDGET.calls}`);
  check(s.triangles < BUDGET.triangles, `triangles ${s.triangles} < ${BUDGET.triangles}`);
  check(s.mode === 'free', `desktop starts in free mode (got ${s.mode})`);
  await page.screenshot({ path: `${OUT}/desktop.png` });

  if (process.env.SMOKE_PELICAN !== '0') {
    const hasRider = await page.evaluate(() => !!window.__pelican.rider);
    if (hasRider) {
      await page.evaluate(() => window.__pelican.closeUp?.());
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/pelican.png` });
      await page.evaluate(() => window.__pelican.closeUp?.(false));
    }
  }

  const hasFollow = await page.evaluate(() => typeof window.__pelican.setMode === 'function');
  if (hasFollow) {
    await page.mouse.click(640, 400);
    await page.keyboard.press('f');
    await page.waitForTimeout(1500);
    const f = await stats(page);
    check(f.mode === 'follow', `F switches to follow (got ${f.mode})`);
    await page.screenshot({ path: `${OUT}/follow.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check((await stats(page)).mode === 'free', 'Esc returns to free roam');
  }

  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(300);
  const cw = await page.evaluate(() => document.getElementById('scene').clientWidth);
  check(cw === 800, `canvas follows resize (clientWidth ${cw})`);
  check(errors.length === 0, `no console errors on desktop ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);

  // Mobile
  if (hasFollow) {
    const m = await openPage({ ...devices['iPhone 13'] });
    const ms = await stats(m.page);
    check(ms.mode === 'follow', `touch device starts in follow (got ${ms.mode})`);
    const hudHidden = await m.page.evaluate(() => {
      const el = document.querySelector('.hud-card');
      return !el || getComputedStyle(el).display === 'none';
    });
    check(hudHidden, 'controls card hidden on touch');
    await m.page.screenshot({ path: `${OUT}/mobile.png` });
    check(m.errors.length === 0, `no console errors on mobile ${m.errors.length ? JSON.stringify(m.errors.slice(0, 3)) : ''}`);
  }
} finally {
  await browser.close();
  server?.kill();
}

if (failures.length) { console.error(`\n${failures.length} smoke check(s) failed`); process.exit(1); }
console.log('\nsmoke: all checks passed');
