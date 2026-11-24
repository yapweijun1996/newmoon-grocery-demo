// Verify a static deployment with mobile Chromium. Set BASE_URL to test another server.
const assert = require('node:assert/strict');
const path = require('node:path');
const { homedir } = require('node:os');
const { mkdir } = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || path.join(homedir(), 'workspace/Blender-3D-Gallery/node_modules/playwright'));
const base = new URL(process.env.BASE_URL || 'https://yapweijun1996.github.io/newmoon-grocery-demo/');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'evidence');
(async () => {
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch(process.platform === 'darwin' ? { headless: true, channel: 'chromium', args: ['--use-angle=metal'] } : { headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(120000);
  const errors = [], assets = new Set(), external = new Set();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => { if (/^https?:/.test(r.url())) errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', r => {
    const u = r.url();
    if (/^https?:/.test(u) && new URL(u).origin !== base.origin) external.add(u);
    if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${u}`);
    if (/\.(glb|js)(?:[?#]|$)/i.test(u)) assets.add(u);
  });
  const visit = async relative => { const r = await page.goto(new URL(relative, base).href, { waitUntil: 'domcontentloaded' }); assert.equal(r.status(), 200); };
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page overflows mobile viewport');
  try {
    await visit('./'); await noOverflow();
    assert.equal(await page.locator('a[href="./store/"]').count(), 1);
    assert.equal(await page.locator('a[href="./ar/"]').count(), 1);
    await page.screenshot({ path: path.join(out, 'landing-mobile.png'), fullPage: true });
    await visit('store/');
    await page.waitForSelector('canvas[data-products="5"][data-fixtures="2"]', { timeout: 180000 });
    await noOverflow(); await page.screenshot({ path: path.join(out, 'store-mobile.png'), fullPage: true });
    await page.click('#scanMode');
    await page.locator('#file').setInputFiles(path.join(root, 'store/tests/mock-swatches.spz'));
    await page.waitForFunction(() => document.querySelector('#view').dataset.splats === '1020', null, { timeout: 120000 });
    await visit('ar/');
    await page.waitForFunction(() => document.querySelector('#viewer')?.loaded && !document.querySelector('#activate').disabled, null, { timeout: 180000 });
    await noOverflow(); await page.screenshot({ path: path.join(out, 'ar-mobile.png'), fullPage: true });
    const items = page.locator('.item'); assert.equal(await items.count(), 6);
    for (let i = 0; i < 6; i++) {
      await items.nth(i).click();
      await page.waitForFunction(() => document.querySelector('#viewer').loaded && !document.querySelector('#activate').disabled, null, { timeout: 180000 });
      assert.equal(await items.nth(i).getAttribute('aria-pressed'), 'true');
    }
    for (const u of assets) {
      const response = await page.request.get(u); assert.equal(response.status(), 200, u);
    }
    assert.ok([...assets].filter(u => /\.glb(?:[?#]|$)/i.test(u)).length >= 8, 'expected all product and fixture models');
    assert.deepEqual([...external], []);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ base: base.href, result: 'PASS', assetCount: assets.size, assets: [...assets].sort(), external: [...external], errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
