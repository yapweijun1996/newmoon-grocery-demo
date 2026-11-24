// Run from a local checkout after npm ci. This starts a loopback-only static server.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    path.join(homedir(), "workspace/Blender-3D-Gallery/node_modules/playwright"),
);
const here = path.dirname(fileURLToPath(import.meta.url)),
  evidence = path.resolve(here, "../evidence");
await mkdir(evidence, { recursive: true });
const server = spawn(
  "python3",
  [
    "-u",
    "-m",
    "http.server",
    "0",
    "--bind",
    "127.0.0.1",
    "--directory",
    path.resolve(here, "../.."),
  ],
  { stdio: ["ignore", "pipe", "ignore"] },
);
const port = await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.stdout.on("data", (s) => {
    const m = s.toString().match(/port (\d+)/);
    if (m) resolve(m[1]);
  });
});
const base = `http://127.0.0.1:${port}/store/`;
let browser;
try {
  browser = await chromium.launch(
    process.platform === "darwin"
      ? { channel: "chrome", args: ["--use-angle=metal"] }
      : { args: ["--enable-unsafe-swiftshader"] },
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  const watch = (p) => p.on("pageerror", (e) => errors.push(String(e)));
  watch(page);
  const ready = async (p, count = 5) => {
    await p.waitForSelector(`canvas[data-products="${count}"][data-fixtures="2"]`, {
      timeout: 120000,
    });
    await p.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
  };
  const shot = async (p, name, fullPage = false) =>
    p.screenshot({ path: path.join(evidence, `${name}.jpg`), quality: 90, fullPage });
  await page.goto(base);
  await ready(page);
  assert.equal(await page.locator(".pin:visible").count(), 5);
  await shot(page, "01-model-store", true);
  await page.click("#walkView");
  assert.equal(await page.locator("#walkView").getAttribute("aria-pressed"), "true");
  await page.locator("#world").screenshot({ path: path.join(evidence, "07-desktop-walk.png") });
  const position = async (p) => (await p.locator("#view").getAttribute("data-camera")).split(",").map(Number);
  const start = await position(page);
  assert.equal(start[1], 1.6);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyW");
  const counter = await position(page);
  assert(counter[2] < start[2] - 0.2 && counter[2] >= 1.655, `The counter stopped forward movement: ${counter}`);
  await page.click("#reset");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(3500);
  await page.keyboard.up("KeyD");
  const wall = await position(page);
  assert(wall[0] > start[0] + 1, `Walking moved the camera: ${start} -> ${wall}`);
  assert(wall[0] <= 3.9 && wall[0] > 3.5, `The room boundary stopped the camera: ${wall}`);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowRight");
  assert(Math.abs((await position(page))[0] - wall[0]) < 0.05, "Wall remains solid");
  await page.click("#reset");
  await page.waitForTimeout(150);
  const marker = await page.locator(".pin").nth(2).boundingBox();
  const walkStage = await page.locator("#view").boundingBox();
  await page.mouse.move(walkStage.x + walkStage.width * 0.7, walkStage.y + walkStage.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(walkStage.x + walkStage.width * 0.7 + 35, walkStage.y + walkStage.height * 0.8, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert(Math.abs((await page.locator(".pin").nth(2).boundingBox()).x - marker.x) > 2, "Mouse drag changes view direction");
  await page.click("#reset");
  await page.waitForTimeout(150);
  const jarPin = await page.locator(".pin").nth(2).boundingBox();
  await page.mouse.click(jarPin.x + jarPin.width / 2, jarPin.y + jarPin.height + 40);
  assert.equal(await page.locator("#sheetBody h2").innerText(), "Bird’s Nest Jar", "Product geometry opens in walk mode");
  await page.keyboard.press("Escape");
  await page.click("#scanMode");
  assert(await page.locator("#walkView").isDisabled());
  assert.equal(await page.locator("#orbitView").getAttribute("aria-pressed"), "true");
  await page.click("#storeMode");
  const rect = async () => page.locator(".pin").first().boundingBox();
  const initial = await rect();
  const stage = await page.locator("#world").boundingBox();
  await page.mouse.move(stage.x + 90, stage.y + stage.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(stage.x + 180, stage.y + stage.height * 0.6, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  assert(Math.abs((await rect()).x - initial.x) > 2, "Orbit moved the projected label");
  await page.click("#reset");
  await page.click("#zoomIn");
  await page.click("#zoomOut");
  await page.click("#expand");
  assert(await page.locator("#world.expanded").isVisible());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // Click actual product geometry below label 01 (not the DOM hotspot).
  const box = await rect();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 20);
  await page.waitForSelector("dialog[open]");
  assert.equal(await page.locator("#sheetBody h2").innerText(), "Abalone Gift Set");
  assert.equal(
    await page.locator(".actions a").getAttribute("href"),
    "../ar/?product=abalone-can-gift-set",
  );
  await page.click("#add");
  await page.click("#add");
  assert.equal(await page.locator("#count").innerText(), "2");
  await shot(page, "02-product-card");
  await page.click("#close");
  await page.click("#basketBtn");
  assert.match(await page.locator("#sheetBody").innerText(), /Qty 2/);
  await page.click('[data-remove="0"]');
  assert.equal(await page.locator("#count").innerText(), "1");
  await page.keyboard.press("Escape");
  await page.click("#scanMode");
  assert.match(await page.locator("#sceneBadge").innerText(), /no scan/i);
  await shot(page, "03-no-scan");
  for (const ext of ["spz", "ply", "splat"]) {
    await page.locator("#file").setInputFiles(path.join(here, `mock-swatches.${ext}`));
    await page.waitForFunction(
      (ext) =>
        document.querySelector("#roomCopy").textContent.includes(`mock-swatches.${ext} · 1,020`),
      ext,
      { timeout: 60000 },
    );
  }
  await page.click("#fitScan");
  await page.click("#reset");
  await page.waitForTimeout(400);
  await shot(page, "04-splat-hybrid");
  await page.locator(".pin").last().click();
  assert.equal(await page.locator("#sheetBody h2").innerText(), "CNY Hamper Basket");
  await page.keyboard.press("Escape");
  await page.click("#unload");
  assert.match(await page.locator("#sceneBadge").innerText(), /no scan/i);
  await page.goto(base + "?splat=tests/mock-swatches.spz");
  await ready(page);
  await page.waitForSelector('canvas[data-splats="1020"]');
  assert.equal(await page.locator("#count").innerText(), "1");
  await page.goto(base + "?splat=tests/missing.spz");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("Could not open scan"),
  );
  assert.match(await page.locator("#sceneBadge").innerText(), /no scan/i);
  await page.close();
  const mobi = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  watch(mobi);
  await mobi.goto(base);
  await ready(mobi);
  assert(await mobi.evaluate(() => document.documentElement.scrollWidth === window.innerWidth));
  await shot(mobi, "05-mobile-store", true);
  await mobi.locator("#walkView").tap();
  await mobi.locator("#world").screenshot({ path: path.join(evidence, "08-mobile-walk.png") });
  assert(await mobi.locator("#joystick").isVisible());
  assert.equal(await mobi.evaluate(() => visualViewport.scale), 1);
  const touchSession = await mobi.context().newCDPSession(mobi);
  const joy = await mobi.locator("#joystick").boundingBox();
  const stageWalk = await mobi.locator("#view").boundingBox();
  const beforeTouch = await position(mobi);
  const jx = joy.x + joy.width / 2, jy = joy.y + joy.height / 2;
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: jx, y: jy, id: 0 }] });
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: jx + 30, y: jy, id: 0 }] });
  await mobi.waitForTimeout(600);
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert((await position(mobi))[0] > beforeTouch[0] + 0.1, "Touch joystick moves camera");
  const markerBefore = await mobi.locator(".pin:visible").first().boundingBox();
  const lx = stageWalk.x + stageWalk.width * 0.75, ly = stageWalk.y + stageWalk.height * 0.5;
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: lx, y: ly }] });
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: lx + 45, y: ly }] });
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await mobi.waitForTimeout(150);
  const markerAfter = await mobi.locator(".pin:visible").first().boundingBox();
  assert(Math.abs(markerAfter.x - markerBefore.x) > 2, "Touch drag changes view direction");
  await mobi.locator("#reset").tap();
  await mobi.locator(".pin:visible").first().tap();
  assert(await mobi.locator("dialog[open]").isVisible(), "Touch opens a product in walk mode");
  await mobi.keyboard.press("Escape");
  await mobi.locator("#orbitView").tap();
  await mobi.waitForTimeout(200);
  const cdp = await mobi.context().newCDPSession(mobi),
    canvas = await mobi.locator("#view").boundingBox(),
    pin = await mobi.locator(".pin").first().boundingBox();
  let x = canvas.x + 30,
    y = canvas.y + canvas.height * 0.74;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 65, y: y - 10 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await mobi.waitForTimeout(150);
  assert(
    Math.abs((await mobi.locator(".pin").first().boundingBox()).x - pin.x) > 2,
    "Touch orbit moved the projected label",
  );
  await mobi.locator("#reset").tap();
  await mobi.locator(".pin").last().tap();
  await mobi.locator("#add").tap();
  assert.equal(await mobi.locator("#count").innerText(), "1");
  await shot(mobi, "06-mobile-card");
  await mobi.close();
  const missing = await browser.newPage();
  watch(missing);
  const glb = "**/products/birds-nest-jar/model.glb";
  await missing.route(glb, (r) => r.fulfill({ status: 404, body: "" }));
  await missing.goto(base);
  await ready(missing, 4);
  await missing.locator(".pin").nth(2).click();
  assert.match(await missing.locator(".packnote").innerText(), /Placeholder carton/);
  await missing.click("#close");
  await missing.unroute(glb);
  await missing.evaluate(() => window.dispatchEvent(new Event("focus")));
  await ready(missing);
  await missing.locator(".pin").nth(2).click();
  assert.match(await missing.locator(".packnote").innerText(), /Study model/);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Walk movement, collision, mouse and touch look, joystick, product picking, mode switching; Draco fixtures and five products, orbit, zoom/reset, expanded view, basket and AR link, missing-model recovery, all three scan formats, URL and file picker, empty/error states.",
  );
} finally {
  await browser?.close();
  server.kill();
}
