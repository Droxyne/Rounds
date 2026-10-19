import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
export function makeMaterials(scene) {
  const materials = {};
  function surface(name, hex, roughness, metallic, noise = 0) {
    const m = new PBRMaterial(name, scene); m.albedoColor = Color3.FromHexString(hex); m.roughness = roughness; m.metallic = metallic;
    m.environmentIntensity = .5;
    if (noise) {
      const size = 128, t = new DynamicTexture(name + '-grain', size, scene, true), b = new DynamicTexture(name + '-normal', size, scene, true), r = new DynamicTexture(name + '-rough', size, scene, true);
      const ctx = t.getContext(), bc = b.getContext(), rc = r.getContext(), pixels = ctx.createImageData(size, size), normals = bc.createImageData(size, size), rough = rc.createImageData(size, size);
      let seed = 4109;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < pixels.data.length; i += 4) {
        const n = random(), streak = Math.sin((i / 4 % size) * .16) * 9;
        const v = 205 + n * 50 - noise * streak;
        pixels.data.set([v, v, v, 255], i);
        normals.data.set([128 + (random() - .5) * noise * 46, 128 + (random() - .5) * noise * 46, 247, 255], i);
        rough.data.set([0, Math.min(255, roughness * 255 + (n - .5) * 60), metallic * 255, 255], i);
      }
      ctx.putImageData(pixels, 0, 0); bc.putImageData(normals, 0, 0); rc.putImageData(rough, 0, 0);
      [t, b, r].forEach(x => { x.update(); x.uScale = x.vScale = name === 'concrete' ? 4 : 2; x.wrapU = x.wrapV = Texture.WRAP_ADDRESSMODE; });
      m.albedoTexture = t; m.bumpTexture = b; m.bumpTexture.level = .3; m.metallicTexture = r; m.useRoughnessFromMetallicTextureAlpha = false; m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true;
    }
    materials[name] = m; return m;
  }
  surface('concrete', '#59605b', .94, .02, 1.4);
  surface('concreteLight', '#93968a', .9, .02, 1.3);
  surface('floor', '#3a4443', .34, .18, .8);
  surface('metal', '#293334', .38, .82, .55);
  surface('black', '#11191c', .56, .22, .5);
  surface('steel', '#747c79', .3, .92, .3);
  surface('tan', '#8c8063', .7, .12, .5);
  surface('olive', '#484f3c', .83, .05, .8);
  surface('wood', '#64513c', .87, .01, 1.3);
  surface('rust', '#664737', .84, .55, 1.4);
  surface('yellow', '#ad954c', .68, .25, .4);
  surface('cloth', '#373e37', .98, 0, 1.7);
  surface('clothDark', '#202827', .98, 0, 1.1);
  surface('skin', '#7b7061', .9, 0, .4);
  surface('brass', '#c0a262', .28, .85);
  surface('red', '#913e32', .65, .25);
  surface('target', '#bdb8a4', .95, 0, .3);
  const glow = surface('glow', '#c7e5d5', .3, .2); glow.emissiveColor = new Color3(.6, .85, .75);
  const orange = surface('orangeGlow', '#e3a05d', .3, .1); orange.emissiveColor = new Color3(1, .3, .05);
  const flash = surface('flash', '#ffe0a0', .2, 0); flash.emissiveColor = new Color3(5, 2.8, .6); flash.unlit = true;
  const laser = surface('laser', '#ed543a', .4, 0); laser.emissiveColor = new Color3(3, .08, .02); laser.unlit = true;
  const water = surface('water', '#4c5c59', .08, .45); water.alpha = .34;
  const glass = surface('glass', '#427d79', .08, .55); glass.alpha = .45;
  return materials;
}
export function textPlane(scene, name, text, width, height, position, color = '#c6c8b7', background = null, font = 'bold 130px sans-serif') {
  const t = new DynamicTexture(name + '-label', { width: 1024, height: 256 }, scene, true), ctx = t.getContext();
  ctx.clearRect(0, 0, 1024, 256); if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 256); }
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 512, 135, 980); t.update(); t.hasAlpha = true;
  const m = new PBRMaterial(name + '-paint', scene); m.albedoTexture = t; m.opacityTexture = t; m.roughness = .9; m.metallic = 0; m.emissiveColor = Color3.FromHexString(color).scale(.12); m.backFaceCulling = false;
  const plane = MeshBuilder.CreatePlane(name, { width, height }, scene); plane.position.copyFrom(position || Vector3.Zero()); plane.material = m; plane.isPickable = false; return plane;
}
