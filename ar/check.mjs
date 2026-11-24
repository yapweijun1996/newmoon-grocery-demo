// Run with the repository served on localhost; no native AR session is simulated as a device test.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || homedir()+'/workspace/Blender-3D-Gallery/node_modules/playwright');
const url = process.env.AR_URL || 'http://127.0.0.1:8921/ar/';
const out = fileURLToPath(new URL('./screenshots/',import.meta.url));await mkdir(out,{recursive:true});
const browser = await chromium.launch(process.env.SOFTWARE_GL ? {headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']} : {headless:true,channel:'chromium',args:['--enable-webgl','--ignore-gpu-blocklist']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(120000);
  const errors=[],network=new Set();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){console.error(m.text());errors.push(m.text());}});page.on('response',r=>{network.add(r.url());if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#viewer')?.loaded && !document.querySelector('#activate').disabled,{},{timeout:180000});
  const items=page.locator('.item'),viewer=page.locator('#viewer');assert.equal(await items.count(),6);
  async function geometry() {return viewer.evaluate(v=>({src:v.src,dim:v.getDimensions().toArray?.()||{x:v.getDimensions().x,y:v.getDimensions().y,z:v.getDimensions().z},ar:v.canActivateAR}));}
  async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.equal(await viewer.getAttribute('ar-modes'),'webxr scene-viewer quick-look');assert.equal(await viewer.getAttribute('ios-src'),null);
  assert.equal(await viewer.evaluate(v=>v.autoRotate),true);
  await page.getByRole('button',{name:'Pause rotation'}).click();assert.equal(await viewer.evaluate(v=>v.autoRotate),false);
  await viewer.evaluate(v=>{v.resetTurntableRotation();v.jumpCameraToGoal();});await page.waitForTimeout(350);
  await noOverflow();await page.screenshot({path:out+'room-desktop.png',fullPage:true});
  for(let i=0;i<6;i++){
    await items.nth(i).click();await page.waitForFunction(()=>document.querySelector('#viewer').loaded && !document.querySelector('#activate').disabled);assert.equal(await items.nth(i).getAttribute('aria-pressed'),'true');const {dim,src}=await geometry();assert.ok(dim.y>0);console.log(src,dim);
  }
  assert.ok(Array.from(network).some(u=>u.endsWith('draco_decoder.wasm')));
  assert.ok(Array.from(network).some(u=>u.endsWith('draco_wasm_wrapper.js')));
  assert.deepEqual(Array.from(network).filter(u=>/^https?:/.test(u)&&new URL(u).origin!==new URL(url).origin),[]);
  await page.setViewportSize({width:390,height:844});await items.nth(4).click();await page.waitForFunction(()=>document.querySelector('#viewer').loaded && !document.querySelector('#activate').disabled);await page.evaluate(()=>scrollTo(0,0));await noOverflow();await page.waitForTimeout(450);await page.screenshot({path:out+'room-mobile.png',fullPage:true});
  await page.locator('#activate').click();assert.ok(await page.locator('dialog').isVisible());assert.match(await page.locator('dialog h2').innerText(),/Open on your phone/);await page.screenshot({path:out+'ar-unsupported.png'});await page.getByRole('link',{name:'Go to poster QR'}).click();assert.ok(page.url().endsWith('#poster'));assert.equal(await page.locator('dialog').isVisible(),false);assert.equal(await page.locator('#qr-link').getAttribute('href'),new URL(url).origin+new URL(url).pathname);assert.ok(await page.locator('#qrcode svg path').count());
  // Dispatch-only check of the supported branch; not evidence of native AR support.
  await viewer.evaluate(v=>{Object.defineProperty(v,'canActivateAR',{configurable:true,value:true});v.activateAR=async()=>{v.dataset.testActivation='called';};});await page.locator('#activate').click();assert.equal(await viewer.getAttribute('data-test-activation'),'called');await viewer.evaluate(v=>v.dispatchEvent(new CustomEvent('ar-status',{detail:{status:'failed'}})));assert.match(await page.locator('dialog h2').innerText(),/could not start/);await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.setViewportSize({width:320,height:640});await noOverflow();await page.goto(new URL('?product=birds-nest-jar',url).href);await page.waitForFunction(()=>document.querySelector('#viewer').loaded);assert.equal(await page.locator('#product-name').innerText(),'Bird’s Nest Jar');assert.deepEqual(errors,[]);console.log('PASS: 6 local models, rotation, AR controls, SKU link, QR, phone/desktop layout.');
} finally {await browser.close();}
