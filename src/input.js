import { FireSources } from './held-input.js';
export class Input {
  constructor(game) {
    this.game = game; this.keys = new Set(); this.pointers = new Map(); this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 }; this.fireSources = new FireSources(); this.ads = false; this.crouch = false; this.lean = 0; this.touch = matchMedia('(pointer: coarse)').matches;
    this.stick = document.querySelector('#joystick'); this.nub = document.querySelector('#joystick-nub');
    this.bind();
  }
  get fire() { return this.fireSources.active; }
  get active() { return this.game.state === 'playing'; }
  bind() {
    const zone = document.querySelector('#look-zone');
    const begin = (event, role, action) => {
      if (!this.active) return;
      event.preventDefault(); event.stopPropagation(); this.game.audio.unlock();
      if (event.pointerType === 'touch') { this.touch = true; document.body.classList.add('touch'); }
      if (role === 'move' && [...this.pointers.values()].some(p => p.role === 'move')) return;
      if (role === 'look' && [...this.pointers.values()].some(p => p.role === 'look')) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = this.stick.getBoundingClientRect();
      this.pointers.set(event.pointerId, { role, action, aimDrag: event.currentTarget.dataset.aimDrag !== 'false', x: event.clientX, y: event.clientY, originX: rect.left + rect.width / 2, originY: rect.top + rect.height / 2 });
      if (role === 'move') this.joystick(event);
      if (action) this.action(action, true, event.pointerId);
      if (event.pointerType === 'mouse' && role === 'look') { if (!document.pointerLockElement) this.game.canvas.requestPointerLock?.(); if (event.button === 0) this.fireSources.set('mouse', true); if (event.button === 2) this.ads = true; }
    };
    zone.addEventListener('pointerdown', e => begin(e, 'look'));
    this.stick.addEventListener('pointerdown', e => begin(e, 'move'));
    document.querySelectorAll('[data-combat]').forEach(el => el.addEventListener('pointerdown', e => begin(e, 'action', el.dataset.combat)));
    window.addEventListener('pointermove', e => {
      if (!this.active) return;
      const p = this.pointers.get(e.pointerId);
      if (p?.role === 'move') this.joystick(e);
      else if (p && (p.role === 'look' || (p.action === 'fire' && p.aimDrag)) && !document.pointerLockElement) {
        this.look.x += e.clientX - p.x; this.look.y += e.clientY - p.y;
      }
      if (p) { p.x = e.clientX; p.y = e.clientY; }
    });
    window.addEventListener('mousemove', e => { if (this.active && document.pointerLockElement) { this.look.x += e.movementX; this.look.y += e.movementY; } });
    const release = e => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      if (p.role === 'move') { this.move.x = this.move.y = 0; this.nub.style.transform = 'translate(-50%,-50%)'; }
      if (p.action) this.action(p.action, false, e.pointerId);
      if (e.pointerType === 'mouse' && p.role === 'look') { this.fireSources.set('mouse', false); this.ads = false; }
      this.pointers.delete(e.pointerId);
    };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('lostpointercapture', release);
    window.addEventListener('mouseup', e => { if (e.button === 0) this.fireSources.set('mouse', false); if (e.button === 2) this.ads = false; });
    window.addEventListener('mousedown', e => { if (this.active && document.pointerLockElement) { if (e.button === 0) this.fireSources.set('mouse', true); if (e.button === 2) this.ads = true; } });
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') { if (this.active) this.game.pause(); return; }
      if (!this.active || e.repeat) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      const map = { KeyR: 'reload', KeyC: 'crouch', ControlLeft: 'crouch', KeyF: 'flashlight', KeyG: 'grenade', KeyX: 'swap', Digit1: 'swap', Tab: 'armory' };
      if (map[e.code]) this.action(map[e.code], true);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.active && !this.touch && this.game.hadPointerLock) this.game.pause(); this.game.hadPointerLock = !!document.pointerLockElement; });
    window.addEventListener('blur', () => { this.reset(); if (this.active) this.game.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active) this.game.pause(); });
    window.addEventListener('contextmenu', e => { if (this.active) e.preventDefault(); });
    if (this.touch) document.body.classList.add('touch');
  }
  joystick(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    let x = (e.clientX - p.originX) / 46, y = (e.clientY - p.originY) / 46;
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    this.move.x = x; this.move.y = -y; this.nub.style.transform = `translate(calc(-50% + ${x * 39}px),calc(-50% + ${y * 39}px))`;
  }
  action(action, down, source = 'action') {
    const g = this.game;
    if (action === 'fire') this.fireSources.set(source, down);
    else if (action === 'ads') { if (this.touch) { if (down) this.ads = !this.ads; } else this.ads = down; }
    else if (action === 'lean-left') this.lean = down ? -1 : 0;
    else if (action === 'lean-right') this.lean = down ? 1 : 0;
    else if (down) {
      if (action === 'reload') g.reload();
      if (action === 'crouch') this.crouch = !this.crouch;
      if (action === 'flashlight') { g.flashlightOn = !g.flashlightOn; g.audio.click(); }
      if (action === 'grenade') g.throwGrenade();
      if (action === 'swap') g.swapWeapon();
      if (action === 'armory') g.ui.openArmory();
    }
    document.querySelectorAll('[data-combat]').forEach(el => { const a = el.dataset.combat; el.classList.toggle('engaged', a === 'fire' ? this.fire : a === 'ads' ? this.ads : a === 'crouch' ? this.crouch : a === 'flashlight' ? g.flashlightOn : a === action && down); });
  }
  consumeLook() { const look = { ...this.look }; this.look.x = this.look.y = 0; return look; }
  movement() {
    let x = this.move.x + (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let y = this.move.y + (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
  }
  reset() { this.keys.clear(); this.pointers.clear(); this.fireSources.clear(); this.ads = false; this.lean = 0; this.move.x = this.move.y = this.look.x = this.look.y = 0; if (this.nub) this.nub.style.transform = 'translate(-50%,-50%)'; document.querySelectorAll('[data-combat="fire"], [data-combat="ads"]').forEach(el => el.classList.remove('engaged')); }
}
