import { WEAPONS, ATTACHMENTS, DEFAULT_SETTINGS } from './data.js';
const KEY = 'blackline-save-v1';
export function sanitizeSave(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  const validIds = new Set(WEAPONS.map(w => w.id));
  const owned = [...new Set(['g19', 'm4', ...(Array.isArray(raw.owned) ? raw.owned.filter(id => validIds.has(id)) : [])])];
  const attachments = {};
  for (const [id, list] of Object.entries(raw.attachments || {})) {
    if (validIds.has(id) && Array.isArray(list)) attachments[id] = [...new Set(list.filter(a => ATTACHMENTS.some(v => v.id === a)))];
  }
  const s = raw.settings || {};
  const clamp = (n, lo, hi, fallback) => Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Number(n))) : fallback;
  return { cash: clamp(raw.cash, 0, 9999999, 1200), owned, equipped: owned.includes(raw.equipped) ? raw.equipped : 'm4', attachments,
    bestWave: clamp(raw.bestWave, 0, 999, 0), kills: clamp(raw.kills, 0, 999999, 0),
    settings: { ...DEFAULT_SETTINGS, quality: ['Saver', 'Balanced', 'Ultra'].includes(s.quality) ? s.quality : 'Balanced', shadows: s.shadows !== false, post: s.post !== false, fov: clamp(s.fov, 65, 110, 88), sensitivity: clamp(s.sensitivity, .3, 2.5, 1), volume: clamp(s.volume, 0, 1, .65) } };
}
export class Store {
  constructor() {
    try { this.data = sanitizeSave(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { this.data = sanitizeSave(); }
    this.available = true;
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { this.available = false; } }
  earn(amount) { this.data.cash = Math.min(9999999, this.data.cash + Math.max(0, Math.round(amount))); this.save(); }
  buyWeapon(id) {
    const w = WEAPONS.find(w => w.id === id);
    if (!w || this.data.owned.includes(id) || this.data.cash < w.price) return false;
    this.data.cash -= w.price; this.data.owned.push(id); this.save(); return true;
  }
  buyAttachment(weaponId, id, free = false) {
    const a = ATTACHMENTS.find(a => a.id === id);
    if (!a || !WEAPONS.some(w => w.id === weaponId) || (!free && !this.data.owned.includes(weaponId))) return false;
    const list = this.data.attachments[weaponId] ||= ['light'];
    if (list.includes(id)) { list.splice(list.indexOf(id), 1); if (!free) this.data.cash += a.cost; this.save(); return true; }

    // Attachments are purchased per installation; switching optics/muzzle devices refunds the previous device.
    const conflicts = { holo: 'scope', scope: 'holo', suppressor: 'compensator', compensator: 'suppressor' };
    const previous = list.indexOf(conflicts[id]);
    const refund = previous >= 0 ? ATTACHMENTS.find(v => v.id === list[previous]).cost : 0;
    if (!free && this.data.cash + refund < a.cost) return false;
    if (previous >= 0) { const old = ATTACHMENTS.find(v => v.id === list[previous]); if (!free) this.data.cash += old.cost; list.splice(previous, 1); }
    if (!free) this.data.cash -= a.cost;
    list.push(id); this.save(); return true;
  }
}
