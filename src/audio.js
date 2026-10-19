// All sounds are synthesized locally. No downloads, codecs, or cross-origin audio.
export class AudioEngine {
  constructor() { this.ctx = null; this.volume = .65; }
  async unlock() {
    try {
      if (!this.ctx) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
        const limiter = this.ctx.createDynamicsCompressor(); limiter.threshold.value = -9; limiter.ratio.value = 12;
        this.master.connect(limiter); limiter.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0); let pink = 0;
        for (let i = 0; i < d.length; i++) { pink = .97 * pink + (Math.random() * 2 - 1) * .03; d[i] = (Math.random() * 2 - 1) * .7 + pink * 3; }
        const impulse = this.ctx.createBuffer(2, this.ctx.sampleRate * 1.8, this.ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const b = impulse.getChannelData(c); for (let i = 0; i < b.length; i++) b[i] = (Math.random() * 2 - 1) * Math.exp(-i / this.ctx.sampleRate * 4.5); }
        this.reverb = this.ctx.createConvolver(); this.reverb.buffer = impulse;
        const wet = this.ctx.createGain(); wet.gain.value = .22; this.reverb.connect(wet); wet.connect(this.master);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch (error) { console.warn('Audio unavailable; continuing silently.', error.message); }
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .03); }
  destination(position) {
    if (!position) return this.master;
    const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.maxDistance = 70; p.rolloffFactor = 1.2;
    p.positionX.value = position.x; p.positionY.value = position.y; p.positionZ.value = position.z; p.connect(this.master);
    setTimeout(() => p.disconnect(), 3000); return p;
  }
  tone(freq, duration, gain = .15, type = 'sine', delay = 0, endFreq = freq, destination = this.master) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), env = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(15, endFreq), t + duration);
    env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + .003); env.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(env); env.connect(destination); osc.start(t); osc.stop(t + duration + .02); osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }
  burst(duration, gain, frequency, delay = 0, destination = this.master, reverb = true) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay, source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), env = this.ctx.createGain();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = frequency;
    env.gain.setValueAtTime(gain, t); env.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter); filter.connect(env); env.connect(destination); if (reverb) env.connect(this.reverb);
    source.start(t, Math.random()); source.stop(t + duration); source.onended = () => { source.disconnect(); filter.disconnect(); env.disconnect(); };
  }
  shot(weapon, suppressed, position, indoors = true) {
    if (!this.ctx) return;
    const dest = this.destination(position), power = weapon.damage / 60;
    this.tone(suppressed ? 160 : 95, suppressed ? .07 : .18, suppressed ? .09 : .22 + power * .08, 'sine', 0, 28, dest);
    this.burst(suppressed ? .055 : .16, suppressed ? .13 : .43, suppressed ? 1100 : 4400, 0, dest, indoors);
    this.tone(1200, .025, .035, 'triangle', .012, 240, dest);
    if (!suppressed && indoors) { this.burst(.13, .07, 1800, .085, dest); this.burst(.16, .03, 1200, .19, dest); }
  }
  casing() { this.tone(2500 + Math.random() * 1000, .07, .025, 'triangle'); this.tone(1800, .05, .012, 'sine', .075); }
  reload(weapon) {
    this.burst(.08, .12, 1200, 0, this.master, false);
    this.tone(420, .06, .045, 'square', .12, 210);
    if (weapon.shellReload) { for (let i = 0; i < weapon.magazine; i++) this.tone(650, .05, .025, 'triangle', .3 + i * (weapon.reload - .8) / weapon.magazine, 350); }
    else { this.burst(.11, .1, 1800, weapon.reload * .65, this.master, false); this.tone(800, .045, .05, 'triangle', weapon.reload * .7, 380); }
    this.burst(.12, .12, 3000, weapon.reload - .35, this.master, false);
  }
  step(sprint = false) { this.burst(.09, sprint ? .12 : .065, 400, 0, this.master, false); this.tone(75, .08, .09, 'sine', 0, 35); }
  click() { this.tone(1100, .035, .04, 'square', 0, 250); }
  hit(head = false) { this.tone(head ? 1800 : 900, .07, .07, 'sine', 0, head ? 850 : 450); }
  hurt() { this.tone(62, .35, .22, 'sine', 0, 30); }
  explosion(position) { if (!this.ctx) return; const dest = this.destination(position); this.burst(1.2, .7, 1600, 0, dest); this.tone(70, .8, .5, 'sine', 0, 19, dest); }
  listener(position, forward) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) { l.positionX.value = position.x; l.positionY.value = position.y; l.positionZ.value = position.z; l.forwardX.value = forward.x; l.forwardY.value = forward.y; l.forwardZ.value = forward.z; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
  }
}
