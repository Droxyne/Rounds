// Optical ADS uses an unobstructed camera view, not a camera inside a capped model.
// Native DMR optics and the optional 2× attachment share the same rendering path.
export function opticMagnification(weapon, attachments = []) {
  if (attachments.includes('scope')) return 2;
  if (weapon.style === 'sniper') return 4;
  if (weapon.style === 'dmr') return 2;
  return 1;
}
export function scopedFieldOfView(baseFov, magnification) {
  return 2 * Math.atan(Math.tan(baseFov / 2) / magnification);
}
