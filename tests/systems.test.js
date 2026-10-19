import { Director } from '../src/actors.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, CATEGORIES, ATTACHMENTS, damageAtRange, killReward } from '../src/data.js';
import { Store, sanitizeSave } from '../src/store.js';
import { World } from '../src/world.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { buildWeapon } from '../src/weapons.js';
import { machinedBox } from '../src/geometry.js';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
test('arsenal contains 20 unique, valid guns across six categories', () => {
  assert.equal(WEAPONS.length, 20); assert.equal(new Set(WEAPONS.map(w => w.id)).size, 20);
  assert.equal(new Set(WEAPONS.map(w => w.category)).size, 6);
  for (const w of WEAPONS) { assert.ok(w.damage > 0 && w.rpm > 0 && w.magazine > 0 && w.reload > 0 && w.barrel > 0); assert.ok(CATEGORIES.includes(w.category)); }
  assert.equal(ATTACHMENTS.length, 6);
});
test('ballistics reward headshots and apply bounded range falloff', () => {
  for (const w of WEAPONS) {
    const near = damageAtRange(w, 2), far = damageAtRange(w, 1000), head = damageAtRange(w, 2, true);
    assert.equal(near, w.damage); assert.ok(far < near && far > 0); assert.ok(head >= near * 2);
  }
  assert.equal(killReward(false), 150); assert.equal(killReward(true), 250);
});
test('save migration tolerates invalid values and unknown unlocks', () => {
  const data = sanitizeSave({ cash: -500, owned: ['hacked', 'm4', 'm4'], equipped: 'hacked', settings: { fov: 999, sensitivity: 0, quality: 'broken' }, attachments: { m4: ['holo', 'holo', 'invalid'], invalid: ['scope'] } });
  assert.equal(data.cash, 0); assert.deepEqual(data.owned, ['g19', 'm4']); assert.equal(data.equipped, 'm4'); assert.equal(data.settings.fov, 110); assert.equal(data.settings.sensitivity, .3); assert.equal(data.settings.quality, 'Balanced'); assert.deepEqual(data.attachments, { m4: ['holo'] });
  assert.equal(sanitizeSave(null).cash, 1200); assert.equal(sanitizeSave().settings.volume, .65);
});
test('economy prevents overspending and persists unlocks', () => {
  memory.clear(); const s = new Store(); assert.equal(s.data.cash, 1200);
  assert.equal(s.buyWeapon('awp'), false); assert.equal(s.buyWeapon('mp5'), true); assert.equal(s.data.cash, 0); assert.equal(s.buyWeapon('mp5'), false);
  s.earn(500); assert.equal(s.data.cash, 500);
  const reload = new Store(); assert.ok(reload.data.owned.includes('mp5')); assert.equal(reload.data.cash, 500);
});
test('attachments install, refund, and enforce mutually exclusive devices', () => {
  memory.clear(); const s = new Store();
  assert.equal(s.buyAttachment('awp', 'scope'), false);
  assert.equal(s.buyAttachment('m4', 'scope'), true); assert.equal(s.data.cash, 600);
  assert.equal(s.buyAttachment('m4', 'holo'), true); assert.equal(s.data.cash, 850); assert.ok(!s.data.attachments.m4.includes('scope'));
  assert.equal(s.buyAttachment('m4', 'holo'), true); assert.equal(s.data.cash, 1200);
  assert.equal(s.buyAttachment('m4', 'light'), true); assert.ok(!s.data.attachments.m4.includes('light'));
  assert.equal(s.buyAttachment('m4', 'light'), true); assert.ok(s.data.attachments.m4.includes('light'));
});
test('storage failure does not crash a game session', () => {
  const original = localStorage.setItem; localStorage.setItem = () => { throw new Error('quota'); };
  const s = new Store(); s.earn(100); assert.equal(s.available, false); localStorage.setItem = original;
});
test('A* navigation routes around cover and respects clearance', () => {
  const world = Object.create(World.prototype); world.colliders = [{ x: 0, z: 5, w: 4, d: 2, h: 3 }];
  const path = world.path(new Vector3(0, 0, 0), new Vector3(0, 0, 10));
  assert.ok(path.length > 10); assert.ok(path.some(p => Math.abs(p.x) >= 3));
  assert.ok(path.every(p => !world.blocked(p.x, p.z, .38)));
  const p = new Vector3(0, 1.7, 3.6); world.move(p, 0, 1); assert.equal(p.z, 3.6); world.move(p, 1, 0); assert.equal(p.x, 1);
  assert.ok(world.blocked(18, 0)); assert.ok(world.blocked(0, -9));
});
test('all 20 procedural weapons construct and dispose with PBR-only batches', () => {
  const engine = new NullEngine(), scene = new Scene(engine), mats = {};
  for (const name of ['black', 'metal', 'steel', 'tan', 'olive', 'wood', 'cloth', 'clothDark', 'glass', 'laser', 'flash', 'brass']) mats[name] = new PBRMaterial(name, scene);
  for (const w of WEAPONS) {
    const model = buildWeapon(scene, mats, w, ['holo', 'laser', 'light', 'compensator'], true);
    assert.ok(model.parts.length >= 4 && model.parts.length <= 13);
    assert.ok(model.muzzle.position.z > w.barrel); assert.ok(model.parts.every(m => m.material instanceof PBRMaterial));
    assert.ok(model.parts.reduce((sum, m) => sum + m.getTotalVertices(), 0) > 1000);
    model.root.dispose(false); assert.equal(scene.meshes.length, 0);
  }
  scene.dispose(); engine.dispose();
});
test('machined geometry is finite, closed, and has outward normals', () => {
  const engine = new NullEngine(), scene = new Scene(engine), mesh = machinedBox('test', 1, 2, 3, scene);
  const p = mesh.getVerticesData('position'), n = mesh.getVerticesData('normal');
  assert.equal(mesh.getTotalIndices(), 132); assert.ok(p.every(Number.isFinite));
  for (let i = 0; i < p.length; i += 3) assert.ok(p[i] * n[i] + p[i + 1] * n[i + 1] + p[i + 2] * n[i + 2] > 0);
  scene.dispose(); engine.dispose();
});

