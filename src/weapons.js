import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { machinedBox } from './geometry.js';
// Dimensions are in meters. Every silhouette is assembled from functional components.
export function buildWeapon(scene, mats, spec, attachments = [], hands = false) {
  const root = new TransformNode('weapon-' + spec.id, scene), parts = [];
  const bodyMat = mats[spec.color || 'black'];
  function box(name, w, h, d, x, y, z, mat = bodyMat, rz = 0) {
    const m = machinedBox(name, w, h, d, scene); m.position.set(x, y, z); m.rotation.z = rz; m.material = mat; m.parent = root; m.isPickable = false; parts.push(m); return m;
  }
  function cylinder(name, length, diameter, x, y, z, mat = mats.black, along = 'z', tessellation = 12) {
    const m = MeshBuilder.CreateCylinder(name, { height: length, diameter, tessellation }, scene); m.position.set(x, y, z); if (along === 'z') m.rotation.x = Math.PI / 2; if (along === 'x') m.rotation.z = Math.PI / 2; m.material = mat; m.parent = root; m.isPickable = false; parts.push(m); return m;
  }
  const pistol = ['pistol', 'revolver'].includes(spec.style), shotgun = ['pump', 'shotgun', 'double'].includes(spec.style), bullpup = spec.style === 'bullpup';
  const length = spec.barrel, receiver = pistol ? .19 : spec.style === 'vector' ? .23 : .34;
  box('upper-receiver', pistol ? .045 : .075, pistol ? .054 : .09, receiver, 0, 0, 0);
  box('lower-receiver', .068, .07, receiver * .8, 0, -.06, -.025);
  box('receiver-seam', .078, .008, receiver * .9, 0, -.03, 0, mats.metal);
  cylinder('barrel', length, pistol ? .022 : .025, 0, .004, length / 2 + .065, mats.steel);
  const end = length + .065;
  cylinder('muzzle-crown', .035, .035, 0, .004, end, mats.black);
  cylinder('bore', .002, .018, 0, .004, end + .019, mats.clothDark);
  if (spec.style === 'revolver') { cylinder('revolver-cylinder', .08, .077, 0, -.012, -.028, mats.steel); for (let i = 0; i < 6; i++) cylinder('cylinder-fluting', .085, .013, Math.sin(i * Math.PI / 3) * .032, -.012 + Math.cos(i * Math.PI / 3) * .032, -.028, mats.black); }
  if (!pistol) {
    const handguardLength = length * (shotgun ? .45 : .72);
    box('handguard', .085, .085, handguardLength, 0, -.002, .15 + handguardLength / 2, shotgun ? mats.black : bodyMat);
    for (let i = 0; i < Math.floor(handguardLength / .036); i++) {
      const z = .16 + i * .036;
      box('m-lok-left', .003, .018, .022, -.044, .004, z, mats.clothDark);
      box('m-lok-right', .003, .018, .022, .044, .004, z, mats.clothDark);
      box('bottom-rail', .055, .009, .011, 0, -.048, z, mats.metal);
    }
    if (shotgun) { cylinder('magazine-tube', length * .85, .029, 0, -.048, length / 2 + .04, mats.metal); for (let i = 0; i < 7; i++) box('pump-rib', .091, .006, .008, 0, -.045, .19 + i * .018, mats.metal); }
    if (spec.style === 'double') cylinder('second-barrel', length, .031, .034, .004, length / 2 + .065, mats.steel);
    if (spec.style === 'ak') cylinder('gas-tube', length * .65, .021, 0, .046, length * .48 + .08, mats.metal);
    if (spec.style === 'vector') box('recoil-housing', .077, .22, .12, 0, -.14, .1);
    if (spec.style === 'sniper') { cylinder('bolt-handle', .1, .012, .067, -.015, -.11, mats.steel, 'x'); cylinder('bolt-knob', .024, .033, .11, -.015, -.11, mats.black, 'x'); }
    if (spec.style === 'lmg') { box('feed-cover', .1, .04, .21, 0, .067, -.02, mats.metal); cylinder('carry-handle', .14, .018, .06, .13, .03, mats.black); for (let i = 0; i < 7; i++) cylinder('belt-round', .06, .012, -.075 - i * .012, -.04 - i * .006, -.02, mats.brass); }
  }
  // Grip, trigger guard, trigger and fire control group.
  const grip = box('pistol-grip', .049, pistol ? .13 : .125, .067, 0, -.122, -.085, mats.black); grip.rotation.x = -.23;
  for (let i = 0; i < 5; i++) box('grip-stipple', .051, .006, .058, 0, -.08 - i * .019, -.09, mats.metal);
  box('trigger-guard-bottom', .017, .009, .076, 0, -.117, .01, mats.metal);
  box('trigger-guard-front', .017, .055, .008, 0, -.089, .045, mats.metal);
  const trigger = box('trigger', .009, .033, .008, 0, -.082, .009, mats.steel); trigger.rotation.x = .2;
  box('ejection-port', .003, .031, pistol ? .04 : .08, .039, .002, .025, mats.clothDark);
  box('bolt', .005, .014, .045, .042, .004, .03, mats.steel);
  cylinder('selector', .008, .021, -.041, -.052, -.08, mats.steel, 'x');
  for (let i = 0; i < 3; i++) cylinder('receiver-pin', .08, .008, 0, -.025, -.1 + i * .08, mats.steel, 'x', 8);
  if (pistol) { for (let i = 0; i < 7; i++) box('slide-serration', .048, .003, .004, 0, .028, -.077 + i * .009, mats.steel); }
  else if (!shotgun) {
    const mz = bullpup ? -.19 : spec.magazineShape === 'grip' ? -.08 : .035;
    if (spec.magazineShape === 'box') box('ammo-box', .15, .16, .17, 0, -.17, .02, mats.olive);
    else {
      const mag = box('magazine-upper', .057, .15, .085, 0, -.16, mz, mats.metal); mag.rotation.x = spec.magazineShape === 'curved' ? -.15 : .08;
      const bottom = box('magazine-base', .06, .09, .085, 0, -.26, mz + (spec.magazineShape === 'curved' ? .035 : -.012), mats.black); bottom.rotation.x = spec.magazineShape === 'curved' ? -.38 : .08;
      for (let i = 0; i < 3; i++) box('magazine-rib', .06, .13, .006, 0, -.16, mz - .027 + i * .027, mats.black);
    }
  }
  if (!pistol && spec.stock !== 'none') {
    cylinder('buffer-tube', .21, .028, 0, -.014, -.25, mats.metal);
    if (spec.stock === 'wire') { box('wire-stock-left', .012, .018, .22, -.03, -.02, -.29, mats.steel); box('wire-stock-right', .012, .018, .22, .03, -.02, -.29, mats.steel); }
    else { box('stock-cheek', .067, .065, bullpup ? .24 : .17, 0, -.015, -.3); const lower = box('stock-body', .062, .085, .14, 0, -.063, -.34); lower.rotation.x = -.15; }
    box('butt-pad', .077, .15, .027, 0, -.045, -.405, mats.black);
  }
  for (let i = 0; i < (pistol ? 0 : 15); i++) box('picatinny', .044, .013, .008, 0, .052, -.13 + i * .025, mats.metal);
  box('rear-sight', .04, .026, .015, 0, pistol ? .04 : .075, -.085, mats.black);
  box('front-sight', .025, .042, .013, 0, pistol ? .043 : .083, end - .07, mats.black);
  const hasScope = attachments.includes('scope') || ['sniper', 'dmr'].includes(spec.style);
  if (hasScope) {
    box('scope-mount', .04, .045, .1, 0, .083, -.025, mats.metal);
    cylinder('scope-tube', .24, .049, 0, .125, -.015, mats.black);
    cylinder('objective', .065, .07, 0, .125, .095, mats.black);
    cylinder('objective-glass', .002, .059, 0, .125, .129, mats.glass);
    cylinder('eyepiece', .045, .06, 0, .125, -.145, mats.black);
    cylinder('elevation-turret', .03, .033, 0, .16, -.01, mats.black, 'y');
  } else if (attachments.includes('holo') || spec.optic) {
    box('holo-base', .06, .025, .095, 0, .072, -.025, mats.metal);
    box('holo-left', .009, .06, .03, -.026, .11, -.025, mats.black);
    box('holo-right', .009, .06, .03, .026, .11, -.025, mats.black);
    box('holo-top', .061, .009, .03, 0, .14, -.025, mats.black);
    box('holo-glass', .043, .044, .002, 0, .11, -.025, mats.glass);
    box('holo-reticle', .002, .002, .003, 0, .11, -.027, mats.laser);
  }
  let muzzleZ = end + .025;
  if (spec.suppressed || attachments.includes('suppressor')) { cylinder('suppressor', .2, .047, 0, .004, end + .08, mats.black); for (let i = 0; i < 5; i++) cylinder('suppressor-baffle', .008, .05, 0, .004, end + .02 + i * .028, mats.metal); muzzleZ = end + .185; }
  if (attachments.includes('compensator')) { cylinder('compensator', .055, .04, 0, .004, end + .04, mats.steel); muzzleZ = end + .07; }
  if (attachments.includes('light') || hands) { cylinder('weapon-light', .11, .036, .065, -.017, .21, mats.black); cylinder('light-lens', .004, .031, .065, -.017, .267, mats.glass); box('light-mount', .035, .02, .03, .045, -.017, .19, mats.metal); }
  if (attachments.includes('laser')) { box('laser-module', .045, .025, .068, .06, .032, .18, mats.tan); cylinder('laser-emitter', .008, .012, .06, .032, .216, mats.laser); }
  const muzzle = new TransformNode('muzzle', scene); muzzle.parent = root; muzzle.position.set(0, .004, muzzleZ);
  const flash = MeshBuilder.CreateCylinder('muzzle-flash', { height: .17, diameterTop: 0, diameterBottom: .09, tessellation: 5 }, scene); flash.parent = muzzle; flash.rotation.x = Math.PI / 2; flash.position.z = .07; flash.material = mats.flash; flash.isPickable = false; flash.setEnabled(false);
  if (hands) {
    box('right-glove', .08, .095, .08, .022, -.13, -.1, mats.clothDark);
    const arm = box('right-sleeve', .11, .12, .31, .11, -.2, -.25, mats.cloth); arm.rotation.y = -.35; arm.rotation.x = -.3;
    box('left-glove', .087, .075, .1, -.03, -.075, pistol ? -.1 : .24, mats.clothDark);
    const left = box('left-sleeve', .11, .11, .32, -.12, -.16, pistol ? -.25 : .06, mats.cloth); left.rotation.y = .5; left.rotation.x = -.35;
    for (let i = 0; i < 4; i++) box('glove-finger', .022, .02, .065, -.055 + i * .019, -.086, pistol ? -.085 : .235, mats.black);
  }
  const batches = new Map();
  for (const part of parts) { if (!batches.has(part.material)) batches.set(part.material, []); batches.get(part.material).push(part); }
  const mergedParts = [];
  for (const meshes of batches.values()) {
    for (const mesh of meshes) mesh.parent = null;
    const merged = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
    merged.parent = root; merged.isPickable = false; mergedParts.push(merged);
  }
  return { root, parts: mergedParts, muzzle, flash };
}
