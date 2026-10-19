const gun = (id, name, category, price, damage, rpm, magazine, reload, spread, recoil, range, model = {}) => ({ id, name, category, price, damage, rpm, magazine, reload, spread, recoil, range, ...model });
export const WEAPONS = [
  gun('g19', 'G19 SERVICE', 'Pistols', 0, 29, 420, 17, 1.65, .009, .024, 30, { style: 'pistol', barrel: .16, color: 'black' }),
  gun('1911', '1911 OPERATOR', 'Pistols', 650, 43, 330, 8, 1.8, .007, .038, 32, { style: 'pistol', barrel: .21, color: 'tan' }),
  gun('usp', 'USP-S COVERT', 'Pistols', 950, 34, 400, 12, 1.9, .006, .026, 38, { style: 'pistol', barrel: .19, suppressed: true }),
  gun('revolver', 'R8 MAGNUM', 'Pistols', 1400, 85, 150, 6, 2.8, .005, .065, 60, { style: 'revolver', barrel: .3, color: 'steel' }),
  gun('mp5', 'MP5 A3', 'SMGs', 1200, 23, 800, 30, 2.1, .012, .019, 36, { style: 'smg', barrel: .28, magazineShape: 'curved', stock: 'wire' }),
  gun('mp7', 'MP7 A2', 'SMGs', 1650, 21, 950, 40, 2.2, .011, .015, 40, { style: 'smg', barrel: .2, magazineShape: 'grip', stock: 'wire' }),
  gun('vector', 'KRISS VECTOR', 'SMGs', 2200, 26, 1100, 25, 2.4, .014, .012, 30, { style: 'vector', barrel: .18, color: 'tan' }),
  gun('ump', 'UMP .45', 'SMGs', 1500, 32, 600, 25, 2.3, .01, .024, 35, { style: 'smg', barrel: .25, stock: 'skeleton' }),
  gun('m4', 'M4A1 SOPMOD', 'Assault rifles', 0, 34, 750, 30, 2.4, .006, .027, 70, { style: 'rifle', barrel: .46, optic: true }),
  gun('ak', 'AK-105', 'Assault rifles', 2400, 40, 650, 30, 2.65, .008, .036, 65, { style: 'ak', barrel: .4, magazineShape: 'curved', color: 'olive' }),
  gun('scar', 'SCAR-H', 'Assault rifles', 3400, 52, 550, 20, 2.8, .005, .042, 85, { style: 'rifle', barrel: .49, color: 'tan', stock: 'heavy' }),
  gun('aug', 'AUG A3', 'Assault rifles', 2900, 36, 720, 30, 2.5, .005, .025, 75, { style: 'bullpup', barrel: .43, color: 'olive', optic: true }),
  gun('870', '870 BREACHER', 'Shotguns', 1400, 17, 80, 8, 3.8, .065, .08, 20, { style: 'pump', barrel: .51, pellets: 8, shellReload: true }),
  gun('benelli', 'M4 SUPER 90', 'Shotguns', 2600, 15, 240, 7, 3.6, .06, .068, 22, { style: 'shotgun', barrel: .5, pellets: 8, shellReload: true }),
  gun('double', 'DB-12 CLASSIC', 'Shotguns', 800, 22, 170, 2, 2.8, .075, .095, 17, { style: 'double', barrel: .48, pellets: 10, color: 'wood' }),
  gun('shorty', 'SUPER SHORTY', 'Shotguns', 1100, 17, 90, 3, 2.5, .085, .075, 13, { style: 'pump', barrel: .22, pellets: 8, stock: 'none', shellReload: true }),
  gun('mk14', 'MK14 EBR', 'Marksman', 3800, 72, 300, 20, 2.9, .003, .055, 100, { style: 'dmr', barrel: .6, optic: true, color: 'steel' }),
  gun('awp', 'AWP PRECISION', 'Marksman', 5200, 140, 42, 5, 3.4, .001, .1, 150, { style: 'sniper', barrel: .75, optic: true, color: 'olive', bolt: true }),
  gun('dmr', 'SR-25 SUPPRESSED', 'Marksman', 4600, 66, 320, 20, 2.8, .002, .045, 110, { style: 'dmr', barrel: .58, optic: true, suppressed: true }),
  gun('saw', 'M249 SAW', 'Heavy', 4800, 32, 850, 100, 5.2, .015, .032, 80, { style: 'lmg', barrel: .55, magazineShape: 'box', color: 'tan' })
];
export const CATEGORIES = ['All weapons', 'Pistols', 'SMGs', 'Assault rifles', 'Shotguns', 'Marksman', 'Heavy'];
export const ATTACHMENTS = [
  { id: 'holo', name: 'HOLO SIGHT', cost: 350, description: 'Clear reticle · steadier ADS' },
  { id: 'scope', name: '2× OPTIC', cost: 600, description: 'Magnified sight picture' },
  { id: 'suppressor', name: 'SUPPRESSOR', cost: 750, description: 'Reduced report and muzzle flash' },
  { id: 'compensator', name: 'COMPENSATOR', cost: 450, description: '30% less vertical recoil' },
  { id: 'laser', name: 'LASER MODULE', cost: 300, description: '25% tighter hip-fire spread' },
  { id: 'light', name: 'TACTICAL LIGHT', cost: 0, description: 'Weapon-mounted illumination' }
];
export const getWeapon = id => WEAPONS.find(w => w.id === id) || WEAPONS[8];
export function damageAtRange(weapon, distance, headshot = false) {
  const falloff = Math.max(.3, 1 - Math.max(0, distance - weapon.range * .4) / (weapon.range * 1.5));
  return Math.round(weapon.damage * falloff * (headshot ? 2.5 : 1));
}
export function killReward(headshot) { return 150 + (headshot ? 100 : 0); }
export const DEFAULT_SETTINGS = { quality: 'Balanced', shadows: true, post: true, fov: 88, sensitivity: 1, volume: .65 };