test('range targets restore their hit volumes after reset', () => {
  const mesh = { metadata: { actor: true }, isPickable: false };
  const target = { dead: true, health: 0, timer: .01, moving: false, root: { setEnabled(value) { this.enabled = value; }, getChildMeshes: () => [mesh] } };
  const world = Object.create(World.prototype); world.targets = [target]; world.update(10, .02);
  assert.equal(target.dead, false); assert.equal(target.health, 100); assert.equal(target.root.enabled, true); assert.equal(mesh.isPickable, true);
});

test('director perceives, returns fire, awards a clear and escalates waves', () => {
  const engine = new NullEngine(), scene = new Scene(engine), mats = {};
  for (const name of ['black', 'metal', 'steel', 'tan', 'olive', 'wood', 'cloth', 'clothDark', 'glass', 'laser', 'flash', 'brass', 'skin']) mats[name] = new PBRMaterial(name, scene);
  let shots = 0, damage = 0, reward = 0;
  const game = { scene, mats, shadow: null, mode: 'deployment', player: { position: new Vector3(0, 1.7, -3), health: 80, grenades: 1 },
    audio: { shot: () => shots++ }, tracer: () => {}, hurt: n => damage += n, ui: { announce: () => {} },
    world: { blocked: () => false, path: () => [], cover: [], move: () => {} },
    store: { earn: n => reward += n, data: { bestWave: 0 }, save: () => {} }, weapon: WEAPONS[8], reserve: 0 };
  const director = new Director(game); const originalRandom = Math.random; Math.random = () => .25;
  try {
    director.spawnWave(); assert.equal(director.wave, 1); assert.equal(director.actors.length, 3);
    director.actors.forEach(a => a.root.position.set(0, 0, 6));
    for (let i = 0; i < 70; i++) director.update(.1, i * .1);
    assert.ok(shots > 0); assert.ok(damage > 0); assert.ok(director.actors.every(a => a.awareness > .5));
    director.shots = 10; director.hits = 7; director.actors.forEach(a => a.dead = true);
    director.update(.1, 8); assert.equal(reward, 650); assert.equal(director.waveDelay, 8); assert.equal(game.store.data.bestWave, 1); assert.equal(game.reserve, 150);
    director.update(8.1, 16.1); assert.equal(director.wave, 2); assert.equal(director.actors.length, 4);
    director.clear(); assert.equal(scene.meshes.length, 0);
  } finally { Math.random = originalRandom; scene.dispose(); engine.dispose(); }
});
