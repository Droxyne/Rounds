import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
export function createEnvironment(scene) {
  // Local synthetic irradiance map: cold ceiling, dark floor and long fluorescent strips.
  const size = 64, faces = [];
  for (let face = 0; face < 6; face++) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const t = y / size, light = face === 2 ? .28 : face === 3 ? .025 : .055 + (1 - t) * .11;
      const strip = face !== 3 && y > 12 && y < 17 && x > 7 && x < 57 ? .56 : 0;
      const i = (y * size + x) * 4; data[i] = (light + strip) * 215; data[i + 1] = (light + strip) * 237; data[i + 2] = (light + strip) * 225; data[i + 3] = 255;
    }
    faces.push(data);
  }
  const cube = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  cube.gammaSpace = true; scene.environmentTexture = cube; scene.environmentIntensity = .8;
}
export class BodycamPipeline {
  constructor(scene, engine, camera, game) {
    this.scene = scene; this.engine = engine; this.camera = camera; this.game = game; this.pipeline = null; this.effect = null; this.enabled = null;
    Effect.ShadersStore.bodycamFragmentShader = `
      precision highp float;
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform float time;
      uniform float damage;
      uniform float intensity;
      uniform float aspect;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time*93.17)*43758.5453);}
      void main(void){
        vec2 p=vUV*2.0-1.0;
        float r=dot(p,p);
        vec2 uv=.5+.5*p*(1.0+.13*r*intensity);
        vec2 shift=p*.0028*pow(r,1.55)*intensity;
        vec3 color;
        color.r=texture2D(textureSampler,clamp(uv+shift,.001,.999)).r;
        color.g=texture2D(textureSampler,clamp(uv,.001,.999)).g;
        color.b=texture2D(textureSampler,clamp(uv-shift,.001,.999)).b;
        float vignette=1.0-smoothstep(.20,2.0,r)*.56*intensity;
        float grain=(hash(vUV*vec2(1920.,1080.))-.5)*.055*intensity;
        color=mix(color,vec3(dot(color,vec3(.299,.587,.114))),.14*intensity);
        color*=vec3(.97,1.015,.98);
        color=color*vignette+grain;
        color.r+=damage*.13*smoothstep(.3,1.8,r);
        color*=1.-smoothstep(.98,1.12,max(abs(uv.x-.5),abs(uv.y-.5))*2.);
        gl_FragColor=vec4(color,1.0);
      }`;
  }
  setEnabled(enabled, quality) {
    if (enabled === this.enabled && quality === this.quality) return;
    this.enabled = enabled; this.quality = quality;
    this.effect?.dispose(this.camera); this.pipeline?.dispose(); this.effect = this.pipeline = null;
    this.scene.imageProcessingConfiguration.applyByPostProcess = false;
    if (!enabled) return;
    this.pipeline = new DefaultRenderingPipeline('photographic-pipeline', true, this.scene, [this.camera]);
    this.pipeline.samples = quality === 'Ultra' ? 2 : 1;
    this.pipeline.fxaaEnabled = true; this.pipeline.bloomEnabled = quality !== 'Saver'; this.pipeline.bloomThreshold = .85; this.pipeline.bloomWeight = .24; this.pipeline.bloomKernel = 48; this.pipeline.bloomScale = .5;
    this.pipeline.imageProcessingEnabled = true;
    const image = this.scene.imageProcessingConfiguration; image.toneMappingEnabled = true; image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES; image.contrast = 1.2;
    this.effect = new PostProcess('bodycam-optics', 'bodycam', ['time', 'damage', 'intensity', 'aspect'], null, 1, this.camera, Texture.BILINEAR_SAMPLINGMODE, this.engine);
    this.effect.onApply = effect => { effect.setFloat('time', this.game.time); effect.setFloat('damage', this.game.damageFlash || 0); effect.setFloat('intensity', this.game.scopedADS ? .2 : this.game.state === 'armory' ? .35 : 1); effect.setFloat('aspect', this.engine.getAspectRatio(this.camera)); };
  }
}
