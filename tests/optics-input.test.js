import test from 'node:test';
import assert from 'node:assert/strict';
import { opticMagnification, scopedFieldOfView } from '../src/optics.js';
import { FireSources } from '../src/held-input.js';
import { getWeapon } from '../src/data.js';
import { Game } from '../src/game.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

test('AWP, native DMRs and attached 2x scopes all use the optical ADS path', () => {
  assert.equal(opticMagnification(getWeapon('awp')), 4);
  for (const id of ['mk14', 'dmr']) assert.equal(opticMagnification(getWeapon(id)), 2);
  assert.equal(opticMagnification(getWeapon('m4'), ['scope']), 2);
  assert.equal(opticMagnification(getWeapon('awp'), ['scope']), 2);
  assert.equal(opticMagnification(getWeapon('m4'), ['holo']), 1);
  assert.equal(opticMagnification(getWeapon('g19')), 1);
});

test('scope magnification stays correct across the user FOV range', () => {
  for (const degrees of [65, 88, 110]) for (const zoom of [2, 4]) {
    const base = degrees * Math.PI / 180, scoped = scopedFieldOfView(base, zoom);
    assert.ok(scoped > 0 && scoped < base);
    assert.ok(Math.abs(Math.tan(base / 2) / Math.tan(scoped / 2) - zoom) < 1e-10);
  }
});

test('scope entry hides the obstructing viewmodel and exit restores it', () => {
  let visible = true, overlay = false, zoom = 0;
  const game = Object.create(Game.prototype);
  Object.assign(game, { state: 'playing', scopedADS: false, weapon: getWeapon('awp'), attachmentsFor: () => [],
    gun: { root: { setEnabled: v => visible = v, position: new Vector3(), rotation: new Vector3() } },
    ui: { setScopeView: (v, m) => { overlay = v; zoom = m; } } });
  game.setScopedADS(true); assert.equal(visible, false); assert.equal(overlay, true); assert.equal(zoom, 4);
  game.setScopedADS(false); assert.equal(visible, true); assert.equal(overlay, false);
  assert.deepEqual(game.gun.root.position.asArray(), [.235, -.245, .4]);
  game.state = 'armory'; game.setScopedADS(false); assert.equal(visible, false);
});

test('scoped ballistics follow the actual reticle camera ray, not stale free-aim offsets', () => {
  const forward = new Vector3(.2, -.1, 1).normalize();
  const game = Object.create(Game.prototype);
  Object.assign(game, { scopedADS: true, camera: { getForwardRay: () => ({ direction: forward }) }, player: { yaw: 0, pitch: 0 }, aimX: .08, aimY: .04 });
  assert.ok(Vector3.Distance(game.direction(), forward) < 1e-10);
  assert.notEqual(game.direction(), forward); // Callers may safely mutate the returned vector.
});

test('left/right/mouse fire ownership survives independent release and cancellation', () => {
  const fire = new FireSources();
  fire.set(11, true); fire.set(22, true); assert.equal(fire.active, true);
  fire.set(11, false); assert.equal(fire.active, true);
  fire.set(11, false); assert.equal(fire.active, true); // lost capture after pointerup is idempotent
  fire.set('mouse', true); fire.set(22, false); assert.equal(fire.active, true);
  fire.set('mouse', false); assert.equal(fire.active, false);
  fire.set(33, true); fire.clear(); assert.equal(fire.active, false);
});
