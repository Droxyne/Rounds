import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { textPlane } from './materials.js';
export class World {
  constructor(scene, mats, shadows, mode = 'deployment') {
    this.scene = scene; this.mats = mats; this.shadows = shadows; this.mode = mode;
    this.root = new TransformNode('facility', scene); this.colliders = []; this.cover = []; this.targets = []; this.lights = []; this.labelMaterials = []; this.spawn = new Vector3(0, 1.7, -3); this.meshes = [];
    this.build(); this.mergeStatics();
  }
  box(name, x, y, z, w, h, d, mat = 'concrete', solid = false, cast = true) {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene); m.position.set(x, y, z); m.material = this.mats[mat]; m.parent = this.root; m.receiveShadows = true; m.isPickable = solid; m.metadata = { world: true }; this.meshes.push(m);
    if (cast && this.shadows) this.shadows.addShadowCaster(m);
    if (solid) this.colliders.push({ x, z, w, d, h });
    return m;
  }
  pipe(name, x, y, z, len, diameter, mat, axis = 'z') {
    const m = MeshBuilder.CreateCylinder(name, { height: len, diameter, tessellation: 10 }, this.scene); m.position.set(x, y, z); if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2; m.material = this.mats[mat]; m.parent = this.root; m.isPickable = false; m.receiveShadows = true; this.meshes.push(m); return m;
  }
  label(name, text, x, y, z, w = 3, h = .75, color = '#d4d4bd', bg = null) {
    const m = textPlane(this.scene, name, text, w, h, new Vector3(x, y, z), color, bg); m.parent = this.root; this.labelMaterials.push(m.material); return m;
  }
  crate(x, z, w = 1.8, h = 1.45, d = 1.5, military = false) {
    this.box('crate', x, h / 2, z, w, h, d, military ? 'olive' : 'wood', true);
    const material = military ? 'metal' : 'tan';
    for (const side of [-1, 1]) {
      this.box('crate-binding', x + side * w * .37, h / 2, z, .07, h + .04, d + .04, material);
      this.box('crate-corner', x, h / 2 + side * h * .43, z, w + .03, .08, d + .03, material);
      if (military) this.box('crate-latch', x + side * w * .3, h * .7, z - d / 2 - .025, .1, .16, .04, 'steel');
    }
    if (!military) { const b = this.box('crate-brace', x, h / 2, z - d / 2 - .025, w * .85, .075, .045, 'tan'); b.rotation.z = .5; }
    this.cover.push(new Vector3(x, 0, z - d / 2 - .8), new Vector3(x, 0, z + d / 2 + .8));
  }
  lamp(x, y, z, warm = false) {
    this.box('lamp-housing', x, y, z, 2.1, .12, .3, 'metal', false, false);
    this.box('lamp-tube', x, y - .075, z, 1.85, .035, .13, warm ? 'orangeGlow' : 'glow', false, false);
    const l = new PointLight('industrial-lamp', new Vector3(x, y - .3, z), this.scene); l.diffuse = Color3.FromHexString(warm ? '#edb078' : '#a3c8bd'); l.intensity = warm ? 7 : 9; l.range = 13; l.radius = .9; this.lights.push(l);
  }
  build() {
    const training = this.mode === 'training';
    this.box('wet-concrete-slab', 0, -.2, 20, 36, .4, 58, 'floor', true, false);
    this.box('left-perimeter', -18, 2.8, 20, .5, 5.6, 58, 'concrete', true);
    this.box('right-perimeter', 18, 2.8, 20, .5, 5.6, 58, 'concrete', true);
    this.box('rear-perimeter', 0, 2.8, 49, 36, 5.6, .5, 'concrete', true);
    this.box('entry-wall', 0, 2.8, -9, 36, 5.6, .5, 'concrete', true);
    this.box('ceiling', 0, 5.7, 20, 36, .25, 58, 'concrete', false, false);
    for (let z = -5; z < 49; z += 7) {
      this.box('roof-crossbeam', 0, 5.35, z, 36, .38, .23, 'metal');
      for (let x = -12; x <= 12; x += 24) {
        this.box('structural-column', x, 2.65, z, .65, 5.3, .7, 'concreteLight', true);
        this.box('column-base', x, .25, z, .85, .5, .9, 'metal');
        this.box('column-safety-paint', x, .8, z - .36, .68, .75, .02, 'yellow', false, false);
        for (let j = 0; j < 3; j++) { const stripe = this.box('warning-stripe', x, .57 + j * .23, z - .377, .7, .075, .01, 'black', false, false); stripe.rotation.z = -.22; }
      }
      this.lamp(z % 2 ? -3 : 5, 5.05, z + 1, z > 23);
    }
    for (const x of [-15.5, -15, 14.7]) { this.pipe('overhead-pipe', x, 4.85, 20, 56, x > 0 ? .18 : .28, x > 0 ? 'rust' : 'metal'); for (let z = -4; z < 49; z += 4) this.pipe('pipe-collar', x, 4.85, z, .08, x > 0 ? .23 : .34, 'steel'); }
    for (const x of [-7.5, 7.5]) this.box('floor-route-line', x, .008, 20, .055, .012, 56, 'yellow', false, false);
    for (let z = -6; z < 49; z += 3) {
      this.box('floor-joint', 0, .004, z, 35, .007, .025, 'black', false, false);
      for (const x of [-16, 16]) this.box('drain', x, .012, z, .3, .018, 1.1, 'black', false, false);
    }
    // Deterministic stains, reflective puddles and rubble.
    for (let i = 0; i < 24; i++) {
      const x = Math.sin(i * 17.23) * 15, z = (i * 7.31) % 52 - 5;
      const puddle = MeshBuilder.CreateDisc('water-stain', { radius: .5 + (i % 4) * .4, tessellation: 18 }, this.scene); puddle.rotation.x = Math.PI / 2; puddle.scaling.y = .35 + i % 3 * .2; puddle.position.set(x, .014, z); puddle.material = this.mats.water; puddle.parent = this.root; puddle.isPickable = false;
      for (let n = 0; n < 2; n++) { const rubble = this.box('debris', x + n * .2, .025, z + .7, .12, .05, .2, 'concreteLight', false, false); rubble.rotation.y = i; }
    }
    // Entry blast door and industrial fittings.
    this.box('blast-door', 0, 2.0, -8.7, 5.2, 4, .12, 'metal', true);
    for (let i = 0; i < 15; i++) this.box('door-rib', 0, .2 + i * .25, -8.58, 5.1, .045, .08, 'steel');
    this.label('exit-mark', 'SECTOR 04 / ENTRY', 0, 4.5, -8.52, 5, .5);
    for (const x of [-17.7, 17.7]) {
      for (let z = 8; z < 45; z += 14) { this.box('electrical-box', x, 1.7, z, .45, 1.3, .75, 'metal'); this.pipe('conduit', x, 3.4, z, 2.2, .04, 'steel', 'y'); }
    }
    if (!training) {
      // Staggered doorways connect three combat zones, with lateral routes for flanking.
      for (const z of [17, 34]) {
        this.box('partition-left', -10.3, 2.6, z, 15.4, 5.2, .45, 'concrete', true);
        this.box('partition-right', 10.3, 2.6, z, 15.4, 5.2, .45, 'concrete', true);
        this.box('door-lintel', 0, 4.6, z, 5.2, 1.2, .6, 'concreteLight', true);
        this.box('door-frame-l', -2.65, 2, z - .3, .18, 4, .22, 'metal'); this.box('door-frame-r', 2.65, 2, z - .3, .18, 4, .22, 'metal');
        this.label('sector-sign', z === 17 ? '02 / PROCESSING' : '03 / CONTAINMENT', 0, 4.62, z - .34, 4.4, .55);
        this.lamp(0, 3.7, z + 2, true);
      }
      // Divider islands leave routes on both sides; all cover is physically collidable.
      this.box('office-divider', 7.7, 1.5, 8, .3, 3, 6, 'concrete', true);
      this.box('office-window-frame', 7.7, 3.3, 8, .3, .15, 6, 'metal');
      for (let z = 5; z < 12; z += 1.5) this.box('window-mullion', 7.7, 2.6, z, .15, 1.5, .07, 'metal');
      this.crate(-5, 7, 2.6, 1.6, 1.8, true); this.crate(-7.8, 9.3, 2.4, 2.1, 1.8); this.crate(4.5, 12, 2, 1.25, 1.6, true);
      this.crate(-4.7, 25, 2.4, 1.35, 2, true); this.crate(6.6, 28, 3.2, 1.7, 1.6); this.crate(-11, 27, 2, 2.4, 2);
      this.crate(5, 41, 3, 1.4, 2, true); this.crate(-6, 43, 2, 2, 2);
      // Container storage bank, with ribs and hardware rather than placeholder cubes.
      for (const x of [13.9, -14.2]) {
        this.box('storage-container', x, 1.8, 40.5, 5, 3.6, 9, x > 0 ? 'olive' : 'rust', true);
        for (let z = 36.3; z < 45; z += .38) this.box('container-corrugation', x + (x > 0 ? -2.54 : 2.54), 1.8, z, .08, 3.5, .075, 'metal');
        this.label('container-id', x > 0 ? 'BL / 0792' : 'CARGO / 04', x, 2.4, 35.95, 3.4, .6, '#c1bfa8');
        for (const sx of [-1.8, 0, 1.8]) this.pipe('container-lockbar', x + sx, 1.8, 35.9, 3.3, .045, 'steel', 'y');
      }
      this.label('wall-number', '04', 11.5, 3.35, 16.74, 4, 2, '#b8b8a7');
      this.label('wall-subtitle', 'AUTHORIZED PERSONNEL ONLY', 11.5, 1.9, 16.73, 4.3, .38, '#969c8c');
      this.label('danger', 'DANGER / LIVE FIRE', -7, 2.9, 16.74, 3.6, .55, '#ccb268', '#292f2b');
      for (let i = 0; i < 4; i++) { const x = 11 + (i % 2) * 1.1, z = 0 + Math.floor(i / 2) * 1.15; this.pipe('chemical-drum', x, .62, z, 1.24, .76, 'rust', 'y'); for (let y = .2; y < 1.2; y += .7) this.pipe('drum-band', x, y, z, .045, .8, 'metal', 'y'); this.colliders.push({ x, z, w: .8, d: .8, h: 1.24 }); }
    } else {
      this.label('range-title', 'BLACKLINE / BALLISTICS LAB', 0, 4.2, 48.7, 12, 1, '#cbd2bb');
      for (const x of [-8, -4, 0, 4, 8]) {
        this.box('range-divider', x - 1.85, 1.2, 3.5, .18, 2.4, 3, 'metal', true);
        this.box('range-bench', x, .92, 3.7, 3.4, .12, .65, 'wood', true);
        this.pipe('target-track', x, 3.8, 27, 39, .045, 'steel');
        this.label('lane-number', String(x / 4 + 3).padStart(2, '0'), x, 2.8, 4.1, 1.1, .6, '#d7bd6a');
        this.makeTarget(x, 13 + Math.abs(x) * 2, x === 0 || x === 8);
      }
      for (const z of [10, 20, 30, 40]) this.label('distance-marker', z + ' METERS', -12, 2.2, z, 2, .4, '#aab5a3');
      this.crate(-7, -3, 2, 1.1, 1.4, true);
    }
  }
  makeTarget(x, z, moving) {
    const root = new TransformNode('range-target', this.scene); root.parent = this.root; root.position.set(x, 0, z);
    const target = { root, startX: x, moving, health: 100, dead: false, timer: 0, target: true };
    const shapes = [ ['target-body', .55, .78, .07, 1.45, false], ['target-head', .24, .27, .075, 1.98, true] ];
    for (const [name, width, height, depth, y, head] of shapes) {
      const m = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene); m.position.y = y; m.parent = root; m.material = this.mats.target; m.metadata = { actor: target, head }; m.isPickable = true;
      for (let r = 1; r < 4; r++) { const ring = MeshBuilder.CreateTorus('scoring-ring', { diameter: width * r / 4, thickness: .009, tessellation: 24 }, this.scene); ring.parent = root; ring.position.set(0, y, -.045); ring.rotation.x = Math.PI / 2; ring.material = this.mats.black; ring.isPickable = false; }
    }
    const support = MeshBuilder.CreateBox('target-support', { width: .035, height: 1.25, depth: .04 }, this.scene); support.parent = root; support.position.y = .65; support.material = this.mats.metal; support.isPickable = false;
    this.targets.push(target);
  }
  mergeStatics() {
    // Reduce draw calls while preserving separate raycastable and decorative groups.
    const groups = new Map();
    for (const m of this.meshes) { const key = m.material.name + (m.isPickable ? '-solid' : '-detail'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); }
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const solid = meshes[0].isPickable, material = meshes[0].material;
      for (const mesh of meshes) this.shadows?.removeShadowCaster(mesh);
      const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      if (merged) { merged.name = 'facility-' + material.name; merged.parent = this.root; merged.isPickable = solid; merged.metadata = { world: true }; merged.receiveShadows = true; this.shadows?.addShadowCaster(merged); merged.freezeWorldMatrix(); }
    }
  }
  blocked(x, z, radius = .34) {
    if (Math.abs(x) > 17.4 - radius || z < -8.4 + radius || z > 48.4 - radius) return true;
    return this.colliders.some(c => c.h > .5 && Math.abs(x - c.x) < c.w / 2 + radius && Math.abs(z - c.z) < c.d / 2 + radius);
  }
  move(position, dx, dz, radius = .34) {
    if (!this.blocked(position.x + dx, position.z, radius)) position.x += dx;
    if (!this.blocked(position.x, position.z + dz, radius)) position.z += dz;
  }
  // A* on a one-meter navigation lattice, including clearance for agents.
  path(from, to) {
    const key = (x, z) => x + ',' + z, sx = Math.round(from.x), sz = Math.round(from.z), tx = Math.round(to.x), tz = Math.round(to.z);
    const open = [{ x: sx, z: sz, g: 0, f: 0 }], seen = new Map([[key(sx, sz), 0]]); let end = null, count = 0;
    while (open.length && count++ < 1800) {
      open.sort((a, b) => b.f - a.f); const node = open.pop();
      if (Math.abs(node.x - tx) + Math.abs(node.z - tz) <= 1) { end = node; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = node.x + dx, z = node.z + dz, g = node.g + 1, k = key(x, z);
        if (this.blocked(x, z, .38) || (seen.has(k) && seen.get(k) <= g)) continue;
        seen.set(k, g); open.push({ x, z, g, f: g + Math.abs(tx - x) + Math.abs(tz - z), parent: node });
      }
    }
    const path = []; while (end?.parent) { path.unshift(new Vector3(end.x, 0, end.z)); end = end.parent; } return path;
  }
  update(time, dt) {
    for (const target of this.targets) {
      if (target.dead) { target.timer -= dt; if (target.timer <= 0) { target.dead = false; target.health = 100; target.root.setEnabled(true); target.root.getChildMeshes().forEach(m => { if (m.metadata?.actor) m.isPickable = true; }); } }
      if (target.moving) target.root.position.x = target.startX + Math.sin(time * .7) * 1.3;
    }
  }
  dispose() { this.lights.forEach(l => l.dispose()); this.root.dispose(false); this.labelMaterials.forEach(m => m.dispose(false, true)); }
}
