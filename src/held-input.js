// Separate ownership is essential when both fire buttons are held: releasing one
// must not stop the other. Mouse and captured touch pointers use distinct keys.
export class FireSources {
  constructor() { this.sources = new Set(); }
  set(source, down) { if (down) this.sources.add(source); else this.sources.delete(source); }
  get active() { return this.sources.size > 0; }
  clear() { this.sources.clear(); }
}
