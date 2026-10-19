import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import '@babylonjs/core/Materials/Textures/baseTexture.polynomial.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { opticMagnification, scopedFieldOfView } from './optics.js';
import { Store } from './store.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { makeMaterials } from './materials.js';
import { World } from './world.js';
import { buildWeapon } from './weapons.js';
import { buildOperator, Director } from './actors.js';
import { getWeapon, damageAtRange, killReward } from './data.js';
import { BodycamPipeline, createEnvironment } from './renderer.js';
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const approach = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));
export class Game {
  constructor(canvas) {
    this.canvas = canvas; this.store = new Store(); this.audio = new AudioEngine(); this.state = 'boot'; this.mode = 'deployment'; this.time = 0; this.missionTime = 0;
    this.scopedADS = false; this.damageFlash = 0; this.kick = 0; this.aimX = 0; this.aimY = 0; this.reloadTime = 0; this.nextShot = 0; this.flashlightOn = true;
    this.effects = []; this.bulletMarks = []; this.trainingAttachments = {}; this.ammoInventory = {}; this.weapon = getWeapon(this.store.data.equipped); this.ammo = this.weapon.magazine; this.reserve = this.weapon.magazine * 5;
    this.player = { position: new Vector3(0, 1.7, -3), yaw: 0, pitch: 0, health: 100, grenades: 2, lastDamage: -20 };
    this.ui = new UI(this);
  }
  async init() {
    if (!Engine.IsSupported) throw new Error('This device cannot create a WebGL renderer. Enable hardware acceleration, then reload in a current browser.');
    this.ui.boot(8, 'CONNECTING BODYCAM SENSOR');
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance', doNotHandleContextLost: false });
    this.scene = new Scene(this.engine); this.scene.clearColor = new Color4(.035, .045, .038, 1); this.scene.ambientColor = new Color3(.08, .09, .07);
    this.scene.fogMode = Scene.FOGMODE_EXP2; this.scene.fogDensity = .016; this.scene.fogColor = new Color3(.095, .12, .105);
    this.camera = new FreeCamera('bodycam', new Vector3(-2.8, 1.75, -4), this.scene); this.camera.minZ = .035; this.camera.maxZ = 100; this.camera.fov = 1.3; this.camera.inputs.clear(); this.camera.inertia = 0;
    this.scene.activeCamera = this.camera;
    createEnvironment(this.scene); this.mats = makeMaterials(this.scene); Object.values(this.mats).forEach(m => m.maxSimultaneousLights = 7);
    this.flashlight = new SpotLight('weapon-tactical-light', new Vector3(0, 2, 0), new Vector3(0, 0, 1), Math.PI / 3, 4, this.scene); this.flashlight.diffuse = new Color3(.94, .96, .84); this.flashlight.intensity = 38; this.flashlight.range = 36; this.flashlight.radius = .04;
    this.ambient = new HemisphericLight('ambient-bounce', new Vector3(.2, 1, .3), this.scene); this.ambient.intensity = .5; this.ambient.diffuse = new Color3(.67, .77, .7); this.ambient.groundColor = new Color3(.16, .19, .14);
    this.keyLight = new DirectionalLight('roof-bounce', new Vector3(-.4, -1, .5), this.scene); this.keyLight.intensity = .75; this.keyLight.diffuse = Color3.FromHexString('#abc6b4');
    this.rimLight = new PointLight('operator-rim', new Vector3(2.7, 3.1, 1.6), this.scene); this.rimLight.diffuse = Color3.FromHexString('#d2cba7'); this.rimLight.intensity = 12; this.rimLight.range = 13;
    this.muzzleLight = new PointLight('muzzle-illumination', Vector3.Zero(), this.scene); this.muzzleLight.diffuse = new Color3(1, .57, .2); this.muzzleLight.intensity = 0; this.muzzleLight.range = 5;
    this.shadow = new ShadowGenerator(1024, this.flashlight); this.shadow.usePercentageCloserFiltering = this.engine.webGLVersion > 1; this.shadow.filteringQuality = ShadowGenerator.QUALITY_LOW; this.shadow.bias = .0003; this.shadow.normalBias = .025; this.shadow.darkness = .25;
    this.ui.boot(28, 'GENERATING SURFACE MATERIALS');
    this.world = new World(this.scene, this.mats, this.shadow, 'deployment');
    this.director = new Director(this); this.input = new Input(this);
    this.ui.boot(56, 'ASSEMBLING WEAPON PLATFORMS');
    this.hero = buildOperator(this.scene, this.mats, this.shadow, new Vector3(.4, 0, -.3), true); this.hero.root.rotation.y = -2.74;
    this.hero.root.scaling.setAll(1.25);
    this.equipWeapon(this.store.data.equipped); this.gun.root.setEnabled(false);
    this.pipeline = new BodycamPipeline(this.scene, this.engine, this.camera, this); this.applySettings();
    this.ui.boot(73, 'CALIBRATING OPTICS & SHADOW MAPS');
    this.camera.setTarget(new Vector3(1.1, 1.6, 9));
    let last = performance.now(), lastUI = 0, lastLights = 0;
    this.engine.runRenderLoop(() => {
      const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
      this.time += dt;
      // Bounded substeps keep movement, grenade collision and fire cadence stable on 15–30 Hz devices.
      if (this.state === 'playing') {
        let remaining = dt;
        while (remaining > .00001 && this.state === 'playing') { const step = Math.min(1 / 60, remaining); this.update(step); remaining -= step; }
      }
      else if (this.state === 'menu' || this.state === 'boot') this.updateMenu(dt);
      else if (this.state === 'armory' && this.preview) this.preview.root.position.y = 2.05 + Math.sin(this.time * .8) * .012;
      if (now - lastLights > 650) { this.updateLights(); lastLights = now; }
      this.scene.render();
      if (now - lastUI > 70) { this.ui.update(); lastUI = now; }
    });
    window.addEventListener('resize', () => { this.engine.resize(); if (this.state === 'armory') this.framePreview(); });
    this.engine.onContextLostObservable.add(() => { if (this.state === 'playing') this.pause(); this.ui.toast('GRAPHICS CONTEXT LOST / WAITING FOR RECOVERY'); });
    this.engine.onContextRestoredObservable.add(() => this.ui.toast('GRAPHICS CONTEXT RESTORED'));
    const loadingTick = setInterval(() => this.ui.boot(Math.min(94, 78 + Math.floor((performance.now() - lastUI) / 500)), 'COMPILING PBR SHADERS'), 600);
    await new Promise(resolve => this.scene.executeWhenReady(resolve));
    clearInterval(loadingTick); this.ui.boot(100, 'SYSTEM READY');
    this.state = 'menu'; this.ui.ready();
    // Expose a read-only snapshot for reproducible smoke tests, never credentials or saved data.
    window.blackline = { snapshot: () => ({ state: this.state, mode: this.mode, health: this.player.health, ammo: this.ammo, reserve: this.reserve, weapon: this.weapon.id, wave: this.director.wave, enemies: this.director.actors.filter(a => !a.dead).length, meshes: this.scene.meshes.length, fps: Math.round(this.engine.getFps()), position: this.player.position.asArray(), pointers: this.input.pointers.size, moving: { ...this.input.move }, aiming: this.input.ads, scopedADS: this.scopedADS, viewmodelVisible: this.gun.root.isEnabled(), fov: this.camera.fov, aimOffset: [this.aimX, this.aimY], firing: this.input.fire }), ready: true };
  }
  attachmentsFor(id, training = this.mode === 'training' && this.state !== 'menu') {
    if (training) return this.trainingAttachments[id] || ['light'];
    return this.store.data.attachments[id] || ['light'];
  }
  applySettings() {
    if (!this.engine) return;
    const s = this.store.data.settings, mobile = matchMedia('(pointer: coarse)').matches;
    const scale = { Saver: .58, Balanced: mobile ? .8 : 1, Ultra: Math.min(devicePixelRatio || 1, 1.5) }[s.quality];
    this.engine.setHardwareScalingLevel(1 / Math.min(scale, 1920 / Math.max(innerWidth, innerHeight)));
    this.scene.shadowsEnabled = s.shadows;
    const map = this.shadow?.getShadowMap(); if (map) { const size = s.quality === 'Ultra' ? 2048 : s.quality === 'Saver' ? 512 : 1024; if (map.getSize().width !== size) this.shadow.mapSize = size; }
    this.pipeline?.setEnabled(s.post, s.quality); this.audio.setVolume(s.volume);
    if (this.state !== 'armory') this.camera.fov = s.fov * Math.PI / 180;
    document.querySelector('#performance-readout').textContent = `${s.quality.toUpperCase()} / ${Math.round(scale * 100)}% SCALE / WEBGL ${this.engine.webGLVersion}`;
    this.engine.resize();
  }
  updateLights() {
    if (!this.world) return;
    const p = this.camera.position;
    const nearest = [...this.world.lights].sort((a, b) => Vector3.DistanceSquared(a.position, p) - Vector3.DistanceSquared(b.position, p)).slice(0, 3);
    for (const light of this.world.lights) light.setEnabled(this.state !== 'armory' && nearest.includes(light));
  }
  updateMenu(dt) {
    this.camera.position.set(-2.9 + Math.sin(this.time * .11) * .14, 1.8 + Math.sin(this.time * .23) * .025, -3.9);
    this.camera.fov = 1.14; this.camera.setTarget(new Vector3(.4, 1.43, 8.8)); this.camera.rotation.z = Math.sin(this.time * .15) * .003;
    if (this.hero) { this.hero.root.rotation.y = -2.68 + Math.sin(this.time * .3) * .035; this.hero.weapon.root.rotation.x = -.08 + Math.sin(this.time * 1.4) * .008; }
    this.flashlight.position.set(-1.2, 3.2, -3.5); this.flashlight.direction = new Vector3(.4, 1.25, -.3).subtract(this.flashlight.position).normalize(); this.flashlight.intensity = 8; this.flashlight.shadowEnabled = this.store.data.settings.shadows;
    this.scene.imageProcessingConfiguration.exposure = approach(this.scene.imageProcessingConfiguration.exposure, 1.35, 2, dt);
  }
  clearEffects() { this.effects.forEach(e => { e.mesh?.dispose(); e.light?.dispose(); }); this.effects = []; this.bulletMarks.forEach(m => m.dispose()); this.bulletMarks = []; }
  rebuildWorld(mode) {
    this.director.clear(); this.clearEffects(); this.hero?.root.dispose(false); this.hero = null; this.world.dispose();
    this.world = new World(this.scene, this.mats, this.shadow, mode); this.scene.fogDensity = mode === 'training' ? .009 : .016;
  }
  startGame(mode) {
    this.ui.closeModal(false); this.preview?.root.dispose(false); this.preview = null;
    this.mode = mode; this.rebuildWorld(mode); this.state = 'playing'; this.missionTime = 0; this.ammoInventory = {}; this.ammo = this.weapon.magazine; this.reserve = this.weapon.magazine * 5; this.damageFlash = 0; this.scene.fogEnabled = true; this.laserDot?.setEnabled(false);
    this.player.position.copyFrom(this.world.spawn); this.player.yaw = this.player.pitch = 0; this.player.health = 100; this.player.grenades = mode === 'training' ? 9 : 2; this.player.lastDamage = -20;
    this.aimX = this.aimY = this.kick = 0; this.bobTime = 0; this.stepTime = 0; this.nextShot = 0; this.reloadTime = 0; this.input.reset(); this.input.crouch = false; this.flashlightOn = true;
    this.equipWeapon(this.store.data.equipped); this.primaryId = this.weapon.id; this.rimLight.setEnabled(false); this.previewLight?.setEnabled(false);
    this.ambient.intensity = mode === 'training' ? .7 : .37; this.keyLight.intensity = mode === 'training' ? .9 : .48;
    this.camera.position.copyFrom(this.player.position); this.camera.rotation.set(0, 0, 0); this.camera.fov = this.store.data.settings.fov * Math.PI / 180;
    this.ui.screen('hud'); this.ui.resetHud();
    if (mode === 'training') { this.director.training(); this.ui.announce('CHECK YOUR ZERO', 'UNLIMITED AMMUNITION · ALL 20 WEAPONS AVAILABLE'); }
    else this.director.spawnWave();
    this.audio.unlock(); this.updateLights(); this.lockPointer();
  }
  lockPointer() { if (!this.input.touch) { try { const result = this.canvas.requestPointerLock?.(); if (result?.catch) result.catch(() => {}); } catch { /* Browser may require another canvas gesture. */ } } }
  pause(showModal = true) {
    if (this.state !== 'playing') return; this.state = 'paused'; this.input.reset(); this.setScopedADS(false); document.exitPointerLock?.(); if (showModal) this.ui.openModal('pause');
  }
  resume() { this.ui.closeModal(false); this.state = 'playing'; this.input.reset(); this.setScopedADS(false); this.lockPointer(); }
  menu() {
    const wasMode = this.mode; this.state = 'menu'; this.scene.fogEnabled = true; this.laserDot?.setEnabled(false); this.input.reset(); this.setScopedADS(false); document.exitPointerLock?.(); this.preview?.root.dispose(false); this.preview = null; this.previewLight?.setEnabled(false);
    this.mode = 'deployment'; this.rebuildWorld('deployment'); this.hero = buildOperator(this.scene, this.mats, this.shadow, new Vector3(.4, 0, -.3), true); this.hero.root.scaling.setAll(1.25);
    if (wasMode === 'training' || !this.store.data.owned.includes(this.weapon.id)) this.equipWeapon(this.store.data.equipped);
    this.gun.root.setEnabled(false); this.rimLight.setEnabled(true); this.ambient.intensity = .5; this.keyLight.intensity = .75;
    this.camera.fov = this.store.data.settings.fov * Math.PI / 180; this.ui.screen('menu'); this.ui.updateCash(); this.ui.closeModal(false); this.updateLights();
  }
  enterArmory() {
    this.armoryReturn = this.state === 'playing' ? 'playing' : this.state === 'paused' ? 'paused' : 'menu';
    if (this.state === 'playing') this.pause(false);
    this.savedCamera = { position: this.camera.position.clone(), rotation: this.camera.rotation.clone(), fov: this.camera.fov };
    this.state = 'armory'; this.input.reset(); this.setScopedADS(false); document.exitPointerLock?.(); this.gun.root.setEnabled(false); this.flashlight.intensity = 0; this.flashlight.shadowEnabled = false;
    this.rimLight.setEnabled(false); this.laserDot?.setEnabled(false); this.ui.screen('armory'); this.scene.fogEnabled = false;
    if (!this.previewLight) { this.previewLight = new PointLight('armory-softbox', new Vector3(79, 4, -2), this.scene); this.previewLight.diffuse = new Color3(.9, .95, .83); this.previewLight.range = 10; this.previewLight.intensity = 32; }
    this.previewLight.setEnabled(true); this.ambient.intensity = .85; this.updateLights();
  }
  previewWeapon(w, attachments) {
    this.preview?.root.dispose(false); this.preview = buildWeapon(this.scene, this.mats, w, attachments);
    this.preview.root.position.set(80, 2.05, 0); this.preview.root.rotation.set(.04, -Math.PI / 2 + .23, -.08); this.framePreview();
  }
  framePreview() {
    const portrait = innerWidth < 600 && innerHeight > innerWidth;
    this.camera.position.set(80, 2.17, portrait ? -2.25 : -1.85); this.camera.rotation.set(0, 0, 0); this.camera.fov = portrait ? .8 : .64;
    // Shift the weapon into the UI's open inspection area using an off-axis camera target.
    const offsetX = portrait ? 0 : innerWidth / innerHeight > 2 ? .42 : .38;
    const offsetY = portrait ? -.45 : -.03;
    this.camera.setTarget(new Vector3(80 + offsetX, 2.05 + offsetY, 0));
  }
  leaveArmory() {
    this.preview?.root.dispose(false); this.preview = null; this.previewLight?.setEnabled(false); this.scene.fogEnabled = true;
    const previous = this.armoryReturn;
    if (previous === 'menu') { this.state = 'menu'; this.ui.screen('menu'); this.rimLight.setEnabled(true); this.ambient.intensity = .5; this.camera.fov = this.store.data.settings.fov * Math.PI / 180; }
    else {
      this.camera.position.copyFrom(this.savedCamera.position); this.camera.rotation.copyFrom(this.savedCamera.rotation); this.camera.fov = this.savedCamera.fov;
      this.gun.root.setEnabled(true); this.ambient.intensity = this.mode === 'training' ? .7 : .37; this.ui.screen('hud');
      if (previous === 'playing') this.resume(); else { this.state = 'paused'; this.ui.openModal('pause'); }
    }
    this.updateLights();
  }
  equipWeapon(id, preserve = false) {
    if (this.gun) { this.ammoInventory[this.weapon.id] = { ammo: this.ammo, reserve: this.reserve }; this.gun.root.dispose(false); }
    this.weapon = getWeapon(id);
    const inventory = this.ammoInventory[id]; this.ammo = inventory?.ammo ?? this.weapon.magazine; this.reserve = inventory?.reserve ?? this.weapon.magazine * 5;
    if (!preserve) this.reloadTime = 0;
    this.gun = buildWeapon(this.scene, this.mats, this.weapon, this.attachmentsFor(id), true); this.gun.root.parent = this.camera;
    this.flashlight.excludedMeshes = this.gun.parts; this.muzzleLight.excludedMeshes = this.gun.parts;
    this.gun.root.position.set(.235, -.245, .4); this.gun.root.rotation.set(0, 0, 0);
    this.gun.root.setEnabled(this.state === 'playing' || this.state === 'paused'); this.nextShot = 0;
    this.setScopedADS(false);
    if (id !== 'g19') this.primaryId = id;
  }
  swapWeapon() { if (this.reloadTime > 0) this.reloadTime = 0; this.equipWeapon(this.weapon.id === 'g19' ? this.primaryId || 'm4' : 'g19'); this.audio.click(); }
  reload() {
    if (this.state !== 'playing' || this.reloadTime > 0 || this.ammo >= this.weapon.magazine) return;
    if (this.reserve <= 0 && this.mode !== 'training') return this.ui.toast('NO RESERVE AMMUNITION / SWAP WEAPON');
    this.reloadTime = this.weapon.reload; this.setScopedADS(false); this.audio.reload(this.weapon);
  }
  setScopedADS(active) {
    const changed = this.scopedADS !== active;
    const wasScoped = this.scopedADS;
    this.scopedADS = active;
    if (this.gun) {
      // The exterior model is for hip-fire/inspection. Its capped cylinders must
      // never be placed between the eye and the magnified world camera.
      this.gun.root.setEnabled(['playing', 'paused', 'dead'].includes(this.state) && !active);
      if (wasScoped && !active) { this.gun.root.position.set(.235, -.245, .4); this.gun.root.rotation.set(0, 0, 0); }
    }
    if (changed) this.ui.setScopeView(active, opticMagnification(this.weapon, this.attachmentsFor(this.weapon.id)));
  }
  direction() {
    // A scope's reticle is optical-center aligned, including camera breathing/lean.
    if (this.scopedADS) return this.camera.getForwardRay().direction.clone();
    const yaw = this.player.yaw + this.aimX, pitch = this.player.pitch + this.aimY;
    return new Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }
  shoot() {
    if (this.reloadTime > 0 || this.nextShot > 0) return;
    if (this.ammo <= 0) { this.audio.click(); this.nextShot = .3; this.reload(); return; }
    const w = this.weapon, attachments = this.attachmentsFor(w.id), suppressed = w.suppressed || attachments.includes('suppressor');
    this.ammo--; this.nextShot = 60 / w.rpm; this.director.shots++;
    const origin = this.camera.position.clone(), base = this.direction(); let hitShot = false;
    const spread = w.spread * (this.input.ads ? .3 : 1) * (this.input.crouch ? .8 : 1) * (attachments.includes('laser') ? .75 : 1);
    for (let i = 0; i < (w.pellets || 1); i++) {
      const direction = base.add(new Vector3((Math.random() - .5) * spread * 2, (Math.random() - .5) * spread * 2, (Math.random() - .5) * spread)).normalize();
      const hit = this.scene.pickWithRay(new Ray(origin, direction, 150), m => m.isPickable && (m.metadata?.world || (m.metadata?.actor && !m.metadata.actor.dead)));
      const end = hit?.hit ? hit.pickedPoint : origin.add(direction.scale(90));
      if (hit?.hit) {
        const actor = hit.pickedMesh.metadata?.actor;
        if (actor && !actor.dead) { const head = hit.pickedMesh.metadata.head, damage = damageAtRange(w, hit.distance, head); this.damageActor(actor, damage, head, hit.pickedPoint); hitShot = true; }
        else this.impact(hit.pickedPoint, hit.getNormal(true) || direction.negate());
      }
      if (!w.pellets || i < 2) this.tracer(this.gun.muzzle.getAbsolutePosition(), end, false);
    }
    if (hitShot) this.director.hits++;
    const recoil = w.recoil * (attachments.includes('compensator') ? .7 : 1) * (this.input.ads ? .75 : 1);
    this.player.pitch = clamp(this.player.pitch - recoil * .6, -1.4, 1.4); this.aimY -= recoil * .35; this.aimX += (Math.random() - .5) * recoil * .35; this.kick = Math.min(.25, this.kick + recoil * 2.1);
    this.gun.flash.setEnabled(!suppressed); this.flashEnd = this.time + .045; this.muzzleLight.position.copyFrom(this.gun.muzzle.getAbsolutePosition()); this.muzzleLight.intensity = suppressed ? .6 : 9;
    this.audio.shot(w, suppressed, null, true); this.ejectCasing();
    if (this.input.touch && navigator.vibrate) navigator.vibrate(12);
  }
  damageActor(actor, damage, head, point) {
    if (actor.dead) return;
    actor.health -= damage; actor.hitTime = .7; this.ui.damagePopup(damage, point, head); this.ui.hit(head); this.audio.hit(head);
    if (!actor.target) { actor.lastKnown = this.player.position.clone(); actor.awareness = 1; }
    if (actor.health <= 0) {
      actor.dead = true; actor.deathTime = 0;
      actor.root.getChildMeshes().forEach(m => { if (m.metadata?.actor) m.isPickable = false; });
      if (actor.target) { actor.root.setEnabled(false); actor.timer = 2.4; }
      else { actor.weapon.flash.setEnabled(false); this.director.kills++; const reward = this.mode === 'deployment' ? killReward(head) : 0; if (reward) { this.store.earn(reward); this.store.data.kills++; this.store.save(); } this.ui.kill(head, reward); }
    }
  }
  tracer(start, end, enemy) {
    const delta = end.subtract(start), length = delta.length(); if (length < .01) return;
    const mesh = MeshBuilder.CreateCylinder('ballistic-tracer', { height: Math.min(length, 14), diameter: enemy ? .009 : .005, tessellation: 4 }, this.scene);
    const center = start.add(delta.scale(.5)); mesh.position.copyFrom(center); mesh.rotationQuaternion = null; mesh.material = enemy ? this.mats.orangeGlow : this.mats.flash; mesh.isPickable = false;
    // Cylinder axis is Y; orient via Euler pitch/yaw.
    mesh.rotation.set(Math.acos(clamp(delta.y / length, -1, 1)), Math.atan2(delta.x, delta.z), 0);
    this.effects.push({ mesh, ttl: .045 });
  }
  impact(point, normal) {
    const mark = MeshBuilder.CreateDisc('bullet-impact', { radius: .025 + Math.random() * .018, tessellation: 7 }, this.scene); mark.position.copyFrom(point.add(normal.scale(.012))); mark.lookAt(point.add(normal)); mark.material = this.mats.black; mark.isPickable = false; this.bulletMarks.push(mark);
    if (this.bulletMarks.length > 45) this.bulletMarks.shift().dispose();
    const spark = MeshBuilder.CreateSphere('impact-spark', { diameter: .035, segments: 3 }, this.scene); spark.position.copyFrom(point); spark.material = this.mats.orangeGlow; spark.isPickable = false; this.effects.push({ mesh: spark, ttl: .07 });
  }
  ejectCasing() {
    const mesh = MeshBuilder.CreateCylinder('spent-brass', { height: this.weapon.pellets ? .05 : .033, diameter: .012, tessellation: 6 }, this.scene); mesh.material = this.weapon.pellets ? this.mats.red : this.mats.brass; mesh.isPickable = false;
    mesh.position.copyFrom(this.camera.position.add(this.direction().scale(.4))); const yaw = this.player.yaw;
    this.effects.push({ mesh, ttl: 2.5, velocity: new Vector3(Math.cos(yaw) * 1.4, 1.3, -Math.sin(yaw) * 1.4), casing: true, bounced: false });
  }
  throwGrenade() {
    if (this.player.grenades <= 0) return this.ui.toast('NO GRENADES REMAINING');
    if (this.mode !== 'training') this.player.grenades--;
    const mesh = MeshBuilder.CreateSphere('frag-grenade', { diameter: .13, segments: 6 }, this.scene); mesh.material = this.mats.olive; mesh.isPickable = false;
    mesh.position.copyFrom(this.camera.position.add(this.direction().scale(.5)));
    const velocity = this.direction().scale(10); velocity.y += 3;
    this.effects.push({ mesh, velocity, ttl: 2.3, grenade: true }); this.audio.click(); this.ui.toast('FRAG OUT');
  }
  explode(point) {
    this.audio.explosion(point); const mesh = MeshBuilder.CreateSphere('explosion-flash', { diameter: 2.5, segments: 8 }, this.scene); mesh.material = this.mats.flash; mesh.position.copyFrom(point); mesh.isPickable = false;
    this.effects.push({ mesh, ttl: .15 });
    for (const actor of [...this.director.actors, ...this.world.targets]) {
      if (actor.dead) continue; const target = actor.root.position.add(new Vector3(0, 1, 0)), delta = target.subtract(point), distance = delta.length();
      if (distance < 8 && !this.scene.pickWithRay(new Ray(point.add(new Vector3(0, .15, 0)), delta.normalize(), Math.max(.1, distance - .2)), m => m.isPickable && m.metadata?.world)?.hit) this.damageActor(actor, Math.round(160 * (1 - distance / 9)), false, target);
    }
    const distance = Vector3.Distance(point, this.player.position);
    const blastDelta = this.player.position.subtract(point);
    const playerShielded = distance < 6 && this.scene.pickWithRay(new Ray(point.add(new Vector3(0, .15, 0)), blastDelta.normalizeToNew(), Math.max(.1, distance - .2)), m => m.isPickable && m.metadata?.world)?.hit;
    if (distance < 6 && this.mode === 'deployment' && !playerShielded) this.hurt(Math.round(80 * (1 - distance / 6)));
    if (distance < 12) this.kick += .12 * (1 - distance / 12);
  }
  hurt(amount) {
    if (this.state !== 'playing' || this.mode === 'training') return;
    this.player.health = Math.max(0, this.player.health - amount); this.player.lastDamage = this.missionTime; this.damageFlash = .65; this.kick += .035; this.audio.hurt();
    if (this.player.health <= 0) { this.state = 'dead'; this.input.reset(); this.setScopedADS(false); document.exitPointerLock?.(); this.ui.update(); document.querySelector('#health-value').textContent = '0'; document.querySelector('#health-fill').style.width = '0%'; this.ui.debrief(); }
  }
  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; e.ttl -= dt;
      if (e.velocity) {
        e.velocity.y -= 9.8 * dt;
        if (e.grenade) {
          if (this.world.blocked(e.mesh.position.x + e.velocity.x * dt, e.mesh.position.z, .08)) e.velocity.x *= -.5;
          if (this.world.blocked(e.mesh.position.x, e.mesh.position.z + e.velocity.z * dt, .08)) e.velocity.z *= -.5;
        }
        e.mesh.position.addInPlace(e.velocity.scale(dt)); e.mesh.rotation.x += dt * 5; e.mesh.rotation.z += dt * 3;
        if (e.mesh.position.y < .06) { e.mesh.position.y = .06; e.velocity.y = Math.abs(e.velocity.y) * .32; e.velocity.x *= .65; e.velocity.z *= .65; if (e.casing && !e.bounced) { this.audio.casing(); e.bounced = true; } }
      }
      if (e.ttl <= 0) { if (e.grenade) this.explode(e.mesh.position.clone()); e.mesh.dispose(); e.light?.dispose(); this.effects.splice(i, 1); }
    }
  }
  update(dt) {
    this.missionTime += dt; const input = this.input, player = this.player, s = this.store.data.settings;
    const attachments = this.attachmentsFor(this.weapon.id), magnification = opticMagnification(this.weapon, attachments);
    const aiming = input.ads && this.reloadTime <= 0;
    this.setScopedADS(aiming && magnification > 1);
    const look = input.consumeLook(), sensitivity = s.sensitivity * (input.touch ? .0033 : .002) * (input.ads ? .55 : 1);
    const dx = look.x * sensitivity, dy = look.y * sensitivity;
    // Free aim: the gun takes the first part of input; camera follows when the deadzone fills.
    const max = this.scopedADS ? 0 : input.ads ? .018 : .085;
    const ax = this.aimX + dx * .65, ay = this.aimY + dy * .65;
    this.aimX = clamp(ax, -max, max); this.aimY = clamp(ay, -max * .7, max * .7);
    player.yaw += dx * .35 + ax - this.aimX; player.pitch += dy * .35 + ay - this.aimY;
    const settleX = this.aimX * Math.min(1, dt * 7), settleY = this.aimY * Math.min(1, dt * 7);
    player.yaw += settleX; player.pitch = clamp(player.pitch + settleY, -1.42, 1.42); this.aimX -= settleX; this.aimY -= settleY;
    const movement = input.movement(), moving = Math.hypot(movement.x, movement.y), sprint = input.keys.has('ShiftLeft') && !input.ads && !input.crouch;
    const speed = input.crouch ? 1.65 : input.ads ? 2.1 : sprint ? 5.6 : 3.65;
    const mx = (Math.sin(player.yaw) * movement.y + Math.cos(player.yaw) * movement.x) * speed * dt;
    const mz = (Math.cos(player.yaw) * movement.y - Math.sin(player.yaw) * movement.x) * speed * dt;
    this.world.move(player.position, mx, mz); player.position.y = approach(player.position.y, input.crouch ? 1.15 : 1.7, 12, dt);
    this.bobTime += dt * moving * (sprint ? 15 : 10); this.stepTime += dt * moving;
    if (moving > .2 && this.stepTime > (sprint ? .29 : input.crouch ? .65 : .43)) { this.audio.step(sprint); this.stepTime = 0; }
    const lean = input.lean || (input.keys.has('KeyQ') ? -1 : input.keys.has('KeyE') ? 1 : 0);
    let leanOffset = lean * .24;
    if (this.world.blocked(player.position.x + Math.cos(player.yaw) * leanOffset, player.position.z - Math.sin(player.yaw) * leanOffset, .16)) leanOffset = 0;
    this.camera.position.copyFrom(player.position); this.camera.position.x += Math.cos(player.yaw) * leanOffset; this.camera.position.z -= Math.sin(player.yaw) * leanOffset;
    this.camera.position.y += Math.sin(this.bobTime * 2) * moving * (input.ads ? .008 : sprint ? .044 : .027);
    const roll = -movement.x * .024 - lean * .085 + Math.sin(this.bobTime) * moving * .007;
    this.camera.rotation.x = player.pitch + Math.sin(this.time * 1.1) * .0018; this.camera.rotation.y = player.yaw; this.camera.rotation.z = approach(this.camera.rotation.z, roll, 9, dt);
    const baseFov = s.fov * Math.PI / 180;
    const adsFov = magnification > 1 ? scopedFieldOfView(baseFov, magnification) : .88;
    this.camera.fov = approach(this.camera.fov, aiming ? adsFov : baseFov, 13, dt);
    this.kick = approach(this.kick, 0, 12, dt); this.damageFlash = Math.max(0, this.damageFlash - dt * 1.2); this.nextShot = Math.max(0, this.nextShot - dt);
    if (this.reloadTime > 0) { this.reloadTime -= dt; if (this.reloadTime <= 0) { const needed = this.weapon.magazine - this.ammo, amount = this.mode === 'training' ? needed : Math.min(needed, this.reserve); this.ammo += amount; if (this.mode !== 'training') this.reserve -= amount; this.reloadTime = 0; } }
    const reloadTilt = this.reloadTime > 0 ? Math.sin(Math.PI * this.reloadTime / this.weapon.reload) : 0;
    const sightHeight = attachments.includes('scope') || this.weapon.optic || ['sniper', 'dmr'].includes(this.weapon.style) || attachments.includes('holo') ? -.115 : -.05;
    this.gun.root.position.x = approach(this.gun.root.position.x, aiming ? -.002 : .235, 16, dt) + Math.sin(this.bobTime) * moving * .002;
    this.gun.root.position.y = approach(this.gun.root.position.y, aiming ? sightHeight : -.245, 16, dt) + Math.cos(this.bobTime * 2) * moving * .001 - reloadTilt * .002;
    this.gun.root.position.z = (aiming ? .29 : .4) - this.kick * .45;
    this.gun.root.rotation.x = this.aimY - this.kick * .75 - reloadTilt * .45;
    this.gun.root.rotation.y = this.aimX - dx * .15; this.gun.root.rotation.z = -reloadTilt * .5 + Math.sin(this.bobTime) * moving * .008;
    if (input.fire) this.shoot();
    if (this.time > this.flashEnd) { this.gun.flash.setEnabled(false); this.muzzleLight.intensity = 0; }
    const lightInstalled = attachments.includes('light');
    this.flashlight.intensity = this.flashlightOn && lightInstalled ? 42 : 0; this.flashlight.shadowEnabled = this.flashlight.intensity > 0 && s.shadows;
    this.flashlight.position.copyFrom(this.camera.position.add(new Vector3(Math.cos(player.yaw) * .2, -.18, -Math.sin(player.yaw) * .2)));
    this.flashlight.direction.copyFrom(this.direction());
    if (attachments.includes('laser')) this.updateLaser(); else this.laserDot?.setEnabled(false);
    const nearLamp = Math.min(...this.world.lights.map(l => Vector3.Distance(l.position, player.position)));
    const exposureTarget = 1.05 + clamp((nearLamp - 4) * .08, 0, .75);
    this.scene.imageProcessingConfiguration.exposure = approach(this.scene.imageProcessingConfiguration.exposure, exposureTarget, 1.2, dt);
    this.world.update(this.time, dt); this.director.update(dt, this.time); this.updateEffects(dt); this.audio.listener(this.camera.position, this.direction());
    if (player.health < 50 && this.missionTime - player.lastDamage > 10) player.health = Math.min(50, player.health + dt * 1.5);
  }
  updateLaser() {
    if (!this.laserDot) { this.laserDot = MeshBuilder.CreateSphere('laser-dot', { diameter: .018, segments: 4 }, this.scene); this.laserDot.material = this.mats.laser; this.laserDot.isPickable = false; }
    const hit = this.scene.pickWithRay(new Ray(this.camera.position, this.direction(), 60), m => m.isPickable && (m.metadata?.world || m.metadata?.actor));
    this.laserDot.setEnabled(!!hit?.hit); if (hit?.hit) this.laserDot.position.copyFrom(hit.pickedPoint.subtract(this.direction().scale(.015)));
  }
  project(point) {
    const width = this.engine.getRenderWidth(), height = this.engine.getRenderHeight();
    const v = Vector3.Project(point, Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(width, height));
    v.x *= innerWidth / width; v.y *= innerHeight / height; return v;
  }
}
