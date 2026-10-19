import { WEAPONS, CATEGORIES, ATTACHMENTS, getWeapon } from './data.js';
const $ = selector => document.querySelector(selector);
const show = (selector, visible) => $(selector).classList.toggle('hidden', !visible);
const money = n => '$' + Math.round(n).toLocaleString('en-US');
export class UI {
  constructor(game) {
    this.game = game; this.mode = 'deployment'; this.category = 'All weapons'; this.selected = game.store.data.equipped; this.modal = null;
    document.addEventListener('pointerdown', e => {
      const button = e.target.closest('button'); if (!button || button.disabled) return;
      if (button.dataset.combat) return;
      game.audio.unlock();
      if (button.dataset.action) { e.preventDefault(); this.action(button.dataset.action); }
      if (button.dataset.mode) { this.mode = button.dataset.mode; this.updateModes(); game.audio.click(); }
      if (button.dataset.category) { this.category = button.dataset.category; this.renderArmory(false); }
      if (button.dataset.weapon) { this.selected = button.dataset.weapon; this.renderArmory(); }
      if (button.dataset.attachment) this.attach(button.dataset.attachment);
      if (button.dataset.quality) this.setting('quality', button.dataset.quality);
    });
    $('#equip-button').addEventListener('pointerdown', e => { e.preventDefault(); this.equip(); });
    $('#shadow-toggle').addEventListener('pointerdown', () => this.setting('shadows', !game.store.data.settings.shadows));
    $('#post-toggle').addEventListener('pointerdown', () => this.setting('post', !game.store.data.settings.post));
    ['fov', 'sensitivity', 'volume'].forEach(key => $('#' + key + '-setting').addEventListener('input', e => this.setting(key, Number(e.target.value))));
    const drag = $('#inspect-drag'); let pointer = null, x = 0, y = 0;
    drag.addEventListener('pointerdown', e => { pointer = e.pointerId; x = e.clientX; y = e.clientY; drag.setPointerCapture(pointer); e.preventDefault(); });
    drag.addEventListener('pointermove', e => { if (pointer !== e.pointerId || !game.preview) return; game.preview.root.rotation.y += (e.clientX - x) * .008; game.preview.root.rotation.x += (e.clientY - y) * .005; x = e.clientX; y = e.clientY; });
    const end = () => { pointer = null; }; drag.addEventListener('pointerup', end); drag.addEventListener('pointercancel', end);
    $('#retry').addEventListener('pointerdown', () => location.reload());
    this.updateCash(); this.renderSettings();
  }
  action(action) {
    const g = this.game;
    if (action === 'deploy' || action === 'redeploy') { this.closeModal(false); g.startGame(action === 'redeploy' ? g.mode : this.mode); }
    if (action === 'home') { this.closeModal(false); g.menu(); }
    if (action === 'armory') this.openArmory();
    if (action === 'settings' || action === 'manual') this.openModal(action);
    if (action === 'close-modal') this.closeModal();
    if (action === 'close-panel') g.leaveArmory();
    if (action === 'pause') g.pause();
    if (action === 'resume') { this.closeModal(false); g.resume(); }
    if (action === 'exit') { this.closeModal(false); g.menu(); }
  }
  boot(progress, status) { $('#boot-fill').style.width = progress + '%'; $('#boot-percent').textContent = String(Math.round(progress)).padStart(2, '0') + '%'; $('#boot-status').textContent = status; }
  ready() { show('#boot', false); show('#menu', true); }
  error(error) { show('#boot', false); show('#error', true); $('#error-message').textContent = error; }
  screen(name) { ['menu', 'hud', 'armory'].forEach(s => show('#' + s, s === name)); }
  updateModes() {
    document.querySelectorAll('[data-mode]').forEach(el => el.classList.toggle('selected', el.dataset.mode === this.mode));
    $('.deploy-button[data-action="deploy"] span').textContent = this.mode === 'training' ? 'ENTER TRAINING FACILITY' : 'DEPLOY TO SECTOR';
  }
  setScopeView(active, magnification = 2) {
    show('#scope-overlay', active);
    $('#scope-overlay').setAttribute('aria-hidden', String(!active));
    $('#scope-magnification').textContent = magnification + '× OPTIC';
    $('#crosshair').classList.toggle('hidden', active);
  }
  updateCash() { document.querySelectorAll('[data-cash]').forEach(el => el.textContent = money(this.game.store.data.cash)); }
  openModal(name) {
    const g = this.game;
    if (g.state === 'playing') g.pause(false);
    this.modalReturn = name !== 'pause' && name !== 'debrief' && g.state === 'paused' ? 'pause' : null;
    this.modal = name; show('#modal-backdrop', true); ['settings', 'manual', 'pause', 'debrief'].forEach(s => show('#' + s, s === name));
    if (name === 'settings') this.renderSettings();
  }
  closeModal(restore = true) {
    show('#modal-backdrop', false); this.modal = null;
    if (restore && this.modalReturn === 'pause') this.openModal('pause');
    this.modalReturn = null;
  }
  openArmory() { this.closeModal(false); this.selected = this.game.weapon?.id || this.game.store.data.equipped; this.category = 'All weapons'; this.game.enterArmory(); this.renderArmory(); }
  isTraining() { return this.game.mode === 'training' && this.game.armoryReturn !== 'menu'; }
  renderArmory(preview = true) {
    const g = this.game, w = getWeapon(this.selected), free = this.isTraining(), owned = free || g.store.data.owned.includes(w.id), equipped = g.weapon?.id === w.id;
    $('#category-tabs').innerHTML = CATEGORIES.map(c => `<button class="category-tab ${this.category === c ? 'active' : ''}" data-category="${c}">${c}</button>`).join('');
    $('#weapon-grid').innerHTML = WEAPONS.filter(w => this.category === 'All weapons' || w.category === this.category).map(w => `<button class="weapon-card ${w.id === this.selected ? 'selected' : ''}" data-weapon="${w.id}" aria-label="Inspect ${w.name}"><span class="gun-number">${String(WEAPONS.indexOf(w) + 1).padStart(2, '0')}</span><span class="owned-label">${free ? 'TRAINING / FREE' : g.store.data.owned.includes(w.id) ? 'OWNED' : money(w.price)}</span>${weaponSilhouette(w)}<b>${w.name}</b><small>${w.category.toUpperCase()} / ${w.magazine} RDS</small></button>`).join('');
    $('#weapon-index').textContent = String(WEAPONS.indexOf(w) + 1).padStart(2, '0') + ' / 20';
    $('#inspect-name').textContent = w.name; $('#inspect-category').textContent = w.category.toUpperCase() + ' / MODULAR WEAPON SYSTEM';
    const stats = [['DAMAGE', w.damage, 140], ['FIRE RATE', w.rpm, 1100], ['PRECISION', Math.round(100 - w.spread * 900), 100], ['CAPACITY', w.magazine, 100], ['RANGE', w.range, 150]];
    $('#weapon-stats').innerHTML = stats.map(([name, value, max]) => `<div class="stat-row"><span>${name}</span><div class="stat-track"><i style="width:${Math.max(4, value / max * 100)}%"></i></div><b>${value}</b></div>`).join('');
    const installed = g.attachmentsFor(w.id, free);
    $('#attachment-list').innerHTML = ATTACHMENTS.map(a => `<button class="attachment ${installed.includes(a.id) || (a.id === 'suppressor' && w.suppressed) ? 'installed' : ''}" data-attachment="${a.id}" title="${a.description}" ${!owned || (a.id === 'suppressor' && w.suppressed) ? 'disabled' : ''}><b>${a.name}</b><span>${a.id === 'suppressor' && w.suppressed ? 'INTEGRATED' : installed.includes(a.id) ? 'FITTED / REMOVE' : free || !a.cost ? 'FREE / INSTALL' : money(a.cost) + ' / INSTALL'}</span></button>`).join('');
    const canBuy = g.store.data.cash >= w.price;
    $('#equip-button').textContent = !owned ? canBuy ? 'ACQUIRE & EQUIP / ' + money(w.price) : 'INSUFFICIENT FUNDS / ' + money(w.price) : equipped ? 'EQUIPPED / READY FOR DEPLOYMENT' : 'EQUIP WEAPON';
    $('#equip-button').disabled = !owned && !canBuy;
    $('#equip-hint').textContent = free ? 'TRAINING ACCESS / ALL PLATFORMS UNLOCKED' : !owned ? 'PURCHASE IS SAVED TO YOUR LOCAL PROFILE' : 'ATTACHMENTS ARE REFUNDED WHEN REMOVED';
    $('.back-button span').textContent = g.armoryReturn === 'menu' ? 'BACK TO OPERATIONS' : 'RETURN TO OPERATION';
    if (preview) g.previewWeapon(w, installed);
    this.updateCash();
  }
  equip() {
    const g = this.game, free = this.isTraining(), w = getWeapon(this.selected);
    if (!free && !g.store.data.owned.includes(w.id) && !g.store.buyWeapon(w.id)) return this.toast('INSUFFICIENT FUNDS');
    if (!free) { g.store.data.equipped = w.id; g.store.save(); }
    g.equipWeapon(w.id); this.renderArmory(false); this.toast(w.name + ' EQUIPPED'); g.audio.click();
  }
  attach(id) {
    const g = this.game, free = this.isTraining(), w = getWeapon(this.selected);
    if (free) {
      const list = g.trainingAttachments[w.id] ||= ['light']; const index = list.indexOf(id);
      if (index >= 0) list.splice(index, 1);
      else { const conflict = { holo: 'scope', scope: 'holo', suppressor: 'compensator', compensator: 'suppressor' }[id]; const old = list.indexOf(conflict); if (old >= 0) list.splice(old, 1); list.push(id); }
    } else if (!g.store.buyAttachment(w.id, id)) return this.toast('INSUFFICIENT FUNDS FOR THIS ATTACHMENT');
    if (g.weapon.id === w.id) g.equipWeapon(w.id, true);
    this.renderArmory(); g.audio.click();
  }
  renderSettings() {
    const s = this.game.store.data.settings;
    $('#quality-options').innerHTML = ['Saver', 'Balanced', 'Ultra'].map(q => `<button class="${s.quality === q ? 'active' : ''}" data-quality="${q}">${q}</button>`).join('');
    ['shadows', 'post'].forEach((key, i) => { const el = $(i ? '#post-toggle' : '#shadow-toggle'); el.classList.toggle('on', s[key]); el.setAttribute('aria-checked', s[key]); });
    ['fov', 'sensitivity', 'volume'].forEach(key => $('#' + key + '-setting').value = s[key]);
    $('#fov-output').textContent = s.fov + '°'; $('#sensitivity-output').textContent = s.sensitivity.toFixed(1) + '×'; $('#volume-output').textContent = Math.round(s.volume * 100) + '%';
  }
  setting(key, value) { this.game.store.data.settings[key] = value; this.game.store.save(); this.game.applySettings(); this.renderSettings(); }
  toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }
  announce(title, subtitle) { $('#announcement b').textContent = title; $('#announcement small').textContent = subtitle; $('#announcement').style.opacity = 1; this.announceUntil = this.game.time + 4.5; }
  damagePopup(damage, point, head) {
    const g = this.game, screen = g.project(point); if (!screen || screen.z < 0 || screen.z > 1) return;
    const el = document.createElement('span'); el.className = 'damage-popup' + (head ? ' head' : ''); el.textContent = (head ? 'HEAD ' : '') + damage;
    el.style.left = (screen.x + Math.random() * 20 - 10) + 'px'; el.style.top = (screen.y - 25) + 'px'; $('#popups').append(el); setTimeout(() => el.remove(), 800);
  }
  hit(head) { $('#hitmarker').style.opacity = 1; $('#hitmarker').style.color = head ? '#e5a47b' : '#e8eddc'; clearTimeout(this.hitTimer); this.hitTimer = setTimeout(() => $('#hitmarker').style.opacity = 0, 130); }
  kill(head, reward) {
    const el = document.createElement('div'); el.textContent = (head ? '⊕ HEADSHOT' : '× HOSTILE NEUTRALIZED'); const amount = document.createElement('span'); amount.textContent = reward ? '+' + money(reward) : 'TRAINING'; el.append(amount); $('#kill-feed').prepend(el);
    while ($('#kill-feed').children.length > 4) $('#kill-feed').lastChild.remove(); setTimeout(() => el.remove(), 4500); this.updateCash();
  }
  debrief() {
    const d = this.game.director, accuracy = d.shots ? Math.min(100, Math.round(d.hits / d.shots * 100)) : 0;
    $('#debrief-stats').innerHTML = [[d.wave, 'WAVE REACHED'], [d.kills, 'ELIMINATIONS'], [accuracy + '%', 'ACCURACY']].map(([n, text]) => `<div><b>${n}</b><small>${text}</small></div>`).join(''); this.openModal('debrief');
  }
  resetHud() { $('#kill-feed').innerHTML = ''; $('#popups').innerHTML = ''; show('#training-hint', this.game.mode === 'training'); }
  update() {
    const g = this.game;
    if (g.state === 'menu') { const frames = Math.floor(g.time * 30); $('#menu-timecode').textContent = '00:' + String(Math.floor(frames / 1800) % 60).padStart(2, '0') + ':' + String(Math.floor(frames / 30) % 60).padStart(2, '0') + ':' + String(frames % 30).padStart(2, '0'); }
    if (g.state !== 'playing') return;
    const p = g.player;
    $('#health-value').textContent = Math.ceil(p.health); $('#health-fill').style.width = p.health + '%'; $('#health-fill').style.background = p.health < 30 ? '#df745c' : 'var(--lime)';
    $('#ammo-value').textContent = String(g.ammo).padStart(2, '0'); $('#reserve-value').textContent = g.mode === 'training' ? '∞' : g.reserve;
    $('#weapon-name').textContent = g.weapon.name; $('#fire-mode').textContent = g.weapon.category.toUpperCase() + ' / ' + (g.weapon.rpm > 500 ? 'AUTO' : 'SEMI');
    $('#grenade-count').textContent = String(p.grenades).padStart(2, '0') + ' FRAG GRENADES';
    $('#mission-label').textContent = g.mode === 'training' ? 'TRAINING FACILITY' : 'TACTICAL DEPLOYMENT';
    $('#wave-label').textContent = g.mode === 'training' ? 'FREE RANGE' : 'WAVE ' + String(g.director.wave).padStart(2, '0');
    $('#hostile-count').textContent = g.mode === 'training' ? 'ALL PLATFORMS UNLOCKED' : g.director.waveDelay > 0 ? 'REINFORCEMENTS IN ' + Math.ceil(g.director.waveDelay) + 's' : g.director.actors.filter(a => !a.dead).length + ' HOSTILES REMAINING';
    $('#bearing').textContent = String(Math.round(((p.yaw * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0');
    const sec = Math.floor(g.missionTime); $('#mission-clock').textContent = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(v => String(v).padStart(2, '0')).join(':');
    $('#damage-overlay').style.opacity = Math.min(.85, g.damageFlash + Math.max(0, (40 - p.health) / 80)); $('#cracked-visor').style.opacity = p.health < 45 ? .32 : g.damageFlash * .28;
    $('#crosshair').style.opacity = g.input.ads ? .16 : .75; $('#crosshair').style.transform = `translate(calc(-50% + ${g.aimX * 130}px),calc(-50% + ${g.aimY * 130}px)) scale(${1 + g.kick * 2})`;
    show('#reload-indicator', g.reloadTime > 0); if (g.reloadTime > 0) $('#reload-indicator i').style.width = (1 - g.reloadTime / g.weapon.reload) * 100 + '%';
    if (g.time > this.announceUntil) $('#announcement').style.opacity = 0;
  }
}
function weaponSilhouette(w) {
  const pistol = w.style === 'pistol' || w.style === 'revolver', bullpup = w.style === 'bullpup', shotgun = w.pellets;
  const barrel = pistol ? 32 + w.barrel * 40 : 36 + w.barrel * 37;
  return `<svg viewBox="0 0 200 65" aria-hidden="true"><g transform="translate(${pistol ? 46 : 0},3)"><path d="M${pistol ? 28 : 7} 27 ${pistol ? '36 20 44 20' : '10 12 37 18 48 18'} 48 13 100 13 100 18 ${100 + barrel} 18 ${100 + barrel} 25 100 25 100 33 65 33 62 49 51 49 52 32 40 32 ${pistol ? '28 27' : '8 34 7 27'}Z"/><path d="M75 33h16l${w.magazineShape === 'curved' ? '7 21-13 5-9-26' : '0 22H77Z'}" ${pistol || shotgun ? 'opacity="0"' : ''}/>${!pistol ? '<path d="M98 12h37v15H98Z" opacity=".7"/><path d="M67 9V2h20v7Z"/>' : ''}${w.suppressed ? `<path d="M${100 + barrel - 3} 15h22v14h-22Z"/>` : ''}${bullpup ? '<path d="M25 30h20v21H25Z"/>' : ''}${w.style === 'lmg' ? '<path d="M70 32h29v24H70Z"/>' : ''}<path d="M65 33v7h8v-7" fill="none" stroke="#9aa68c" stroke-width="2"/></g></svg>`;
}
