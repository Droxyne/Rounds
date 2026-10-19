import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { buildWeapon } from './weapons.js';
import { getWeapon } from './data.js';
import { machinedBox } from './geometry.js';
export function buildOperator(scene, mats, shadows, position, passive = false) {
  const root = new TransformNode('operator', scene); root.position.copyFrom(position);
  const actor = { root, health: 100, dead: false, passive, state: 'patrol', nextShot: 1.5, think: 0, path: [], lastKnown: null, awareness: 0, hitTime: 0, anim: Math.random() * 6, deathTime: 0 };
  const pieces = [];
  function box(name, w, h, d, x, y, z, mat, head = false, parent = root) {
    const fabricLimb = ['trouser-thigh', 'trouser-shin', 'upper-arm', 'forearm'].includes(name);
    const m = fabricLimb ? MeshBuilder.CreateCapsule(name, { height: h, radius: w * .5, tessellation: 10, subdivisions: 2, capSubdivisions: 3 }, scene) : machinedBox(name, w, h, d, scene, .018);
    if (fabricLimb) m.scaling.z = d / w;
    m.position.set(x, y, z); m.material = mats[mat]; m.parent = parent; m.metadata = { actor, head }; m.receiveShadows = true; pieces.push(m); return m;
  }
  function sphere(name, size, x, y, z, mat, scale = [1, 1, 1], head = false) {
    const m = MeshBuilder.CreateSphere(name, { diameter: size, segments: 8 }, scene); m.position.set(x, y, z); m.scaling.set(...scale); m.material = mats[mat]; m.parent = root; m.metadata = { actor, head }; m.receiveShadows = true; pieces.push(m); return m;
  }
  sphere('combat-shirt', .48, 0, 1.24, 0, 'cloth', [1.06, 1.28, .65]);
  box('plate-carrier', .43, .41, .28, 0, 1.27, .035, 'olive');
  sphere('neck-gaiter', .14, 0, 1.55, .015, 'clothDark', [1, 1.2, 1]);
  box('ballistic-plate-front', .37, .32, .05, 0, 1.3, .205, 'clothDark');
  box('admin-pouch', .29, .1, .07, 0, 1.47, .23, 'olive');
  for (const x of [-.155, -.05, .055, .16]) { box('magazine-pouch', .09, .2, .07, x, 1.17, .22, 'tan'); box('pouch-flap', .088, .035, .08, x, 1.255, .225, 'olive'); }
  for (let y = 1.13; y < 1.48; y += .07) box('molle-webbing', .45, .015, .018, 0, y, -.16, 'tan');
  for (const x of [-.19, .19]) { box('shoulder-strap', .075, .075, .34, x, 1.49, .015, 'olive'); box('strap-buckle', .05, .045, .025, x, 1.43, .19, 'black'); }
  box('radio', .065, .19, .05, -.27, 1.34, .1, 'black'); box('radio-antenna', .008, .22, .008, -.27, 1.52, .1, 'metal');
  box('backpack', .29, .42, .17, 0, 1.3, -.25, 'olive'); box('medical-pouch', .18, .14, .09, .28, 1.02, -.03, 'tan');
  box('belt', .43, .07, .29, 0, .96, 0, 'black'); box('buckle', .07, .045, .026, 0, .96, .16, 'steel');
  sphere('balaclava', .24, 0, 1.68, .01, 'clothDark', [1, 1.2, .92], true);
  sphere('ballistic-helmet', .32, 0, 1.8, -.015, 'olive', [1, .77, 1.04], true);
  box('helmet-front-mount', .065, .08, .045, 0, 1.82, .153, 'black', true);
  box('eye-opening', .19, .045, .032, 0, 1.722, .116, 'skin', true);
  box('ballistic-goggles', .22, .067, .034, 0, 1.743, .145, 'black', true);
  for (const x of [-.057, .057]) box('goggle-lens', .089, .043, .008, x, 1.745, .166, 'glass', true);
  for (const x of [-.16, .16]) { box('comms-earcup', .045, .12, .09, x, 1.69, -.005, 'black', true); box('helmet-rail', .03, .05, .16, x, 1.79, -.02, 'tan', true); }
  box('flag-patch', .095, .047, .008, .075, 1.82, -.159, 'tan', true);
  actor.legs = [];
  for (const side of [-1, 1]) {
    const leg = new TransformNode('leg', scene); leg.parent = root; leg.position.set(side * .12, .94, 0); actor.legs.push(leg);
    box('trouser-thigh', .18, .39, .22, 0, -.21, 0, 'cloth', false, leg);
    box('trouser-shin', .145, .39, .17, 0, -.6, -.015, 'cloth', false, leg);
    box('knee-pad', .155, .16, .05, 0, -.43, .12, 'black', false, leg);
    box('combat-boot', .17, .16, .31, 0, -.86, .045, 'black', false, leg);
    box('boot-sole', .175, .028, .32, 0, -.934, .045, 'metal', false, leg);
    box('cargo-pocket', .046, .17, .15, side * .105, -.23, -.005, 'olive', false, leg);
    const upper = box('upper-arm', .17, .32, .17, side * .29, 1.32, .05, 'cloth'); upper.rotation.x = -.35; upper.rotation.z = side * .2;
    const lower = box('forearm', .135, .28, .14, side * .24, 1.16, .22, 'cloth'); lower.rotation.x = -1.1; lower.rotation.z = side * .35;
    sphere('glove', .12, side * .18, 1.14, .35, 'black', [1, .85, 1.2]);
    for (let f = 0; f < 3; f++) box('glove-knuckle', .023, .018, .03, side * .18 + (f - 1) * .028, 1.185, .39, 'metal');
  }
  const weapon = buildWeapon(scene, mats, getWeapon('m4')); weapon.root.parent = root; weapon.root.position.set(.11, 1.17, .32); weapon.root.rotation.x = -.06; actor.weapon = weapon;
  // Batch rigid components by limb, material and damage zone.
  const groups = new Map();
  for (const m of pieces) { const k = m.parent.uniqueId + '-' + m.material.name + '-' + m.metadata.head; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
  for (const group of groups.values()) {
    const parent = group[0].parent, metadata = group[0].metadata;
    // Merge in local space so limb transforms remain animatable.
    for (const m of group) m.parent = null;
    const merged = group.length > 1 ? Mesh.MergeMeshes(group, true, true) : group[0];
    merged.parent = parent; merged.metadata = metadata; merged.receiveShadows = true; shadows?.addShadowCaster(merged);
  }
  for (const p of weapon.parts) shadows?.addShadowCaster(p);
  return actor;
}
export class Director {
  constructor(game) { this.game = game; this.actors = []; this.wave = 0; this.waveDelay = 0; this.shots = 0; this.hits = 0; this.kills = 0; }
  clear() { for (const a of this.actors) a.root.dispose(false); this.actors = []; this.wave = 0; this.waveDelay = 0; this.shots = this.hits = this.kills = 0; }
  spawnWave() {
    const g = this.game; this.wave++; this.waveDelay = 0;
    // Remove corpses between waves so long deployments don't accumulate geometry.
    this.actors.filter(a => a.dead).forEach(a => a.root.dispose(false)); this.actors = this.actors.filter(a => !a.dead);
    const count = Math.min(9, 2 + this.wave), points = [ [-4, 12], [4, 24], [-7, 30], [9, 44], [-3, 40], [12, 25], [-10, 38], [6, 8], [-9, 14] ];
    for (let i = 0; i < count; i++) {
      const [x, z] = points[(i + this.wave - 1) % points.length]; let p = new Vector3(x, 0, z);
      if (Vector3.Distance(p, g.player.position) < 7) p = new Vector3(i % 2 ? 3 : -3, 0, 44);
      const actor = buildOperator(g.scene, g.mats, g.shadow, p); actor.root.rotation.y = Math.PI; actor.home = p.clone(); actor.nextShot = 1.7 + i * .2; actor.think = i * .15; this.actors.push(actor);
    }
    g.ui.announce('WAVE ' + String(this.wave).padStart(2, '0'), count + ' HOSTILES · CLEAR THE FACILITY');
  }
  training() {
    this.clear();
    for (const [x, z] of [[-13, 12], [12, 20]]) { const a = buildOperator(this.game.scene, this.game.mats, this.game.shadow, new Vector3(x, 0, z), true); a.root.rotation.y = Math.PI; a.home = a.root.position.clone(); this.actors.push(a); }
  }
  visible(actor, player) {
    const origin = actor.root.position.add(new Vector3(0, 1.65, 0)), dest = player.add(new Vector3(0, -.1, 0)), delta = dest.subtract(origin), dist = delta.length();
    if (dist > 40) return false;
    const ray = new Ray(origin, delta.normalize(), dist);
    return !this.game.scene.pickWithRay(ray, m => m.isPickable && m.metadata?.world)?.hit;
  }
  update(dt, time) {
    const g = this.game;
    for (const a of this.actors) {
      if (a.dead) {
        a.deathTime += dt; a.root.rotation.z += (1.5 - a.root.rotation.z) * Math.min(1, dt * 7); a.root.position.y += (.18 - a.root.position.y) * Math.min(1, dt * 7);
        if (a.passive && a.deathTime > 4) { a.health = 100; a.dead = false; a.root.rotation.z = 0; a.root.position.copyFrom(a.home); a.root.getChildMeshes().forEach(m => { if (m.metadata?.actor) m.isPickable = true; }); }
        continue;
      }
      a.hitTime = Math.max(0, a.hitTime - dt); a.weapon.flash.setEnabled(a.flashUntil > time);
      if (a.passive) continue;
      a.think -= dt; a.nextShot -= dt;
      const distance = Vector3.Distance(a.root.position, g.player.position);
      if (a.think <= 0) {
        a.think = .35 + Math.random() * .15;
        a.canSee = this.visible(a, g.player.position);
        if (a.canSee) { a.lastKnown = g.player.position.clone(); a.awareness = Math.min(1, a.awareness + .3); }
        else a.awareness = Math.max(0, a.awareness - .08);
        if (a.canSee && a.awareness > .4) {
          if (a.hitTime > 0 || a.health < 45) {
            a.state = 'cover'; const cover = g.world.cover.filter(p => { if (Vector3.Distance(p, a.root.position) >= 12) return false; const eye = p.add(new Vector3(0, 1.1, 0)); const delta = g.player.position.subtract(eye); return g.scene.pickWithRay(new Ray(eye, delta.normalizeToNew(), delta.length()), m => m.isPickable && m.metadata?.world)?.hit; }).sort((p, q) => Vector3.Distance(p, a.root.position) - Vector3.Distance(q, a.root.position));
            a.destination = cover[0] || a.root.position;
          } else if (distance > 13 || Math.sin(time * .5 + a.anim) > .65) {
            a.state = 'flank'; const side = a.anim > 3 ? -1 : 1; a.destination = g.player.position.add(new Vector3(side * 4, -g.player.position.y, 5));
          } else { a.state = 'engage'; a.destination = a.root.position; }
        } else if (a.lastKnown) { a.state = 'search'; a.destination = a.lastKnown; }
        else { a.state = 'patrol'; if (!a.destination || Vector3.Distance(a.root.position, a.destination) < 1) a.destination = a.home.add(new Vector3(Math.sin(time + a.anim) * 4, 0, Math.cos(time + a.anim) * 4)); }
        if (a.destination && !g.world.blocked(a.destination.x, a.destination.z) && a.state !== 'engage') a.path = g.world.path(a.root.position, a.destination);
      }
      let moving = false;
      if (a.path.length && a.state !== 'engage') {
        const delta = a.path[0].subtract(a.root.position); delta.y = 0; const dist = delta.length();
        if (dist < .3) a.path.shift(); else { delta.normalize(); const speed = a.state === 'patrol' ? 1.1 : 2.1; g.world.move(a.root.position, delta.x * dt * speed, delta.z * dt * speed, .35); moving = true; if (!a.canSee) a.root.rotation.y = Math.atan2(delta.x, delta.z); }
      }
      if (a.canSee) {
        const delta = g.player.position.subtract(a.root.position); a.root.rotation.y = Math.atan2(delta.x, delta.z);
        if (a.nextShot <= 0 && a.awareness > .5) {
          a.nextShot = .55 + Math.random() * .55 - Math.min(.25, this.wave * .025);
          const muzzle = a.weapon.muzzle.getAbsolutePosition(); a.flashUntil = time + .06;
          g.audio.shot(getWeapon('m4'), false, muzzle); g.tracer(muzzle, g.player.position.add(new Vector3((Math.random() - .5) * .7, -.12, (Math.random() - .5) * .7)), true);
          if (Math.random() < Math.max(.2, .68 - distance * .012) && a.hitTime <= 0) g.hurt(8 + Math.floor(Math.random() * 7));
        }
      }
      a.anim += dt * (moving ? 9 : 1); a.legs[0].rotation.x = moving ? Math.sin(a.anim) * .43 : 0; a.legs[1].rotation.x = -a.legs[0].rotation.x;
    }
    if (g.mode === 'deployment' && this.wave && !this.actors.some(a => !a.dead)) {
      if (this.waveDelay === 0) {
        const accuracy = this.shots ? Math.round(this.hits / this.shots * 100) : 0, bonus = 350 + this.wave * 100 + (accuracy >= 60 ? 200 : 0);
        g.store.earn(bonus); g.player.health = Math.min(100, g.player.health + 35); g.player.grenades = Math.min(3, g.player.grenades + 1); g.reserve = Math.max(g.reserve, g.weapon.magazine * 5);
        g.store.data.bestWave = Math.max(g.store.data.bestWave, this.wave); g.store.save();
        g.ui.announce('SECTOR SECURED', '+$' + bonus + ' · ' + accuracy + '% ACCURACY · NEXT WAVE IN 8s'); this.waveDelay = 8;
      } else { this.waveDelay -= dt; if (this.waveDelay <= 0) this.spawnWave(); }
    }
  }
}
