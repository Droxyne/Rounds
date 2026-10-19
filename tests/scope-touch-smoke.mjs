import { launchBrowser } from './browser-runtime.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(); page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem('blackline-save-v1', JSON.stringify({ settings: { quality: 'Saver', shadows: false, post: true } })));
  await page.goto(process.env.TEST_URL || 'http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.blackline?.ready);
  const snapshot = () => page.evaluate(() => window.blackline.snapshot());
  const tap = selector => page.locator(selector).tap();
  await tap('[data-mode="training"]'); await tap('[data-action="deploy"]');
  async function equip(id, category, scopeAttachment = false) {
    await tap('[data-combat="armory"]'); await tap(`[data-category="${category}"]`); await tap(`[data-weapon="${id}"]`);
    await tap('#equip-button');
    if (scopeAttachment) await tap('[data-attachment="scope"]');
    await tap('[data-action="close-panel"]');
    await page.waitForFunction(() => window.blackline.snapshot().state === 'playing');
  }
  await equip('awp', 'Marksman'); await tap('.touch-ads');
  await page.waitForFunction(() => { const s = window.blackline.snapshot(); return s.scopedADS && !s.viewmodelVisible && s.fov < .55; });
  assert.equal(await page.locator('#scope-magnification').textContent(), '4× OPTIC');
  assert.equal(await page.locator('#crosshair').isVisible(), false);
  const cdp = await context.newCDPSession(page);
  async function center(selector, id) { const b = await page.locator(selector).boundingBox(); return { id, x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
  const move = await center('#joystick', 1), left = await center('.touch-fire-left', 3), right = await center('.touch-fire', 4);
  const look = { id: 2, x: 430, y: 180 };
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [move]); move.y -= 12; await touch('touchMove', [move]);
  await touch('touchStart', [move, look]); look.x += 6; await touch('touchMove', [move, look]);
  await touch('touchStart', [move, look, left]);
  await page.waitForFunction(() => window.blackline.snapshot().ammo < 5);
  await touch('touchStart', [move, look, left, right]);
  let s = await snapshot(); assert.equal(s.pointers, 4); assert.equal(s.firing, true); assert.equal(s.scopedADS, true);
  await touch('touchEnd', [right]);
  s = await snapshot(); assert.equal(s.pointers, 3); assert.equal(s.firing, true, 'releasing right fire must not cancel held left fire');
  await touch('touchEnd', [left]);
  s = await snapshot(); assert.equal(s.firing, false); assert.equal(s.pointers, 2); assert.ok(s.moving.y > 0); assert.deepEqual(s.aimOffset, [0, 0]);
  await touch('touchEnd', []);
  await fs.mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/awp-scope-landscape.png' });
  await tap('.touch-ads');
  await page.waitForFunction(() => { const s = window.blackline.snapshot(); return !s.scopedADS && s.viewmodelVisible; });
  await tap('.touch-ads'); await page.waitForFunction(() => window.blackline.snapshot().scopedADS);
  await tap('.touch-reload'); assert.equal((await snapshot()).scopedADS, false);
  await tap('[data-action="pause"]'); assert.equal((await snapshot()).firing, false);
  await tap('[data-action="resume"]');
  assert.equal((await snapshot()).scopedADS, false);
  // The same obstruction previously affected native DMRs and installed scopes.
  for (const [id, category, attachment] of [['mk14', 'Marksman', false], ['m4', 'Assault rifles', true]]) {
    await equip(id, category, attachment); await tap('.touch-ads');
    await page.waitForFunction(() => { const s = window.blackline.snapshot(); return s.scopedADS && !s.viewmodelVisible; });
    assert.equal(await page.locator('#scope-magnification').textContent(), '2× OPTIC');
  }
  // Cancellation must clear a held left trigger as reliably as normal pointerup.
  await touch('touchStart', [left]); await touch('touchCancel', []);
  assert.equal((await snapshot()).firing, false);
  await tap('[data-combat="swap"]');
  await page.waitForFunction(() => { const s = window.blackline.snapshot(); return s.weapon === 'g19' && !s.scopedADS && s.viewmodelVisible; });
  await equip('awp', 'Marksman'); await tap('.touch-ads');
  await page.waitForFunction(() => window.blackline.snapshot().scopedADS);
  // Assert the new left button stays on-screen and clear of all other controls.
  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const button = await page.locator('.touch-fire-left').boundingBox();
    assert.ok(button.x >= 0 && button.y >= 0 && button.x + button.width < viewport.width / 2);
    const colliders = await page.locator('#joystick, .touch-left-tools button, .touch-tools button').all();
    for (const element of colliders) {
      const b = await element.boundingBox();
      const intersects = button.x < b.x + b.width && button.x + button.width > b.x && button.y < b.y + b.height && button.y + button.height > b.y;
      assert.equal(intersects, false, 'left fire button overlaps another combat control');
    }
    await page.screenshot({ path: `test-results/awp-scope-${viewport.width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: unobstructed AWP/DMR/2× ADS, optical alignment, four-pointer dual fire, independent release, cancellation, reload/pause/swap restoration, tablet/phone layouts. No application errors.');
} finally { await browser.close(); }
