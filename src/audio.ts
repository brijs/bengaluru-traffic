// Real recorded horns (CC0, see public/sounds/CREDITS.md). Muted by default.
// Each clip is split into individual honks (offset, duration) listed in public/sounds/manifest.json.

export type HornKind = 'bike' | 'auto' | 'car' | 'bus' | 'truck';

interface Manifest {
  clips: Record<string, [number, number][]>;
  groups: Record<HornKind, string[]>;
  siren: string;
  ambience: string[];
}

const BASE = (import.meta as any).env?.BASE_URL ?? './';

export class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  on = false;
  private buf = new Map<string, AudioBuffer>();
  private man: Manifest | null = null;
  private loading: Promise<void> | null = null;
  private playing = 0; private lastHonk = 0; private lastSiren = 0;
  private amb: { src: AudioBufferSourceNode; gain: GainNode; name: string }[] = [];

  enable(v: boolean) {
    this.on = v;
    if (v && !this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
      } catch { this.on = false; return; }
    }
    if (!this.ctx) return;
    if (v) { this.ctx.resume(); this.loading ??= this.load(); }
    else this.ctx.suspend();
  }

  private async load() {
    try {
      const res = await fetch(BASE + 'sounds/manifest.json');
      this.man = await res.json();
      const names = new Set<string>([...Object.keys(this.man!.clips), this.man!.siren, ...this.man!.ambience]);
      await Promise.all([...names].map(async (n) => {
        try {
          const r = await fetch(`${BASE}sounds/${n}.mp3`);
          const ab = await r.arrayBuffer();
          this.buf.set(n, await this.ctx!.decodeAudioData(ab));
        } catch { /* skip a clip that fails to load */ }
      }));
      this.startAmbience();
    } catch { /* sounds unavailable: stay silent */ }
  }
  get loaded() { return this.buf.size; }

  private startAmbience() {
    if (!this.ctx || !this.master || !this.man) return;
    for (const name of this.man.ambience) {
      const b = this.buf.get(name);
      if (!b) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = b; src.loop = true;
      const gain = this.ctx.createGain(); gain.gain.value = 0;
      src.connect(gain); gain.connect(this.master);
      src.start(0, Math.random() * b.duration);
      this.amb.push({ src, gain, name });
    }
  }

  /** City bed: `level` 0..1 overall, `close` true when following a vehicle at street level. */
  setAmbience(level: number, close: boolean) {
    if (!this.ctx || !this.amb.length) return;
    const now = this.ctx.currentTime;
    for (const a of this.amb) {
      const tuk = a.name.includes('tuktuk');
      const target = this.on ? level * (tuk ? (close ? 0.55 : 0.08) : close ? 0.2 : 0.45) : 0;
      a.gain.gain.setTargetAtTime(target, now, 0.25);
    }
  }

  /** One honk: vol 0..1, pan -1..1 (screen position). */
  honk(vol: number, pan: number, kind: HornKind) {
    const ctx = this.ctx, man = this.man;
    if (!this.on || !ctx || !this.master || !man || vol < 0.04) return;
    const now = ctx.currentTime;
    if (this.playing > 6 || now - this.lastHonk < 0.06) return;
    const names = man.groups[kind].filter((n) => this.buf.has(n) && man.clips[n]?.length);
    if (!names.length) return;
    const name = names[Math.floor(Math.random() * names.length)];
    const segs = man.clips[name];
    const [off, dur0] = segs[Math.floor(Math.random() * segs.length)];
    const dur = Math.min(dur0, kind === 'bike' ? 0.5 : 1.4) * (0.7 + Math.random() * 0.5);
    const src = ctx.createBufferSource();
    src.buffer = this.buf.get(name)!;
    const rate = (kind === 'bike' ? 1.22 : kind === 'auto' ? 1.1 : kind === 'truck' ? 0.92 : 1) * (0.94 + Math.random() * 0.12);
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    const v = Math.min(1, vol) * (kind === 'truck' || kind === 'bus' ? 0.75 : 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + 0.008);
    g.gain.setValueAtTime(v, now + dur / rate);
    g.gain.linearRampToValueAtTime(0, now + dur / rate + 0.05);
    let node: AudioNode = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
    node.connect(this.master);
    src.connect(g);
    src.start(now, off, dur + 0.06);
    this.playing++; this.lastHonk = now;
    src.onended = () => { this.playing--; };
  }

  siren(vol: number, pan = 0) {
    const ctx = this.ctx, man = this.man;
    if (!this.on || !ctx || !this.master || !man || vol < 0.05) return;
    const b = this.buf.get(man.siren);
    if (!b || ctx.currentTime - this.lastSiren < 1.9) return;
    this.lastSiren = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(); const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.35 * vol, now + 0.15);
    g.gain.setValueAtTime(0.35 * vol, now + 1.8); g.gain.linearRampToValueAtTime(0, now + 2.1);
    let node: AudioNode = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
    node.connect(this.master);
    src.connect(g);
    src.start(now, Math.random() * Math.max(0, b.duration - 2.2), 2.2);
  }

  /** Crash: short muffled thump. */
  crash(vol: number) {
    const ctx = this.ctx;
    if (!this.on || !ctx || !this.master || vol < 0.05) return;
    const now = ctx.currentTime;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const src = ctx.createBufferSource(); src.buffer = b;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.6 * vol;
    src.connect(lp); lp.connect(g); g.connect(this.master); src.start(now);
  }
}
