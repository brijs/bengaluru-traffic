import { SLIDERS, SLIDER_BY_ID, defaultLevels, type Level, type Levels } from '../data/sliders';
import { Hazards, type Hazard } from './hazards';
import { FOOT_W, LANE_W, Network, type Lane, type Link, type Node } from './network';
import { clamp, mulberry32, smooth } from './rng';

// ───────────────────────────── vehicle types
export const enum VT { BIKE = 0, AUTO, CAR, BUS, TRUCK, TANKER, TRACTOR, AMBULANCE, PLAYER }
export const VSPEC = [
  { len: 2.0, wid: 0.8, vf: 1.05, a: 2.6, b: 3.6, T: 0.9, s0: 1.0, vcap: 99 },   // two-wheeler
  { len: 2.8, wid: 1.4, vf: 0.78, a: 1.6, b: 3.0, T: 1.1, s0: 1.4, vcap: 11 },   // auto
  { len: 4.3, wid: 1.8, vf: 1.0, a: 2.0, b: 3.2, T: 1.3, s0: 2.0, vcap: 99 },    // car / cab
  { len: 11, wid: 2.5, vf: 0.78, a: 1.1, b: 2.6, T: 1.6, s0: 2.5, vcap: 14 },    // BMTC bus
  { len: 8.5, wid: 2.5, vf: 0.72, a: 0.9, b: 2.4, T: 1.7, s0: 2.5, vcap: 12 },   // truck
  { len: 7.5, wid: 2.4, vf: 0.9, a: 1.1, b: 2.4, T: 1.4, s0: 2.2, vcap: 15 },    // water tanker
  { len: 5.0, wid: 2.2, vf: 0.4, a: 0.8, b: 2.2, T: 1.6, s0: 2.2, vcap: 6 },     // tractor
  { len: 5.6, wid: 2.1, vf: 1.25, a: 2.6, b: 3.6, T: 1.0, s0: 1.5, vcap: 99 },   // ambulance
  { len: 3.7, wid: 1.65, vf: 1.0, a: 2.0, b: 3.2, T: 1.3, s0: 2.0, vcap: 99 },   // your red Wagon R
];

export const T = {
  JUMP: 1, PHONE: 2, WEAVE: 4, TAIL: 8, SUDDEN: 16, HONKER: 32, FPRIDE: 64, STOPPER: 128,
  SPEEDER: 256, NOLIGHT: 512, GLARE: 1024, NOHELMET: 2048, CARGO: 4096, DRUNK: 8192, NOBELT: 16384,
} as const;
// Which slider each trait belongs to (for click popups and "fix this driver").
export const TRAIT_SLIDER: [number, string][] = [
  [T.JUMP, 'signalJump'], [T.PHONE, 'phones'], [T.WEAVE, 'weaving'], [T.TAIL, 'tailgating'], [T.SUDDEN, 'tailgating'],
  [T.HONKER, 'honking'], [T.FPRIDE, 'footpathRiding'], [T.STOPPER, 'midStops'], [T.SPEEDER, 'speeding'],
  [T.DRUNK, 'speeding'], [T.NOLIGHT, 'nightLights'], [T.GLARE, 'nightLights'], [T.NOHELMET, 'safetyGear'],
  [T.NOBELT, 'safetyGear'], [T.CARGO, 'cargo'],
];

export const enum S { DRIVE = 0, JUNCTION, CRASHED, DWELL, BAY, FOOTPATH, BROKEN }

export class Agent {
  id: number; active = false; type = VT.CAR; len = 4.3; wid = 1.8;
  link = 0; lane = 0; s = 0; v = 0; acc = 0; v0 = 12; a = 2; b = 3; Tg = 1.3; s0 = 2;
  state = S.DRIVE; stateT = 0; li = 0;
  lat = 0; latFrom = 0; latTo = 0; latT = 1; latDur = 1;
  dest = 0; retire = false; waitT = 0; stress = 0; honkCd = 0; age = 0; lcCd = 0;
  r = new Float32Array(12); traits = 0; fixed = false; // fixed = user "fixed this driver"
  next = -1; nextLane = 0; canGo = false; jump = false; jumpRoll = 0; gateT = -1;
  jx0 = 0; jz0 = 0; jx1 = 0; jz1 = 0; jx2 = 0; jz2 = 0; jL = 1; ju = 0; jBox = false; jPhase = 0; jNode = 0;
  brakeT = 0; evT = 0; slow = 0; yieldT = 0; laneFrom = -1; nextTurn = 0; redWarned = false; lastHid = -1; nextStop = 0; crash = -1; color = 0; cutT = 0;
  // render pose
  x = 0; z = 0; hx = 1; hz = 0;
  // ambulance
  amb = -1; ambArrT = -1;
  // player trip stats
  player = false; trip: Trip | null = null; manual = false;
  constructor(id: number) { this.id = id; }
}

export interface Ped {
  id: number; kind: 0 | 1 | 2 | 3; // 0 crosser, 1 road-walker, 2 footpath walker, 3 crossing cow
  link: number; s: number; lat: number; dir: number; v: number; pause: number; paused: boolean;
  x: number; z: number; hx: number; hz: number; down: boolean; scare: number; color: number; ghost?: boolean;
}
export interface Rider { id: number; link: number; s: number; v: number; lat: number; x: number; z: number; hx: number; hz: number }
export interface Crash {
  id: number; x: number; z: number; link: number; s: number; agents: number[]; t0: number; injured: boolean;
  amb: number; clearAt: number; kind: string; ped: number; dispatched: number; arrived: number; cleared: boolean;
}
export interface Fx { type: string; x: number; z: number; a?: number; t?: number; txt?: string }

interface Signal {
  node: number; phase: number; state: 0 | 1 | 2; t: number; greens: number[]; mode: 'ok' | 'broken' | 'mistimed' | 'adaptive';
  lastEntry: number[];
}

export interface Env { rain: boolean; event: boolean; surge: number; volume: number; }
export interface Trip {
  startT: number; startClock: number; dist: number; stops: number; honksAt: number; near: number; maxStress: number;
  stressSum: number; samples: number; waitT: number; done: boolean; outcome: '' | 'arrived' | 'crashed' | 'stuck';
  destNode: number; lastS: number; lastLink: number; lastV: number; endClock: number;
}

export interface Metrics {
  speedRatio: number; kmh: number; accPerHr: number; injPerHr: number; nearPerHr: number; pedPerHr: number;
  honkPerMin: number; stress: number; respMin: number; tripsPerHr: number; active: number; stuck: number;
  totalAcc: number; totalInj: number; totalHonk: number; warm: number;
}

const CLOCK_RATE = 10; // clock seconds per sim second
const DT = 0.1;

export const MOBILE_SCALE = { v: 1 };

// IDM interaction term helper
function sstar(v: number, dv: number, a: number, b: number, Tg: number, s0: number) {
  const x = v * Tg + (v * dv) / (2 * Math.sqrt(a * b));
  return s0 + (x > 0 ? x : 0);
}

export class Sim {
  net = new Network();
  haz: Hazards;
  agents: Agent[] = [];
  peds: Ped[] = [];
  riders: Rider[] = [];
  crashes: Crash[] = [];
  fx: Fx[] = [];
  levels: Levels = defaultLevels();
  e: Record<string, number> = {};
  env: Env = { rain: false, event: false, surge: 1, volume: 1 };
  onTripEnd?: (a: Agent) => void;
  /** Self-drive input (lane-based). turn: -1 left, 0 straight, +1 right at the next junction. */
  input = { up: false, down: false, turn: 0 };
  onManualEvent?: (kind: 'redlight' | 'blocked' | 'lane', a: Agent) => void;
  t = 0; clockMin = 9 * 60; dark = 0;
  baseCount = 1500;
  signals = new Map<number, Signal>();
  nextHop: Int32Array;
  linkSpeed: Float64Array;
  rnd = mulberry32(7);
  m: Metrics = { speedRatio: 0.6, kmh: 30, accPerHr: 0, injPerHr: 0, nearPerHr: 0, pedPerHr: 0, honkPerMin: 0, stress: 0.2, respMin: 0, tripsPerHr: 0, active: 0, stuck: 0, totalAcc: 0, totalInj: 0, totalHonk: 0, warm: 0 };
  private evAcc: number[] = []; private evInj: number[] = []; private evNear: number[] = []; private evPed: number[] = [];
  private evHonk: number[] = []; private evTrip: number[] = []; private resp: number[] = [];
  private pedId = 1; private riderId = 1; private crashId = 1;
  private boxCount: Int32Array; private boxPhase: Int32Array;
  private jOcc: Int32Array; // vehicles currently inside each junction, per approach phase (node*4+phase)
  private routeT = 0; private acc = 0;
  private destW: number[] = [];
  private hospitals: number[] = [];
  private spawnLinks: number[] = []; private spawnW: number[] = []; private spawnTot = 0;
  onLevels?: () => void;

  constructor(opts: { count?: number } = {}) {
    if (opts.count) this.baseCount = opts.count;
    this.haz = new Hazards(this.net);
    const N = this.net.nodes.length;
    this.nextHop = new Int32Array(N * N).fill(-1);
    this.linkSpeed = new Float64Array(this.net.links.length);
    this.net.links.forEach((l, i) => (this.linkSpeed[i] = l.vmax));
    this.boxCount = new Int32Array(N);
    this.boxPhase = new Int32Array(N);
    this.jOcc = new Int32Array(N * 4);
    for (let i = 0; i < 3800; i++) this.agents.push(new Agent(i));
    // destinations
    for (const nd of this.net.nodes) {
      const area = this.net.links[nd.outs[0]]?.area ?? 'res';
      const w = nd.kind === 'end' ? 1.6 : area === 'tech' ? 2.6 : area === 'cbd' ? 2.2 : area === 'market' ? 2 : 1;
      this.destW.push(w);
      if (nd.def.hospital) this.hospitals.push(nd.id);
    }
    for (const l of this.net.links) {
      const w = l.len * (l.road.ring ? 1.3 : 1) * (this.net.nodes[l.from].kind === 'end' ? 3 : 1);
      this.spawnLinks.push(l.id); this.spawnW.push(w); this.spawnTot += w;
    }
    for (const nd of this.net.nodes) if (nd.kind === 'signal' && nd.ins.length >= 2) {
      this.signals.set(nd.id, { node: nd.id, phase: 0, state: 0, t: 0, greens: new Array(nd.nPhases).fill(14), mode: 'ok', lastEntry: new Array(nd.nPhases).fill(-99) });
    }
    this.computeE();
    this.haz.regenerate(this.levels, this.env.rain, 0);
    this.configureSignals();
    this.reroute();
    this.seedFootWalkers();
    this.fitRiders();
  }

  // ───────────────────────────── controls
  setLevel(id: string, lv: Level) {
    if (this.levels[id] === lv) return;
    this.levels[id] = lv;
    this.afterLevels(id);
  }
  setLevels(lv: Levels) {
    this.levels = { ...lv };
    this.haz.removed.clear(); this.haz.added.clear(); this.haz.sevUp.clear();
    this.afterLevels();
  }
  private afterLevels(changed?: string) {
    this.computeE();
    this.haz.regenerate(this.levels, this.env.rain, this.t, changed);
    this.configureSignals();
    for (const a of this.agents) if (a.active) this.assignTraits(a);
    if (changed === 'wrongWay' || !changed) this.fitRiders();
    this.onLevels?.();
  }
  setRain(r: boolean) { this.env.rain = r; this.haz.regenerate(this.levels, r, this.t, undefined); this.onLevels?.(); }
  setClock(min: number) { this.clockMin = ((min % 1440) + 1440) % 1440; this.updateDark(); }

  computeE() {
    const enf = (this.levels.enforcement ?? 0) / 3;
    const amp = 0.55 + 0.45 * enf;
    for (const s of SLIDERS) {
      let e = (this.levels[s.id] ?? 0) / 3;
      if (s.behaviour) e *= amp;
      this.e[s.id] = e;
    }
  }
  E(id: string) { return this.e[id] ?? 0; }
  amp() { return 0.55 + 0.45 * ((this.levels.enforcement ?? 0) / 3); }

  private updateDark() {
    const h = this.clockMin / 60;
    // dark 19:15–05:45, twilight ramps
    this.dark = h >= 12 ? smooth(18.0, 19.4, h) : 1 - smooth(5.5, 6.9, h);
  }

  demandFactor() {
    const h = this.clockMin / 60;
    const prof = [0.22, 0.18, 0.16, 0.16, 0.2, 0.3, 0.5, 0.78, 1, 1, 0.92, 0.78, 0.74, 0.72, 0.72, 0.76, 0.86, 1, 1, 1, 0.85, 0.62, 0.45, 0.32, 0.22];
    const i = Math.floor(h), f = h - i;
    const d = prof[i] + (prof[i + 1] - prof[i]) * f;
    const ed = this.E('demand');
    return d * (0.58 + 0.42 * ed) * this.env.surge * this.env.volume * (this.env.event ? 1.06 : 1);
  }
  targetCount() { return Math.round(this.baseCount * MOBILE_SCALE.v * this.demandFactor()); }

  configureSignals() {
    const lvl = this.levels.signals ?? 0;
    const r = mulberry32(99);
    const mistimeFrac = [0, 0.3, 0.55, 0.75][lvl];
    for (const [nid, sig] of this.signals) {
      const nd = this.net.nodes[nid];
      if (this.haz.brokenNodes.has(nid)) sig.mode = 'broken';
      else if (lvl === 0) sig.mode = 'adaptive';
      else if (r() < mistimeFrac) sig.mode = 'mistimed';
      else sig.mode = 'ok';
      for (let p = 0; p < nd.nPhases; p++) {
        sig.greens[p] = sig.mode === 'mistimed' ? 6 + Math.floor(r() * 22) : 14;
      }
    }
  }

  // ───────────────────────────── traits
  assignTraits(a: Agent) {
    if (a.type === VT.AMBULANCE) { a.traits = 0; return; }
    const r = a.r, bike = a.type === VT.BIKE, car = a.type === VT.CAR || a.type === VT.AUTO;
    let t = 0;
    if (a.fixed) { a.traits = 0; this.applySpeedTraits(a); return; }
    const E = (k: string) => this.E(k);
    if (r[0] < 0.32 * E('signalJump')) t |= T.JUMP;
    if ((bike || car) && r[1] < 0.2 * E('phones')) t |= T.PHONE;
    if (r[2] < (bike ? 0.65 : a.type === VT.AUTO ? 0.5 : 0.25) * E('weaving')) t |= T.WEAVE;
    if (r[3] < 0.5 * E('tailgating')) t |= T.TAIL;
    if (r[4] < 0.14 * E('tailgating')) t |= T.SUDDEN;
    if (r[5] < 0.12 + 0.6 * E('honking')) t |= T.HONKER;
    if (bike && r[6] < 0.55 * E('footpathRiding')) t |= T.FPRIDE;
    if ((a.type === VT.AUTO || a.type === VT.CAR) && r[7] < 0.35 * E('midStops')) t |= T.STOPPER;
    if (r[8] < (0.06 + 0.22 * this.dark) * E('speeding') * 1.5) t |= T.SPEEDER;
    if (r[8] < 0.08 * this.dark * E('speeding')) t |= T.DRUNK;
    if (r[9] < 0.32 * E('nightLights')) t |= T.NOLIGHT;
    if (r[10] < 0.3 * E('nightLights')) t |= T.GLARE;
    if (bike && r[11] < 0.12 + 0.62 * E('safetyGear')) t |= T.NOHELMET;
    if (a.type === VT.CAR && r[11] < 0.15 + 0.6 * E('safetyGear')) t |= T.NOBELT;
    if ((a.type === VT.TRUCK) && r[7] < 0.7 * E('cargo')) t |= T.CARGO;
    a.traits = t;
    this.applySpeedTraits(a);
  }
  private applySpeedTraits(a: Agent) {
    const sp = VSPEC[a.type];
    a.Tg = sp.T; a.s0 = sp.s0; a.a = sp.a; a.b = sp.b;
    if (a.traits & T.TAIL) { a.Tg = sp.T * 0.45; a.s0 = sp.s0 * 0.5; }
    if (a.traits & T.PHONE) { a.Tg += 0.5; a.a *= 0.75; }
    if (this.levels.markings) a.Tg += 0.12 * (this.levels.markings / 3);
    const haze = this.E('haze');
    a.Tg += haze * 0.3;
  }

  // ───────────────────────────── spawning
  private pickType(): VT {
    const eh = this.E('heavy'), ed = this.E('demand');
    const w = [0.40, 0.12, 0.30 * (0.7 + 0.3 * ed), 0.09 - 0.045 * ed, 0.008 + 0.042 * eh, 0.006 + 0.03 * eh, 0.012 * eh];
    const tot = w.reduce((x, y) => x + y, 0);
    let x = this.rnd() * tot;
    for (let i = 0; i < w.length; i++) { if (x < w[i]) return i as VT; x -= w[i]; }
    return VT.CAR;
  }
  private pickDest(exclude: number): number {
    const tot = this.destW.reduce((a, b) => a + b, 0);
    for (let k = 0; k < 6; k++) {
      let x = this.rnd() * tot, i = 0;
      while (i < this.destW.length - 1 && x > this.destW[i]) { x -= this.destW[i]; i++; }
      if (i !== exclude) return i;
    }
    return (exclude + 1) % this.net.nodes.length;
  }
  private freeAgent(): Agent | null {
    for (let k = 0; k < this.agents.length; k++) {
      const a = this.agents[(this.spawnCursor + k) % this.agents.length];
      if (!a.active) { this.spawnCursor = (a.id + 1) % this.agents.length; return a; }
    }
    return null;
  }
  private spawnCursor = 0;

  spawn(opts: { type?: VT; link?: number; s?: number; lane?: number; force?: boolean } = {}): Agent | null {
    const a = this.freeAgent();
    if (!a) return null;
    const type = opts.type ?? this.pickType();
    let link: Link;
    if (opts.link !== undefined) link = this.net.links[opts.link];
    else {
      let x = this.rnd() * this.spawnTot, i = 0;
      while (i < this.spawnLinks.length - 1 && x > this.spawnW[i]) { x -= this.spawnW[i]; i++; }
      link = this.net.links[this.spawnLinks[i]];
    }
    const sp = VSPEC[type];
    const fromEnd = this.net.nodes[link.from].kind === 'end';
    const lane = opts.lane ?? (type === VT.BUS || type === VT.TRACTOR || type === VT.AUTO ? 0 : Math.floor(this.rnd() * link.nLanes));
    const L = link.lanes[Math.min(lane, link.nLanes - 1)];
    const s = opts.s ?? (fromEnd ? 1 + this.rnd() * 6 : 10 + this.rnd() * Math.max(1, link.len - 30));
    // gap check
    if (!opts.force) {
      for (const o of L.agents) if (o.s > s - sp.len - 8 && o.s - o.len < s + 8) return null;
      for (const o of L.obs) if (Math.abs(o.s - s) < o.half + sp.len + 4) return null;
    }
    a.active = true; a.type = type; a.len = sp.len; a.wid = sp.wid;
    a.link = link.id; a.lane = L.idx; a.s = s; a.state = S.DRIVE; a.stateT = 0;
    const vcap = type === VT.TRACTOR ? sp.vcap : Math.min(sp.vcap, link.vmax * sp.vf * 1.2);
    a.v0 = Math.min(vcap, link.vmax * sp.vf) * (0.9 + this.rnd() * 0.2);
    a.v = a.v0 * 0.5; a.acc = 0;
    a.dest = this.pickDest(link.to); a.retire = false; a.waitT = 0; a.stress = 0.1 + this.rnd() * 0.1; a.honkCd = this.rnd() * 3;
    a.age = 0; a.lcCd = this.rnd(); a.next = -1; a.canGo = false; a.jump = false; a.gateT = -1; a.jBox = false;
    a.brakeT = 0; a.yieldT = 0; a.lastHid = -1; a.crash = -1; a.amb = -1; a.ambArrT = -1; a.fixed = false; a.cutT = 0; a.player = false; a.trip = null; a.manual = false;
    a.nextStop = 0; while (a.nextStop < link.busStops.length && link.busStops[a.nextStop] < s) a.nextStop++;
    for (let i = 0; i < a.r.length; i++) a.r[i] = this.rnd();
    a.color = Math.floor(this.rnd() * 1e6);
    a.lat = a.latFrom = a.latTo = this.net.laneLat(link, a.lane); a.latT = 1;
    this.assignTraits(a);
    if (a.traits & T.SPEEDER) a.v0 *= 1.35;
    L.agents.push(a);
    this.poseAgent(a);
    return a;
  }

  private despawn(a: Agent) {
    if (a.player && a.trip && !a.trip.done) { a.trip.done = true; a.trip.endClock = this.clockMin; if (!a.trip.outcome) a.trip.outcome = a.crash >= 0 ? 'crashed' : 'stuck'; this.onTripEnd?.(a); }
    if (a.state === S.DRIVE || a.state === S.CRASHED || a.state === S.DWELL || a.state === S.BROKEN) {
      const L = this.net.links[a.link].lanes[a.lane];
      const i = L.agents.indexOf(a);
      if (i >= 0) L.agents.splice(i, 1);
    }
    if (a.state === S.JUNCTION) {
      const nl = this.net.links[a.next]?.lanes[a.nextLane];
      if (nl) nl.reserved = Math.max(0, nl.reserved - (a.len + 2));
      if (a.jBox) this.boxCount[a.jNode] = Math.max(0, this.boxCount[a.jNode] - 1);
      this.jOcc[a.jNode * 4 + (a.jPhase & 3)] = Math.max(0, this.jOcc[a.jNode * 4 + (a.jPhase & 3)] - 1);
    }
    a.active = false;
  }

  // ───────────────────────────── routing
  reroute() {
    const net = this.net, N = net.nodes.length;
    const cost = net.links.map((l, i) => l.len / Math.max(1.2, this.linkSpeed[i]) + (this.signals.has(l.to) ? 7 : 1.5));
    const dist = new Float64Array(N), done = new Uint8Array(N);
    for (let d = 0; d < N; d++) {
      dist.fill(1e12); done.fill(0); dist[d] = 0;
      for (let it = 0; it < N; it++) {
        let u = -1, best = 1e12;
        for (let i = 0; i < N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u < 0) break;
        done[u] = 1;
        for (const li of net.nodes[u].ins) {
          const l = net.links[li], nd = dist[u] + cost[li];
          if (nd < dist[l.from]) { dist[l.from] = nd; this.nextHop[d * N + l.from] = li; }
        }
      }
    }
  }
  private chooseNext(a: Agent): number {
    const l = this.net.links[a.link], node = l.to;
    if (a.manual) {
      if (node === a.dest && a.trip) { a.trip.outcome = 'arrived'; return -1; }
      const nd = this.net.nodes[node];
      const outs = nd.outs.filter((o) => o !== l.rev);
      if (!outs.length) return nd.outs.length ? nd.outs[0] : -1;
      const d0 = this.net.pose(l, l.len, 0);
      const d0x = d0.dx, d0z = d0.dz;
      let best = outs[0], bs = -1e9;
      for (const o of outs) {
        const p = this.net.pose(this.net.links[o], 2, 0);
        const cross = d0x * p.dz - d0z * p.dx, dot = d0x * p.dx + d0z * p.dz;
        const score = this.input.turn === 0 ? dot : this.input.turn < 0 ? -cross + dot * 0.2 : cross + dot * 0.2;
        if (score > bs) { bs = score; best = o; }
      }
      return best;
    }
    if (a.type === VT.AMBULANCE && a.amb >= 0) {
      const c = this.crashes.find((x) => x.id === a.amb);
      if (c) {
        const cl = this.net.links[c.link];
        if (cl.from === node) return cl.id;
        const h = this.nextHop[cl.from * this.net.nodes.length + node];
        if (h >= 0) return h;
      }
    }
    if (node === a.dest) {
      if (a.player) { if (a.trip) a.trip.outcome = 'arrived'; return -1; }
      if (this.net.nodes[node].kind === 'end') return -1;
      a.dest = this.pickDest(node);
      this.evTrip.push(this.t);
    }
    if (this.net.nodes[node].kind === 'end') return -1;
    let h = this.nextHop[a.dest * this.net.nodes.length + node];
    if (h < 0 || (h === l.rev && this.net.nodes[node].outs.length > 1 && this.rnd() < 0.8)) {
      const outs = this.net.nodes[node].outs.filter((o) => o !== l.rev);
      h = outs.length ? outs[Math.floor(this.rnd() * outs.length)] : l.rev;
    }
    return h;
  }

  // ───────────────────────────── geometry
  private tmp = { x: 0, z: 0, dx: 1, dz: 0 };
  poseAgent(a: Agent) {
    if (a.state === S.JUNCTION) {
      const u = clamp(a.ju, 0, 1), w = 1 - u;
      a.x = w * w * a.jx0 + 2 * w * u * a.jx1 + u * u * a.jx2;
      a.z = w * w * a.jz0 + 2 * w * u * a.jz1 + u * u * a.jz2;
      let dx = 2 * w * (a.jx1 - a.jx0) + 2 * u * (a.jx2 - a.jx1), dz = 2 * w * (a.jz1 - a.jz0) + 2 * u * (a.jz2 - a.jz1);
      const d = Math.hypot(dx, dz) || 1;
      a.hx = dx / d; a.hz = dz / d;
      return;
    }
    const l = this.net.links[a.link];
    const p = this.net.pose(l, a.s - a.len / 2, a.lat, this.tmp);
    a.x = p.x; a.z = p.z; a.hx = p.dx; a.hz = p.dz;
  }

  // ───────────────────────────── signals
  private stepSignals(dt: number) {
    const AMBER = 2.5, RED = 1.5;
    for (const sig of this.signals.values()) {
      if (sig.mode === 'broken') continue;
      const nd = this.net.nodes[sig.node];
      sig.t += dt;
      if (sig.state === 0) {
        let g = sig.greens[sig.phase];
        if (sig.mode === 'adaptive') {
          const q = this.queueOf(nd, sig.phase), others = this.maxOtherQueue(nd, sig.phase);
          g = clamp(5 + q * 1.3, 6, 26);
          if (sig.t > 5 && q === 0 && others > 0) g = 0;
        }
        if (sig.t >= g) { sig.state = 1; sig.t = 0; }
      } else if (sig.state === 1) { if (sig.t >= AMBER) { sig.state = 2; sig.t = 0; } }
      else if (sig.t >= RED) {
        sig.state = 0; sig.t = 0;
        let p = (sig.phase + 1) % nd.nPhases;
        if (sig.mode === 'adaptive') {
          for (let k = 0; k < nd.nPhases; k++) { const c = (sig.phase + 1 + k) % nd.nPhases; if (this.queueOf(nd, c) > 0) { p = c; break; } }
        }
        sig.phase = p;
      }
    }
  }
  private queueOf(nd: Node, phase: number) {
    let q = 0;
    for (const li of nd.ins) if (nd.phaseOf.get(li) === phase) {
      const l = this.net.links[li];
      for (const L of l.lanes) for (let i = L.agents.length - 1; i >= 0; i--) { const a = L.agents[i]; if (a.s < l.len - 60) break; if (a.v < 2) q++; }
    }
    return q;
  }
  private maxOtherQueue(nd: Node, phase: number) {
    let m = 0;
    for (let p = 0; p < nd.nPhases; p++) if (p !== phase) m = Math.max(m, this.queueOf(nd, p));
    return m;
  }
  signalState(nodeId: number, linkId: number): 'g' | 'a' | 'r' | 'off' | 'none' {
    const sig = this.signals.get(nodeId);
    if (!sig) return 'none';
    if (sig.mode === 'broken') return 'off';
    const ph = this.net.nodes[nodeId].phaseOf.get(linkId);
    if (ph !== sig.phase) return 'r';
    return sig.state === 0 ? 'g' : sig.state === 1 ? 'a' : 'r';
  }
  signalMode(nodeId: number) { return this.signals.get(nodeId)?.mode; }

  // ───────────────────────────── gate: may this agent enter the junction now?
  private gate(a: Agent, l: Link): boolean {
    if (a.next < 0) return true;
    const nd = this.net.nodes[l.to];
    const ph = nd.phaseOf.get(l.id) ?? 0;
    const sig = this.signals.get(nd.id);
    const amb = a.type === VT.AMBULANCE;
    const corridor = 1 - this.E('emergency');
    let ok = true;
    let risky = false;
    if (sig && sig.mode !== 'broken') {
      const st = sig.phase === ph ? sig.state : 2;
      ok = st === 0 || (st === 1 && l.len - a.s < 6 + a.v * 0.6);
      if (!ok && (a.traits & T.JUMP) && a.jumpRoll < 0.75 && a.v > 1) { ok = true; risky = true; }
      if (!ok && (a.traits & T.JUMP) && a.waitT > 3 && a.jumpRoll < 0.35) { ok = true; risky = true; }
      if (!ok && amb && a.jumpRoll < 0.2 + corridor * 0.8) ok = true;
    } else if (sig && sig.mode === 'broken') {
      // uncontrolled: give way to another stream that entered in the last 1.8 s
      for (let p = 0; p < nd.nPhases; p++) if (p !== ph && this.t - sig.lastEntry[p] < 1.8) ok = false;
      if (!ok && a.waitT > 3 && a.jumpRoll < 0.25 + 0.5 * this.E('junctions')) { ok = true; risky = true; }
    }
    // a vehicle stuck inside the junction box blocks the other streams
    if (ok && this.boxCount[nd.id] > 0 && this.boxPhase[nd.id] !== ph && !amb) ok = false;
    // don't drive into a junction while cross traffic is still inside it (signal jumpers may)
    if (ok && sig && !risky && !amb) for (let p = 0; p < Math.min(4, nd.nPhases); p++) if (p !== ph && this.jOcc[nd.id * 4 + p] > 0) ok = false;
    if (!ok) return false;
    const nl = this.net.links[a.next];
    const lane = this.pickLaneIn(nl, a);
    a.nextLane = lane;
    const L = nl.lanes[lane];
    const last = L.agents[0];
    const rear = (last ? last.s - last.len : nl.len) - L.reserved;
    const space = rear > a.len + 1.5;
    if (!space) {
      const bad = this.haz.badNodes.has(nd.id);
      const push = (bad ? 0.55 : 0.1) * this.E('junctions') + (bad ? 0.1 : 0);
      if (!(a.r[2] < push && a.waitT < 8)) return false;
      a.jBox = true;
    } else a.jBox = false;
    a.jump = risky;
    return true;
  }
  private pickLaneIn(nl: Link, a: Agent): number {
    if (nl.nLanes === 1) return 0;
    const pref = a.type === VT.BUS || a.type === VT.TRACTOR || a.type === VT.AUTO ? 0 : Math.min(a.lane, nl.nLanes - 1);
    let best = pref, bestRear = -1e9;
    for (let i = 0; i < nl.nLanes; i++) {
      const L = nl.lanes[i];
      const last = L.agents[0];
      let rear = (last ? last.s - last.len : nl.len) - L.reserved;
      for (const o of L.obs) if (o.s - o.half < 25) rear = Math.min(rear, o.s - o.half);
      rear += i === pref ? 6 : 0;
      if (rear > bestRear) { bestRear = rear; best = i; }
    }
    return best;
  }

  private enterJunction(a: Agent, l: Link) {
    const nd = this.net.nodes[l.to];
    const nl = this.net.links[a.next];
    const ph = nd.phaseOf.get(l.id) ?? 0;
    const sig = this.signals.get(nd.id);
    // conflict with another stream?
    if (sig) {
      let near = false;
      for (let p = 0; p < nd.nPhases; p++) if (p !== ph && this.t - sig.lastEntry[p] < 1.0) near = true;
      if (near && (a.jump || sig.mode === 'broken')) this.conflict('tbone', a, null, 0.009 * (this.haz.badNodes.has(nd.id) ? 1.5 : 1));
      sig.lastEntry[ph] = this.t;
    } else if (this.haz.badNodes.has(nd.id) && this.rnd() < 0.04 * this.E('junctions')) {
      this.conflict('side', a, null, 0.1);
    }
    {
      const TL = nl.lanes[a.nextLane], last = TL.agents[0];
      const rear = (last ? last.s - last.len : nl.len) - TL.reserved;
      if (rear <= a.len + 1) a.jBox = true;
    }
    const L = l.lanes[a.lane];
    const i = L.agents.indexOf(a);
    if (i >= 0) L.agents.splice(i, 1);
    const p0 = this.net.pose(l, l.len, a.lat);
    const x0 = p0.x, z0 = p0.z, d0x = p0.dx, d0z = p0.dz;
    const p2 = this.net.pose(nl, 0, this.net.laneLat(nl, a.nextLane));
    const x2 = p2.x, z2 = p2.z, d2x = p2.dx, d2z = p2.dz;
    // control point: tangent intersection, else node centre
    let cx = nd.x, cz = nd.z;
    const den = d0x * d2z - d0z * d2x;
    if (Math.abs(den) > 0.2) {
      const t = ((x2 - x0) * d2z - (z2 - z0) * d2x) / den;
      const D = Math.hypot(x2 - x0, z2 - z0);
      if (t > 0 && t < D * 2 + 10) { cx = x0 + d0x * t; cz = z0 + d0z * t; }
    } else if (d0x * d2x + d0z * d2z < 0) { cx = nd.x + d0x * nd.r * 0.9; cz = nd.z + d0z * nd.r * 0.9; }
    else { cx = (x0 + x2) / 2; cz = (z0 + z2) / 2; }
    a.jx0 = x0; a.jz0 = z0; a.jx1 = cx; a.jz1 = cz; a.jx2 = x2; a.jz2 = z2;
    a.jL = Math.max(2, (Math.hypot(cx - x0, cz - z0) + Math.hypot(x2 - cx, z2 - cz) + Math.hypot(x2 - x0, z2 - z0)) / 2);
    a.ju = Math.max(0, (a.s - l.len) / a.jL);
    a.state = S.JUNCTION; a.jNode = nd.id; a.jPhase = ph;
    this.jOcc[nd.id * 4 + (ph & 3)]++;
    nl.lanes[a.nextLane].reserved += a.len + 2;
    if (a.jBox) { this.boxCount[nd.id]++; this.boxPhase[nd.id] = ph; }
  }

  private stepJunction(a: Agent, dt: number) {
    const nd = this.net.nodes[a.jNode];
    const nl = this.net.links[a.next];
    const L = nl.lanes[a.nextLane];
    const bad = this.haz.badNodes.has(nd.id);
    if (a.jBox) {
      const last = L.agents[0];
      const rear = last ? last.s - last.len : nl.len;
      if (a.ju >= 0.45) { a.ju = 0.45; a.v = 0; a.waitT += dt; }
      if (rear > a.len + 0.5) { a.jBox = false; this.boxCount[nd.id] = Math.max(0, this.boxCount[nd.id] - 1); }
      else if (a.waitT > (a.player ? 600 : 45)) { this.m.stuck++; this.despawn(a); return; }
      if (a.jBox && a.ju >= 0.45) return;
    }
    const vt = Math.min(a.v0, bad ? 4.5 : 7.5);
    a.v = Math.min(vt, a.v + a.a * dt);
    if (a.v < vt * 0.5) a.v = vt * 0.5;
    // keep spacing behind the vehicle ahead on the same turning path
    let maxU = 1e9;
    for (const o of this.jMap.get(a.next * 8 + a.nextLane) ?? []) {
      if (o === a || o.ju <= a.ju) continue;
      maxU = Math.min(maxU, o.ju - (o.len + 0.6) / a.jL);
    }
    let nu = a.ju + (a.v * dt) / a.jL;
    if (nu > maxU) { nu = Math.max(a.ju, maxU); a.v = Math.max(0, (nu - a.ju) * a.jL / dt); }
    a.ju = nu;
    if (a.ju >= 1) {
      const last = L.agents[0];
      let s = (a.ju - 1) * a.jL;
      // the lane ahead is full: wait at the junction exit rather than overlap the car in front
      if (last && last.s - last.len < 0.4) { a.ju = 0.999; a.v = 0; a.waitT += dt; if (a.waitT > (a.player ? 600 : 50)) { this.m.stuck++; this.despawn(a); } return; }
      if (last && last.s - last.len < s + 0.3) s = Math.max(0, last.s - last.len - 0.3);
      L.reserved = Math.max(0, L.reserved - (a.len + 2));
      this.jOcc[a.jNode * 4 + (a.jPhase & 3)] = Math.max(0, this.jOcc[a.jNode * 4 + (a.jPhase & 3)] - 1);
      a.state = S.DRIVE; a.link = nl.id; a.lane = a.nextLane; a.s = s; a.next = -1; a.canGo = false; a.gateT = -1; a.redWarned = false;
      a.lat = a.latFrom = a.latTo = this.net.laneLat(nl, a.lane); a.latT = 1; a.jumpRoll = this.rnd();
      a.nextStop = 0; a.lastHid = -1;
      L.agents.unshift(a);
      if (a.retire) this.despawn(a);
    }
  }

  // ───────────────────────────── dynamic obstacles
  private buildDyn() {
    const net = this.net;
    for (const l of net.links) for (const L of l.lanes) L.dyn.length = 0;
    for (const p of this.peds) {
      if (p.kind === 2) continue;
      const l = net.links[p.link];
      if (p.kind === 1) {
        if (l.nLanes > 1) l.lanes[0].dyn.push({ s: p.s, half: 0.6, v: p.dir * p.v, hid: -p.id, kind: 'walker' });
        else l.lanes[0].dyn.push({ s: p.s, half: 0.6, v: -99, hid: -p.id, kind: 'walker' }); // -99 = squeeze-by cap
        continue;
      }
      const m = l.median / 2;
      if (p.lat > m && p.lat < l.halfW) {
        const i = clamp(l.nLanes - 1 - Math.floor((p.lat - m) / LANE_W), 0, l.nLanes - 1);
        l.lanes[i].dyn.push({ s: p.s, half: p.kind === 3 ? 1.4 : 0.5, v: 0, hid: -p.id, kind: p.kind === 3 ? 'cow' : 'ped' });
      } else if (p.lat < -m && p.lat > -l.halfW) {
        const rl = net.links[l.rev];
        const i = clamp(rl.nLanes - 1 - Math.floor((-p.lat - m) / LANE_W), 0, rl.nLanes - 1);
        rl.lanes[i].dyn.push({ s: rl.len - p.s, half: p.kind === 3 ? 1.4 : 0.5, v: 0, hid: -p.id, kind: p.kind === 3 ? 'cow' : 'ped' });
      }
    }
    for (const r of this.riders) net.links[r.link].lanes[0].dyn.push({ s: r.s, half: 1, v: -r.v, hid: -100000 - r.id, kind: 'wrongway' });
    // a car still sliding across lanes keeps occupying the lane it left
    this.jMap.clear();
    for (const a of this.agents) {
      if (!a.active) continue;
      if (a.state === S.JUNCTION) { const k = a.next * 8 + a.nextLane; const arr = this.jMap.get(k); if (arr) arr.push(a); else this.jMap.set(k, [a]); continue; }
      if (a.state === S.DRIVE && a.latT < 0.85 && a.laneFrom >= 0) {
        const L = net.links[a.link].lanes[a.laneFrom];
        if (L) L.dyn.push({ s: a.s - a.len / 2, half: a.len / 2, v: a.v, hid: -200000 - a.id, kind: 'shadow' });
      }
    }
  }
  private jMap = new Map<number, Agent[]>();

  // ───────────────────────────── main step
  update(realDt: number, speed: number) {
    this.acc += realDt * speed;
    let n = 0;
    while (this.acc >= DT && n < 60) { this.step(DT); this.acc -= DT; n++; }
    if (n >= 60) this.acc = 0;
  }

  step(dt: number) {
    this.t += dt;
    this.clockMin = (this.clockMin + (dt * CLOCK_RATE) / 60) % 1440;
    const prevDark = this.dark;
    this.updateDark();
    if (Math.abs(prevDark - this.dark) > 0.08) { for (const a of this.agents) if (a.active) this.assignTraits(a); }
    this.stepSignals(dt);
    this.buildDyn();
    const net = this.net;
    // sort lanes
    for (const l of net.links) for (const L of l.lanes) {
      const arr = L.agents;
      for (let i = 1; i < arr.length; i++) {
        const x = arr[i]; let j = i - 1;
        while (j >= 0 && arr[j].s > x.s) { arr[j + 1] = arr[j]; j--; }
        arr[j + 1] = x;
      }
      for (let i = 0; i < arr.length; i++) arr[i].li = i;
    }
    // accelerations
    const rain = this.env.rain;
    const vMulEnv = (rain ? 0.86 : 1) * (1 - 0.18 * this.E('haze'));
    for (const l of net.links) for (const L of l.lanes) {
      const arr = L.agents;
      for (let i = 0; i < arr.length; i++) {
        const a: Agent = arr[i];
        if (a.state !== S.DRIVE) { a.acc = a.state === S.DWELL || a.state === S.CRASHED || a.state === S.BROKEN ? -9 : 0; continue; }
        a.acc = this.computeAcc(a, l, L, i, vMulEnv);
      }
    }
    // lane changes
    for (const l of net.links) {
      if (l.nLanes < 2) continue;
      for (const L of l.lanes) {
        for (let i = L.agents.length - 1; i >= 0; i--) {
          const a: Agent = L.agents[i];
          if (a.state !== S.DRIVE) continue;
          a.lcCd -= dt;
          if (a.lcCd > 0 || a.manual) continue;
          a.lcCd = (a.traits & T.WEAVE ? 0.6 : 1.0) + this.rnd() * 0.5;
          this.tryLaneChange(a, l, L, vMulEnv);
        }
      }
    }
    // integrate
    for (const l of net.links) for (const L of l.lanes) {
      for (let i = L.agents.length - 1; i >= 0; i--) {
        const a: Agent = L.agents[i];
        if (!a.active) continue;
        this.integrate(a, l, dt);
      }
    }
    // hard spacing pass: nobody ends a step inside the vehicle ahead in its lane
    for (const l of net.links) for (const L of l.lanes) {
      const arr = L.agents;
      for (let i = 1; i < arr.length; i++) { const x = arr[i]; let j = i - 1; while (j >= 0 && arr[j].s > x.s) { arr[j + 1] = arr[j]; j--; } arr[j + 1] = x; }
      for (let i = arr.length - 2; i >= 0; i--) {
        const a: Agent = arr[i], ld: Agent = arr[i + 1];
        if ((a.type === VT.AMBULANCE && ld.yieldT > 0) || (ld.type === VT.AMBULANCE && a.yieldT > 0)) continue;
        const limit = ld.s - ld.len - 0.25;
        if (a.s > limit) {
          if (a.state === S.DRIVE && a.v - ld.v > 4) this.conflict('rear', a, ld, 0.02);
          a.s = Math.max(0, limit);
          if (a.v > ld.v) a.v = ld.v;
        }
      }
    }
    // agents off-lane
    for (const a of this.agents) {
      if (!a.active) continue;
      a.age += dt;
      if (a.state === S.JUNCTION) this.stepJunction(a, dt);
      else if (a.state === S.FOOTPATH) this.stepFootpath(a, dt);
      else if (a.state === S.BAY) this.stepBay(a, dt);
      if (!a.active) continue;
      if (a.latT < 1) { a.latT = Math.min(1, a.latT + dt / a.latDur); const u = a.latT; a.lat = a.latFrom + (a.latTo - a.latFrom) * u * u * (3 - 2 * u); }
      if (a.yieldT > 0) a.yieldT -= dt;
      this.poseAgent(a);
      this.agentEvents(a, dt);
    }
    this.stepPeds(dt);
    this.stepRiders(dt);
    this.stepCrashes();
    this.spawnControl(dt);
    this.metrics(dt);
    this.routeT += dt;
    if (this.routeT > 12) {
      this.routeT = 0;
      this.updateLinkSpeeds();
      this.reroute();
    }
  }

  private computeAcc(a: Agent, l: Link, L: Lane, i: number, vMulEnv: number): number {
    const amb = a.type === VT.AMBULANCE;
    let v0 = a.v0 * vMulEnv;
    if (a.yieldT > 0) v0 = Math.min(v0, 3);
    if (a.traits & T.PHONE) v0 *= 0.82 + 0.1 * Math.sin(this.t * 0.7 + a.id);
    if (a.traits & T.DRUNK) v0 *= 1.1;
    const v = a.v;
    const dark = this.dark, nightDark = l.dark ? dark : dark * 0.3;
    // perception distance (night + dark stretch + no lights + haze + phone)
    let perceive = 400;
    if (nightDark > 0.2) perceive = 120 - 95 * nightDark * (l.dark ? 1 : 0.4) * (0.6 + 0.4 * this.E('nightLights'));
    perceive *= 1 - 0.55 * this.E('haze');
    if (a.traits & T.PHONE) perceive = Math.min(perceive, 14);
    if (this.env.rain) perceive *= 0.8;
    let inter = 0; // max (s*/s)^2
    let surprise = 0;
    const sq = (gap: number, vl: number, sur = false) => {
      const g = gap < 0.1 ? 0.1 : gap;
      const st = sstar(v, v - vl, a.a, a.b, a.Tg, a.s0);
      const r = st / g;
      if (r * r > inter) inter = r * r;
      if (sur && r * r > surprise) surprise = r * r;
    };
    // leader vehicle
    for (let k = i + 1; k < L.agents.length; k++) {
      const ld: Agent = L.agents[k];
      if (amb && ld.yieldT > 0) continue;
      const gap = ld.s - ld.len - a.s;
      if (gap > 160) break;
      sq(gap, ld.v);
      if (amb && gap < 40 && ld.type !== VT.AMBULANCE && ld.state === S.DRIVE) {
        if (this.rnd() < (1 - this.E('emergency')) * 0.25) {
          ld.yieldT = 4; this.shiftYield(ld, l);
          if (a.latT >= 1) { a.latFrom = a.lat; a.latTo = this.net.laneLat(l, a.lane) - LANE_W * 0.45; a.latT = 0; a.latDur = 0.6; }
        }
        else if (this.rnd() < 0.02) this.honk(a, null);
      }
      break;
    }
    // static obstacles
    for (const o of L.obs) {
      const gap = o.s - o.half - a.s;
      if (gap < -0.5) continue;
      if (gap > 160) break;
      if (gap > perceive && this.dark > 0.3) break;
      sq(gap, 0, perceive < 60);
      // late spotting at night → hard hit risk
      if (gap < 1.2 && v > 4 && a.lastHid !== o.hid) { a.lastHid = o.hid; this.conflict('obstacle', a, null, 0.025 * (l.dark ? 1 + this.dark : 1)); }
      break;
    }
    // dynamic obstacles (peds, cows, wrong-way riders)
    for (const o of L.dyn) {
      const gap = o.s - o.half - a.s;
      if (gap < -1 || gap > 120) continue;
      if (gap > perceive) continue;
      if (o.v === -99) { if (gap < 10) v0 = Math.min(v0, 3 + gap * 0.3); continue; }
      sq(gap, o.v, gap < 18);
    }
    // speed-cap zones as virtual slow leaders
    let insideCap = v0;
    for (const c of L.caps) {
      if (c.s1 < a.s - a.len) continue;
      const d = c.s0 - a.s;
      if (d > 120) break;
      if (d <= 0) { insideCap = Math.min(insideCap, c.cap); continue; }
      const seeDist = c.late ? 7 : Math.min(perceive, 60);
      if (d < seeDist && v > c.cap) sq(d + 3, c.cap, c.late);
    }
    v0 = Math.min(v0, insideCap);
    if (a.manual) return this.manualAcc(a, l, inter);
    // stop line
    if (a.s > l.len - 70) {
      if (a.next < 0 && this.net.nodes[l.to].kind !== 'end') a.next = this.chooseNext(a);
      const dist = l.len - a.s;
      if (a.next < 0 && this.net.nodes[l.to].kind === 'end') { a.canGo = true; }
      else if (a.canGo && dist < (v * v) / 6 + 3) { /* committed: too close to stop safely */ }
      else {
        a.canGo = this.gate(a, l);
        if (!a.canGo) sq(dist - 0.4, 0);
      }
    }
    let acc = a.a * (1 - Math.pow(v / Math.max(0.5, v0), 4) - inter);
    if (surprise > 1.5 && acc < -4) a.evT = 1;
    if (a.brakeT > 0) { acc = Math.min(acc, -6.5); a.evT = 1; }
    if (acc < -9) acc = -9;
    return acc;
  }

  /** You drive: ↑ throttle, ↓ brake, nothing = coast. Red lights don't stop you — that's your call. */
  private manualAcc(a: Agent, l: Link, inter: number): number {
    const vmax = l.vmax * 1.15;
    let acc = this.input.up ? a.a * 1.25 * (1 - Math.pow(a.v / vmax, 4)) : this.input.down ? -6.5 : -0.35;
    if (a.v < 0.05 && !this.input.up) acc = 0;
    // a very close leader still forces braking (you can't drive through cars)
    if (inter > 4 && acc > 0) acc = Math.min(acc, 0.2);
    if (a.s > l.len - 40) {
      if (a.next < 0 || a.nextTurn !== this.input.turn) { a.next = this.net.nodes[l.to].kind === 'end' ? -1 : this.chooseNext(a); a.nextTurn = this.input.turn; }
      const st = this.signalState(l.to, l.id);
      if ((st === 'r' || st === 'a') && !a.redWarned && a.s > l.len - 25) { a.redWarned = true; this.onManualEvent?.('redlight', a); }
      a.jump = st === 'r';
      a.canGo = true;
    }
    return acc;
  }

  /** Manual lane change toward the kerb / left (-1) or the median / right (+1). */
  manualLane(a: Agent, dir: number): boolean {
    if (a.state !== S.DRIVE || a.latT < 1) return false;
    const l = this.net.links[a.link], ti = a.lane + dir;  // lane 0 is the kerb (left) lane, higher lanes are toward the median
    if (ti < 0 || ti >= l.nLanes) { this.onManualEvent?.('blocked', a); return false; }
    const TL = l.lanes[ti];
    for (const o of TL.agents) if (o !== a && o.s > a.s - a.len - 1.5 && o.s - o.len < a.s + 1.5) { this.onManualEvent?.('blocked', a); this.honk(o, a, 1); return false; }
    for (const o of TL.obs) if (o.s + o.half > a.s - a.len && o.s - o.half < a.s + 6) { this.onManualEvent?.('blocked', a); return false; }
    const L = l.lanes[a.lane], i = L.agents.indexOf(a);
    if (i >= 0) L.agents.splice(i, 1);
    let k = 0; while (k < TL.agents.length && TL.agents[k].s < a.s) k++;
    TL.agents.splice(k, 0, a);
    a.latFrom = a.lat; a.latTo = this.net.laneLat(l, ti); a.latT = 0; a.latDur = 0.8; a.laneFrom = a.lane; a.lane = ti;
    this.onManualEvent?.('lane', a);
    return true;
  }

  private shiftYield(ld: Agent, l: Link) {
    if (ld.latT < 1) return;
    ld.latFrom = ld.lat; ld.latTo = this.net.laneLat(l, ld.lane) + LANE_W * 0.5; ld.latT = 0; ld.latDur = 0.8;
  }

  private tryLaneChange(a: Agent, l: Link, L: Lane, vMulEnv: number) {
    if (a.s > l.len - 12 || a.s < 4 || a.latT < 1) return;
    const weave = (a.traits & T.WEAVE) !== 0;
    const slow = a.type === VT.TRACTOR || a.type === VT.BUS || a.type === VT.TRUCK || a.type === VT.AUTO;
    const curAcc = a.acc;
    let best = -1, bestGain = 0;
    for (const dl of [-1, 1]) {
      const ti = a.lane + dl;
      if (ti < 0 || ti >= l.nLanes) continue;
      const TL = l.lanes[ti];
      // find neighbours in target lane
      let lead: Agent | null = null, fol: Agent | null = null;
      for (let k = 0; k < TL.agents.length; k++) { const o = TL.agents[k]; if (o.s >= a.s) { lead = o; fol = k > 0 ? TL.agents[k - 1] : null; break; } }
      if (!lead && TL.agents.length) fol = TL.agents[TL.agents.length - 1];
      const minGap = weave && a.type === VT.BIKE ? 0.6 : Math.max(1.2, 0.25 * a.len);
      if (lead && lead.s - lead.len - a.s < minGap) continue;
      if (fol && a.s - a.len - fol.s < minGap) continue;
      let blocked = false;
      for (const o of TL.obs) if (o.s + o.half > a.s - a.len - 1 && o.s - o.half < a.s + 18) blocked = true;
      if (blocked) continue;
      // acceleration in target lane
      const v = a.v, v0 = a.v0 * vMulEnv;
      let inter = 0;
      if (lead) { const g = Math.max(0.1, lead.s - lead.len - a.s); const st = sstar(v, v - lead.v, a.a, a.b, a.Tg, a.s0); inter = Math.max(inter, (st / g) ** 2); }
      for (const o of TL.obs) { const g = o.s - o.half - a.s; if (g > 0 && g < 120) { const st = sstar(v, v, a.a, a.b, a.Tg, a.s0); inter = Math.max(inter, (st / g) ** 2); break; } }
      for (const o of TL.dyn) { const g = o.s - o.half - a.s; if (g > 0 && g < 60 && o.v !== -99) { const st = sstar(v, v - o.v, a.a, a.b, a.Tg, a.s0); inter = Math.max(inter, (st / g) ** 2); } }
      const tAcc = a.a * (1 - Math.pow(v / Math.max(0.5, v0), 4) - inter);
      // follower's braking if we cut in
      let folAcc = 0;
      if (fol && fol.state === S.DRIVE) {
        const g = Math.max(0.1, a.s - a.len - fol.s);
        const st = sstar(fol.v, fol.v - a.v, fol.a, fol.b, fol.Tg, fol.s0);
        folAcc = fol.a * (1 - Math.pow(fol.v / Math.max(0.5, fol.v0), 4) - (st / g) ** 2);
      }
      const bSafe = weave ? 6.5 : 2.2;
      if (folAcc < -bSafe) continue;
      let gain = tAcc - curAcc;
      if (slow && dl === -1) gain += 0.35;            // keep left
      if (slow && dl === 1) gain -= 0.35 * (1 - this.E('heavy'));
      if (!slow && dl === 1) gain += 0.08;
      if (l.faded) gain += (this.rnd() - 0.5) * 0.6;   // no lines → drift
      const thr = weave ? 0.05 : 0.35;
      if (gain > thr && gain > bestGain) { bestGain = gain; best = ti; (a as any)._fol = fol; (a as any)._folAcc = folAcc; }
    }
    if (best < 0) return;
    const fol: Agent | null = (a as any)._fol, folAcc: number = (a as any)._folAcc;
    const i = L.agents.indexOf(a);
    if (i >= 0) L.agents.splice(i, 1);
    const TL = l.lanes[best];
    let k = 0;
    while (k < TL.agents.length && TL.agents[k].s < a.s) k++;
    TL.agents.splice(k, 0, a);
    a.latFrom = a.lat; a.latTo = this.net.laneLat(l, best); a.latT = 0;
    a.latDur = a.type === VT.BIKE ? 0.6 : a.type === VT.BUS || a.type === VT.TRUCK ? 2 : 1.2;
    a.laneFrom = a.lane;
    a.lane = best;
    if (fol && folAcc < -3.2) {
      fol.brakeT = 0.5; fol.stress += 0.1; fol.cutT = 2;
      this.honk(fol, a, 0.65);
      if (folAcc < -4.5) this.conflict('side', a, fol, 0.006 * (l.faded ? 1.6 : 1));
    }
  }

  private integrate(a: Agent, l: Link, dt: number) {
    if (a.state === S.CRASHED || a.state === S.BROKEN) { a.v = 0; a.stateT += dt; return; }
    if (a.state === S.DWELL) {
      a.v = Math.max(0, a.v - 5 * dt);
      a.stateT -= dt;
      if (a.stateT <= 0) a.state = S.DRIVE;
      return;
    }
    if (a.brakeT > 0) a.brakeT -= dt;
    if (a.evT > 0) a.evT -= dt;
    if (a.cutT > 0) a.cutT -= dt;
    const vOld = a.v;
    a.v = Math.max(0, a.v + a.acc * dt);
    a.s += Math.max(0, (vOld + a.v) * 0.5 * dt);
    a.waitT = a.v < 0.4 ? a.waitT + dt : Math.max(0, a.waitT - dt * 2);
    // rear-end risk: hard braking with a close follower
    if (a.acc < -4.5 && a.evT > 0) {
      const L = l.lanes[a.lane], f = L.agents[a.li - 1];
      if (f && f.lane === a.lane && f.s < a.s && f.state === S.DRIVE && f.v - a.v > 1.5 && a.s - a.len - f.s < ((f.traits & T.TAIL) ? 3 : 1.8) && f.lastHid !== -a.id) {
        f.lastHid = -a.id;
        this.conflict('rear', f, a, 0.016 * ((f.traits & T.TAIL) ? 2 : 1) * (1 + 0.6 * this.E('breakdowns')));
      }
    }
    // caps: potholes / manholes knock two-wheelers
    if (a.type === VT.BIKE) for (const c of l.lanes[a.lane].caps) {
      if (c.s0 > a.s) break;
      if (c.s1 < a.s - 1 || c.hid === a.lastHid) continue;
      if (a.v > c.cap + 2.5 && (c.kind === 'pothole' || c.kind === 'manhole' || c.kind === 'mud')) {
        a.lastHid = c.hid;
        a.stress += 0.06;
        this.conflict('fall', a, null, (c.kind === 'manhole' ? 0.04 : 0.012) * (l.dark ? 1 + this.dark * 2 : 1));
      }
    }
    if (a.s >= l.len) {
      if (a.next < 0 && this.net.nodes[l.to].kind !== 'end') a.next = this.chooseNext(a);
      if (a.next < 0) { this.evTrip.push(this.t); this.despawn(a); return; }
      if (a.canGo || this.gate(a, l)) this.enterJunction(a, l);
      else { a.s = l.len; a.v = 0; }
    }
    if (a.waitT > (a.player ? 600 : 60) && a.state === S.DRIVE) { this.m.stuck++; this.despawn(a); }
  }

  private stepFootpath(a: Agent, dt: number) {
    const l = this.net.links[a.link];
    a.v = Math.min(5, a.v + 1.5 * dt);
    a.s += a.v * dt;
    a.stateT += dt;
    for (const p of this.peds) {
      if (p.kind !== 2 || p.link !== a.link) continue;
      if (Math.abs(p.s - a.s) < 2.5 && p.scare <= 0) { p.scare = 1.5; this.evPed.push(this.t); this.evNear.push(this.t); this.fx.push({ type: 'scare', x: p.x, z: p.z }); }
    }
    const L = l.lanes[0];
    if (a.stateT > 6 || a.s > l.len - 10) {
      let ok = true;
      for (const o of L.agents) if (o.s > a.s - a.len - 3 && o.s - o.len < a.s + 3) { ok = false; break; }
      if (ok) {
        a.state = S.DRIVE; a.lane = 0;
        let k = 0; while (k < L.agents.length && L.agents[k].s < a.s) k++;
        L.agents.splice(k, 0, a);
        a.latFrom = a.lat; a.latTo = this.net.laneLat(l, 0); a.latT = 0; a.latDur = 0.6;
        return;
      }
      if (a.s > l.len - 4) { a.s = l.len - 4; a.v = 0; }
    }
  }
  private stepBay(a: Agent, dt: number) {
    const l = this.net.links[a.link];
    a.v = 0;
    a.stateT -= dt;
    if (a.stateT > 0) return;
    const L = l.lanes[0];
    for (const o of L.agents) if (o.s > a.s - a.len - 4 && o.s - o.len < a.s + 4) return;
    a.state = S.DRIVE; a.lane = 0;
    let k = 0; while (k < L.agents.length && L.agents[k].s < a.s) k++;
    L.agents.splice(k, 0, a);
    a.latFrom = a.lat; a.latTo = this.net.laneLat(l, 0); a.latT = 0; a.latDur = 1.4;
  }

  private agentEvents(a: Agent, dt: number) {
    if (a.state !== S.DRIVE) return;
    const l = this.net.links[a.link];
    const hm = 0.1 + 1.8 * this.E('honking');
    a.honkCd -= dt;
    // stress eases toward a target set by slowness and noise; events add spikes
    a.slow += (clamp(1 - a.v / Math.max(1, a.v0), 0, 1) - a.slow) * dt * 0.08;
    const target = 0.06 + 0.55 * a.slow + 0.28 * Math.min(1, this.noise);
    a.stress += (target - a.stress) * dt * 0.05;
    a.stress = clamp(a.stress, 0, 1);
    if (a.honkCd <= 0) {
      const blocked = a.v < 1.5 && a.waitT > 1.2;
      let p = 0;
      if (blocked) p = 0.02 * hm + (a.traits & T.HONKER ? 0.06 * hm : 0);
      else if (a.traits & T.HONKER) p = 0.008 * hm;
      p *= 1 + a.stress;
      if (this.rnd() < p) this.honk(a, null);
      a.honkCd = 1;
    }
    // sudden brakers
    if ((a.traits & T.SUDDEN) && a.v > 5 && this.rnd() < 0.012 * dt * 10) a.brakeT = 0.9;
    // footpath riding
    if ((a.traits & T.FPRIDE) && a.lane === 0 && a.waitT > 1.5 && a.v < 1 && a.s < l.len - 25 && this.rnd() < 0.05) {
      const L = l.lanes[0], i = L.agents.indexOf(a);
      if (i >= 0) L.agents.splice(i, 1);
      a.state = S.FOOTPATH; a.stateT = 0;
      a.latFrom = a.lat; a.latTo = l.halfW + FOOT_W * 0.5; a.latT = 0; a.latDur = 0.6;
      return;
    }
    // bus stops
    if (a.type === VT.BUS && a.nextStop < l.busStops.length && a.s >= l.busStops[a.nextStop]) {
      a.nextStop++;
      const em = this.E('midStops');
      if (this.rnd() < 0.75) {
        if (em < 0.12) { // proper bus bay: pull out of the lane
          if (a.lane === 0) {
            const L = l.lanes[0], i = L.agents.indexOf(a);
            if (i >= 0) L.agents.splice(i, 1);
            a.state = S.BAY; a.stateT = 7 + this.rnd() * 5;
            a.latFrom = a.lat; a.latTo = this.net.laneLat(l, 0) + LANE_W * 0.95; a.latT = 0; a.latDur = 1.2;
          }
        } else { a.state = S.DWELL; a.stateT = (6 + this.rnd() * 7) * (0.6 + em); }
      }
      return;
    }
    if (a.type === VT.BUS && this.rnd() < 0.002 * dt * 10 * this.E('midStops')) { a.state = S.DWELL; a.stateT = 5 + this.rnd() * 5; return; }
    if ((a.traits & T.STOPPER) && a.v > 2 && this.rnd() < 0.0035 * dt * 10) { a.state = S.DWELL; a.stateT = 4 + this.rnd() * 6; this.fx.push({ type: 'stop', x: a.x, z: a.z }); return; }
    // breakdowns
    const br = 0.00006 * (0.2 + this.E('breakdowns') * 1.6) * (a.type === VT.TRUCK || a.type === VT.TANKER ? 2.5 : a.type === VT.AUTO || a.type === VT.BUS ? 1.6 : 1);
    if (this.breakdownsNow < 14 && this.rnd() < br * dt * 10) this.breakDown(a);
  }
  breakdownsNow = 0;
  breakDown(a: Agent) {
    if (a.state !== S.DRIVE) return;
    a.state = S.BROKEN; a.stateT = 0; a.v = 0;
    a.ambArrT = [22, 50, 85, 140][this.levels.breakdowns ?? 0] * (0.8 + this.rnd() * 0.4);
    this.breakdownsNow++;
    this.fx.push({ type: 'breakdown', x: a.x, z: a.z });
  }

  noise = 0;
  honk(a: Agent, target: Agent | null, p = 1) {
    if (this.rnd() > p) return;
    a.honkCd = 1.2 + this.rnd() * 2.2;
    this.evHonk.push(this.t);
    this.m.totalHonk++;
    if (target) { target.stress += 0.05; if (target.trip) target.trip.honksAt++; }
    else {
      const L = this.net.links[a.link]?.lanes[a.lane];
      const ld = L && a.state === S.DRIVE ? L.agents[a.li + 1] : null;
      if (ld) { ld.stress += 0.04; if (ld.trip) ld.trip.honksAt++; }
    }
    a.stress += 0.01;
    this.fx.push({ type: 'honk', x: a.x, z: a.z, a: a.id });
  }

  // ───────────────────────────── incidents
  private riskOf(a: Agent): number {
    const l = this.net.links[a.link];
    const d = this.dark;
    let r = 1;
    if (a.traits & T.PHONE) r *= 1.7;
    if (a.traits & T.SPEEDER) r *= 1.8;
    if (a.traits & T.DRUNK) r *= 2.2;
    if (a.traits & T.NOLIGHT) r *= 1 + 1.3 * d;
    r *= l && l.dark ? 1 + 1.6 * d : 1 + 0.3 * d;
    r *= 1 + 0.9 * d * this.E('nightLights');
    r *= 1 + 0.7 * this.E('haze');
    if (this.env.rain) r *= 1.3;
    r *= 1 + 0.4 * this.E('breakdowns');
    if (a.fixed) r *= 0.5;
    return r;
  }

  dbg: Record<string, number> = {};
  conflict(kind: string, a: Agent, b: Agent | null, base: number, ped?: Ped) {
    this.dbg['n_' + kind] = (this.dbg['n_' + kind] ?? 0) + 1;
    this.evNear.push(this.t);
    if (kind === 'ped') this.evPed.push(this.t);
    a.stress += 0.25; if (b) b.stress += 0.25;
    if (a.trip) a.trip.near++; if (b?.trip) b.trip.near++;
    this.fx.push({ type: 'near', x: a.x, z: a.z });
    const p = base * this.riskOf(a) * 0.5;
    if (this.rnd() < p) this.accident(kind, a, b, ped);
  }

  accident(kind: string, a: Agent, b: Agent | null, ped?: Ped, forceInjury = false): Crash | null {
    if (a.state === S.CRASHED || a.type === VT.AMBULANCE) return null;
    if (a.state !== S.DRIVE && a.state !== S.DWELL) return null;
    const speed = Math.max(a.v, b ? Math.abs(a.v - b.v) : 0);
    const inj0: Record<string, number> = { rear: 0.1, side: 0.2, tbone: 0.4, head: 0.55, ped: 0.75, fall: 0.35, obstacle: 0.25 };
    let pInj = (inj0[kind] ?? 0.3) * clamp(0.5 + speed / 12, 0.4, 1.6);
    const gear = (x: Agent | null) => !x ? 1 : x.type === VT.BIKE ? (x.traits & T.NOHELMET ? 1.6 : 0.55) : x.type === VT.CAR ? (x.traits & T.NOBELT ? 1.35 : 0.7) : 1;
    pInj *= Math.max(gear(a), gear(b));
    if (a.traits & (T.SPEEDER | T.DRUNK)) pInj *= 1.4;
    const injured = forceInjury || this.rnd() < clamp(pInj, 0, 0.97);
    this.dbg['a_' + kind] = (this.dbg['a_' + kind] ?? 0) + 1;
    const c: Crash = {
      id: this.crashId++, x: a.x, z: a.z, link: a.link, s: a.s, agents: [a.id], t0: this.t, injured, amb: -1,
      clearAt: this.t + (injured ? 260 : 35 + this.rnd() * 30), kind, ped: ped ? ped.id : -1, dispatched: -1, arrived: -1, cleared: false,
    };
    a.state = S.CRASHED; a.v = 0; a.crash = c.id; a.stateT = 0;
    if (b && (b.state === S.DRIVE || b.state === S.DWELL) && b.type !== VT.AMBULANCE) { b.state = S.CRASHED; b.v = 0; b.crash = c.id; c.agents.push(b.id); }
    if (ped) { ped.down = true; }
    this.crashes.push(c);
    this.evAcc.push(this.t); this.m.totalAcc++;
    if (injured) { this.evInj.push(this.t); this.m.totalInj++; this.dispatch(c); }
    this.fx.push({ type: 'crash', x: c.x, z: c.z, txt: kind, a: c.id });
    return c;
  }

  private dispatch(c: Crash) {
    const cl = this.net.links[c.link];
    let best = -1, bd = 1e9;
    for (const h of this.hospitals) {
      const nd = this.net.nodes[h];
      const d = Math.hypot(nd.x - c.x, nd.z - c.z);
      if (d < bd && nd.outs.length) { bd = d; best = h; }
    }
    if (best < 0) return;
    const nd = this.net.nodes[best];
    let out = cl.from === best ? cl.id : this.nextHop[cl.from * this.net.nodes.length + best];
    if (out < 0) out = nd.outs[0];
    const ol = this.net.links[out];
    const amb = this.spawn({ type: VT.AMBULANCE, link: out, s: 1, lane: ol.nLanes > 1 ? ol.nLanes - 1 : 0, force: true });
    if (!amb) return;
    amb.amb = c.id; amb.dest = cl.from; amb.v = 6; amb.traits = 0; amb.jumpRoll = this.rnd();
    c.amb = amb.id; c.dispatched = this.t;
    this.fx.push({ type: 'dispatch', x: amb.x, z: amb.z, a: amb.id });
  }

  private stepCrashes() {
    for (const c of this.crashes) {
      if (c.cleared) continue;
      // ambulance arrival
      if (c.amb >= 0 && c.arrived < 0) {
        const am = this.agents[c.amb];
        if (!am.active || am.amb !== c.id) { c.amb = -1; }
        else if (am.link === c.link && (c.s - am.s < 16 || (c.s - am.s < 45 && am.v < 0.5 && am.waitT > 1.5))) {
          c.arrived = this.t; this.resp.push(this.t - c.dispatched);
          if (this.resp.length > 8) this.resp.shift();
          c.clearAt = Math.min(c.clearAt, this.t + 8);
          am.state = am.state === S.DRIVE ? S.DWELL : am.state; am.stateT = 9;
          this.fx.push({ type: 'arrive', x: am.x, z: am.z });
        }
      }
      if (this.t >= c.clearAt) this.clearCrash(c);
    }
    if (this.crashes.length > 40) this.crashes = this.crashes.filter((c) => !c.cleared || this.t - c.clearAt < 20);
  }
  clearCrash(c: Crash) {
    if (c.cleared) return;
    c.cleared = true;
    for (const id of c.agents) { const a = this.agents[id]; if (a.active && a.crash === c.id) this.despawn(a); }
    if (c.amb >= 0) { const am = this.agents[c.amb]; if (am.active && am.amb === c.id) this.despawn(am); }
    if (c.ped >= 0) this.peds = this.peds.filter((p) => p.id !== c.ped);
    this.fx.push({ type: 'cleared', x: c.x, z: c.z });
  }

  // ───────────────────────────── pedestrians, cows, wrong-way riders
  private pedSpawnT = 0;
  private stepPeds(dt: number) {
    const net = this.net;
    // spawn crossers & crossing cows
    this.pedSpawnT += dt;
    if (this.pedSpawnT > 0.25) {
      const ec = this.E('crossings'), ef = this.E('footpaths');
      const nCross = this.peds.filter((p) => p.kind === 0).length;
      const target = Math.round((4 + 36 * ec * (0.7 + 0.3 * ef)) * (this.env.event ? 1.6 : 1) * (0.35 + 0.65 * this.demandFactor()));
      if (nCross < target && this.rnd() < 0.6) this.spawnCrosser();
      const nWalk = this.peds.filter((p) => p.kind === 1).length;
      const wTarget = Math.round(55 * ef);
      if (nWalk < wTarget && this.rnd() < 0.5) this.spawnWalker();
      const nCow = this.peds.filter((p) => p.kind === 3).length;
      if (nCow < Math.round(6 * this.E('animals')) && this.rnd() < 0.05) this.spawnCrosser(undefined, undefined, 3);
      const nFoot = this.peds.filter((p) => p.kind === 2).length;
      if (nFoot < 70) this.spawnFootWalker();
      this.pedSpawnT = 0;
    }
    const keep: Ped[] = [];
    for (const p of this.peds) {
      const l = net.links[p.link];
      if (p.down) { keep.push(p); continue; }
      if (p.scare > 0) p.scare -= dt;
      if (p.kind === 0 || p.kind === 3) {
        if (p.paused) { p.pause -= dt; if (p.pause <= 0) p.paused = false; }
        else {
          const sp = p.v * (p.scare > 0 ? 2.2 : 1);
          p.lat += p.dir * sp * dt;
          if (Math.abs(p.lat) < l.median / 2 + 0.4 && p.pause > 0 && this.rnd() < 0.5) { p.paused = true; }
        }
        if (Math.abs(p.lat) > l.halfW + 2.2 && Math.sign(p.lat) === p.dir) {
          if (p.kind === 0 && !l.noFoot && this.rnd() < 0.4) { p.kind = 2; p.lat = p.dir * (l.halfW + FOOT_W * 0.5); p.dir = this.rnd() < 0.5 ? 1 : -1; p.v = 1.1; keep.push(p); this.posePed(p); continue; }
          continue;
        }
        this.pedConflict(p, l);
      } else if (p.kind === 1 || p.kind === 2) {
        p.s += p.dir * p.v * dt * (p.scare > 0 ? 2 : 1);
        if (p.s < 2 || p.s > l.len - 2) {
          if (p.kind === 2 && this.rnd() < 0.5) { p.dir *= -1; p.s = clamp(p.s, 2.5, l.len - 2.5); }
          else continue;
        }
        if (p.kind === 1 && !l.noFoot) { p.kind = 2; p.lat = l.halfW + FOOT_W * 0.5; }
      }
      this.posePed(p);
      keep.push(p);
    }
    this.peds = keep;
  }
  private pedConflict(p: Ped, l: Link) {
    const m = l.median / 2;
    let link = l, s = p.s, lat = p.lat;
    if (lat < -m) { link = this.net.links[l.rev]; s = link.len - p.s; lat = -lat; }
    if (lat < m || lat > link.halfW) return;
    const lane = clamp(link.nLanes - 1 - Math.floor((lat - m) / LANE_W), 0, link.nLanes - 1);
    const L = link.lanes[lane];
    let a: Agent | null = null;
    for (let k = L.agents.length - 1; k >= 0; k--) { if (L.agents[k].s < s - 0.3) { a = L.agents[k]; break; } }
    if (!a || a.state !== S.DRIVE || a.v < 2) return;
    const gap = s - 0.5 - a.s;
    const stopD = (a.v * a.v) / (2 * 7) + 0.4;
    if (gap < stopD && gap > -0.5 && p.scare <= 0) {
      p.scare = 2;
      this.honk(a, null, 0.8);
      if (p.kind === 3) this.conflict('obstacle', a, null, 0.12);
      else this.conflict('ped', a, null, 0.02, p);
    }
  }
  posePed(p: Ped) {
    const l = this.net.links[p.link];
    const q = this.net.pose(l, p.s, p.lat, this.tmp);
    p.x = q.x; p.z = q.z;
    if (p.kind === 0 || p.kind === 3) { p.hx = q.dz * p.dir; p.hz = -q.dx * p.dir; }
    else { p.hx = q.dx * p.dir; p.hz = q.dz * p.dir; }
  }
  spawnCrosser(linkId?: number, s?: number, kind: 0 | 3 = 0): Ped | null {
    const net = this.net;
    let l: Link;
    if (linkId !== undefined) l = net.links[linkId];
    else {
      const cand = net.links.filter((x) => x.from < x.to && x.len > 40);
      const w = cand.map((x) => (kind === 3 ? (x.area === 'outskirt' || x.area === 'res' ? 2 : 0.4) : x.weight * (this.env.event && (x.road.id === 'cubbon' || x.road.id === 'mg' || x.road.id === 'kasturba') ? 8 : 1)) * x.len);
      const tot = w.reduce((a, b) => a + b, 0);
      let r = this.rnd() * tot, i = 0;
      while (i < cand.length - 1 && r > w[i]) { r -= w[i]; i++; }
      l = cand[i];
    }
    const dir = this.rnd() < 0.5 ? 1 : -1;
    const p: Ped = {
      id: this.pedId++, kind, link: l.id, s: s ?? 15 + this.rnd() * (l.len - 30), lat: -dir * (l.halfW + 2), dir,
      v: kind === 3 ? 0.45 : 1.1 + this.rnd() * 0.6, pause: kind === 3 ? 4 : 1 + this.rnd() * 2, paused: false,
      x: 0, z: 0, hx: 1, hz: 0, down: false, scare: 0, color: Math.floor(this.rnd() * 1e6),
    };
    this.posePed(p);
    this.peds.push(p);
    return p;
  }
  spawnWalker(linkId?: number): Ped | null {
    const cand = linkId !== undefined ? [this.net.links[linkId]] : this.net.links.filter((x) => x.noFoot && x.len > 40);
    if (!cand.length) return null;
    const l = cand[Math.floor(this.rnd() * cand.length)];
    const dir = this.rnd() < 0.5 ? 1 : -1;
    const p: Ped = { id: this.pedId++, kind: 1, link: l.id, s: 5 + this.rnd() * (l.len - 10), lat: this.net.laneLat(l, 0) + LANE_W * 0.3, dir, v: 1 + this.rnd() * 0.4, pause: 0, paused: false, x: 0, z: 0, hx: 1, hz: 0, down: false, scare: 0, color: Math.floor(this.rnd() * 1e6) };
    this.posePed(p);
    this.peds.push(p);
    return p;
  }
  private spawnFootWalker() {
    const cand = this.net.links.filter((x) => !x.noFoot && x.len > 40);
    if (!cand.length) return;
    const w = cand.map((x) => x.weight);
    const tot = w.reduce((a, b) => a + b, 0);
    let r = this.rnd() * tot, i = 0;
    while (i < cand.length - 1 && r > w[i]) { r -= w[i]; i++; }
    const l = cand[i];
    const p: Ped = { id: this.pedId++, kind: 2, link: l.id, s: 5 + this.rnd() * (l.len - 10), lat: l.halfW + FOOT_W * 0.5, dir: this.rnd() < 0.5 ? 1 : -1, v: 0.9 + this.rnd() * 0.5, pause: 0, paused: false, x: 0, z: 0, hx: 1, hz: 0, down: false, scare: 0, color: Math.floor(this.rnd() * 1e6) };
    this.posePed(p);
    this.peds.push(p);
  }
  private seedFootWalkers() { for (let i = 0; i < 50; i++) this.spawnFootWalker(); }

  fitRiders() {
    const target = Math.round(8 * this.E('wrongWay'));
    while (this.riders.length > target) this.riders.pop();
    while (this.riders.length < target) this.spawnRider();
  }
  spawnRider(linkId?: number): Rider {
    const net = this.net;
    let l: Link;
    if (linkId !== undefined) l = net.links[linkId];
    else {
      const cand = net.links.filter((x) => x.len > 60 && !x.road.ring && x.area !== 'outskirt');
      l = cand[Math.floor(this.rnd() * cand.length)];
    }
    const r: Rider = { id: this.riderId++, link: l.id, s: l.len - 4 - this.rnd() * (linkId !== undefined ? 5 : l.len * 0.6), v: 4.5 + this.rnd() * 2, lat: net.laneLat(l, 0) + LANE_W * 0.42, x: 0, z: 0, hx: 1, hz: 0 };
    this.poseRider(r);
    this.riders.push(r);
    return r;
  }
  private poseRider(r: Rider) {
    const q = this.net.pose(this.net.links[r.link], r.s, r.lat, this.tmp);
    r.x = q.x; r.z = q.z; r.hx = -q.dx; r.hz = -q.dz;
  }
  private stepRiders(dt: number) {
    for (const r of this.riders) {
      const l = this.net.links[r.link];
      let blocked = false;
      for (const a of l.lanes[0].agents) if (a.wid > 2.1 && a.s < r.s + 0.5 && a.s > r.s - 2.2) { blocked = true; break; }
      if (!blocked) r.s -= r.v * dt;
      if (r.s < 3) {
        const cand = this.net.links.filter((x) => x.len > 60 && !x.road.ring && x.area !== 'outskirt');
        const nl = cand[Math.floor(this.rnd() * cand.length)];
        r.link = nl.id; r.s = nl.len - 4; r.lat = this.net.laneLat(nl, 0) + LANE_W * 0.42;
      }
      // head-on encounters
      const L = l.lanes[0];
      for (let k = L.agents.length - 1; k >= 0; k--) {
        const a: Agent = L.agents[k];
        if (a.s > r.s) continue;
        const gap = r.s - 1 - a.s;
        if (gap < 2.5 && a.v + r.v > 8 && a.state === S.DRIVE && a.lastHid !== -100000 - r.id) {
          a.lastHid = -100000 - r.id;
          this.honk(a, null, 0.9);
          this.conflict('head', a, null, 0.035);
        }
        break;
      }
      this.poseRider(r);
    }
  }

  // ───────────────────────────── spawn control
  private spawnControl(dt: number) {
    let active = 0;
    for (const a of this.agents) if (a.active && a.type !== VT.AMBULANCE && !a.player) active++;
    this.m.active = active;
    const target = this.targetCount();
    const deficit = target - active;
    if (deficit > 0) {
      const n = Math.min(deficit, Math.ceil(dt * 60));
      for (let i = 0; i < n; i++) this.spawn();
    } else if (deficit < -10) {
      let k = Math.min(-deficit - 10, 4);
      for (const a of this.agents) {
        if (k <= 0) break;
        if (a.active && !a.retire && !a.player && a.type !== VT.AMBULANCE && a.state === S.DRIVE && this.rnd() < 0.05) { a.retire = true; k--; }
      }
    }
    // breakdown towing
    this.breakdownsNow = 0;
    for (const a of this.agents) if (a.active && a.state === S.BROKEN) {
      this.breakdownsNow++;
      if (a.stateT > a.ambArrT) { this.fx.push({ type: 'tow', x: a.x, z: a.z }); this.despawn(a); }
    }
  }

  // ───────────────────────────── metrics
  private updateLinkSpeeds() {
    const sum = new Float64Array(this.net.links.length), cnt = new Float64Array(this.net.links.length);
    for (const a of this.agents) if (a.active && a.state === S.DRIVE) { sum[a.link] += a.v; cnt[a.link]++; }
    for (let i = 0; i < sum.length; i++) {
      const v = cnt[i] > 0 ? sum[i] / cnt[i] : this.net.links[i].vmax;
      this.linkSpeed[i] = this.linkSpeed[i] * 0.4 + v * 0.6;
    }
  }
  private metricT = 0;
  private metrics(dt: number) {
    this.metricT += dt;
    if (this.metricT < 0.5) return;
    const W = 360; // one clock hour
    const t = this.t;
    const cut = (arr: number[]) => { while (arr.length && arr[0] < t - W) arr.shift(); return arr.length; };
    const span = Math.max(150, Math.min(W, t));
    const per = W / span;
    let sv = 0, sv0 = 0, ss = 0, n = 0;
    for (const a of this.agents) if (a.active && a.type !== VT.AMBULANCE && (a.state === S.DRIVE || a.state === S.JUNCTION)) {
      sv += a.v; sv0 += a.v0; ss += a.stress; n++;
    }
    const k = 1 - Math.exp(-this.metricT / 12);
    if (n > 0) {
      this.m.speedRatio += (sv / sv0 - this.m.speedRatio) * k;
      this.m.kmh += ((sv / n) * 3.6 - this.m.kmh) * k;
      this.m.stress += (ss / n - this.m.stress) * k;
    }
    this.m.accPerHr = cut(this.evAcc) * per;
    this.m.injPerHr = cut(this.evInj) * per;
    this.m.nearPerHr = cut(this.evNear) * per;
    this.m.pedPerHr = cut(this.evPed) * per;
    this.m.tripsPerHr = cut(this.evTrip) * per;
    while (this.evHonk.length && this.evHonk[0] < t - 30) this.evHonk.shift();
    const hpm = (this.evHonk.length / Math.min(30, Math.max(5, t))) * 60;
    this.m.honkPerMin += (hpm - this.m.honkPerMin) * k;
    this.noise = clamp(this.m.honkPerMin / Math.max(200, this.m.active) / 3, 0, 1.5);
    this.m.respMin = this.resp.length ? (this.resp.reduce((a, b) => a + b, 0) / this.resp.length) * CLOCK_RATE / 60 : 0;
    this.m.warm = Math.min(1, t / 200);
    this.metricT = 0;
  }

  // ───────────────────────────── helpers for UI
  localStats(x: number, z: number, r: number) {
    let sv = 0, sv0 = 0, n = 0;
    for (const a of this.agents) if (a.active && (a.state === S.DRIVE || a.state === S.JUNCTION || a.state === S.DWELL) && Math.abs(a.x - x) < r && Math.abs(a.z - z) < r) { sv += a.v; sv0 += a.v0; n++; }
    return { kmh: n ? (sv / n) * 3.6 : 0, ratio: n ? sv / sv0 : 1, n };
  }
  hazardAt(id: number): Hazard | undefined { return this.haz.byId(id); }
  fixHazard(h: Hazard) { this.haz.fix(h); if (h.kind === 'brokenSignal' || h.kind === 'badJunction') this.configureSignals(); this.onLevels?.(); }
  worsenHazard(h: Hazard) { this.haz.worsen(h, this.t); this.onLevels?.(); }
  fixAgent(a: Agent) { a.fixed = true; this.assignTraits(a); if (a.state === S.BROKEN) { this.despawn(a); } }
  removeRider(id: number) { this.riders = this.riders.filter((r) => r.id !== id); }
  removePed(id: number) { this.peds = this.peds.filter((p) => p.id !== id || p.down); }

  /** Start the player's drive from a world point to another. Returns the car or null. */
  startTrip(x0: number, z0: number, x1?: number, z1?: number): Agent | null {
    for (const a of this.agents) if (a.active && a.player) this.despawn(a);
    const from = this.net.nearestLink(x0, z0);
    if (!from) return null;
    let destNode = -1, bd = 1e9;
    if (x1 !== undefined && z1 !== undefined) for (const nd of this.net.nodes) { const d = Math.hypot(nd.x - x1, nd.z - z1); if (d < bd && nd.ins.length) { bd = d; destNode = nd.id; } }
    let link = from.link;
    if (link.to === destNode && from.s > link.len - 5) link = this.net.links[link.rev];
    const s = Math.min(Math.max(4, from.s), link.len - 6);
    const a = this.spawn({ type: VT.PLAYER, link: link.id, s, lane: 0, force: true });
    if (!a) return null;
    a.player = true; a.fixed = true; a.traits = 0; a.dest = destNode < 0 ? this.pickDest(link.to) : destNode; a.manual = destNode < 0; a.v = destNode < 0 ? 0 : 2;
    a.trip = { startT: this.t, startClock: this.clockMin, dist: 0, stops: 0, honksAt: 0, near: 0, maxStress: 0, stressSum: 0, samples: 0, waitT: 0, done: false, outcome: '', destNode, lastS: s, lastLink: link.id, lastV: 2, endClock: -1 };
    return a;
  }
  /** End the player's drive early (or after it finished). */
  stopTrip() { for (const a of this.agents) if (a.active && a.player) this.despawn(a); }
  /** Called every frame-ish to accumulate the player's trip stats. */
  tickTrip(a: Agent, dt: number) {
    const tr = a.trip; if (!tr || tr.done) return;
    if (a.link === tr.lastLink && a.state !== S.JUNCTION) tr.dist += Math.max(0, a.s - tr.lastS);
    else if (a.state !== S.JUNCTION && a.link !== tr.lastLink) tr.dist += a.s;
    if (a.state === S.JUNCTION) tr.dist += a.v * dt;
    tr.lastS = a.s; tr.lastLink = a.state === S.JUNCTION ? tr.lastLink : a.link;
    if (a.v < 0.5 && tr.lastV >= 0.5) tr.stops++;
    if (a.v < 0.5) tr.waitT += dt;
    tr.lastV = a.v;
    tr.stressSum += a.stress * dt; tr.samples += dt;
    tr.maxStress = Math.max(tr.maxStress, a.stress);
  }

  /** A random place where this issue can be seen (active instance, else a plausible link). */
  randomSpot(sliderId: string): { link: number; s: number } {
    const hs = this.haz.list.filter((h) => h.slider === sliderId && !h.ghost);
    if (hs.length) {
      const h = hs[Math.floor(this.rnd() * hs.length)];
      if (h.link >= 0) return { link: h.link, s: h.s };
      const nd = this.net.nodes[h.node];
      const li = nd.ins[Math.floor(this.rnd() * nd.ins.length)];
      return { link: li, s: Math.max(5, this.net.links[li].len - 10) };
    }
    const busy = new Float64Array(this.net.links.length);
    for (const a of this.agents) if (a.active) busy[a.link]++;
    const cand = this.net.links.filter((l) => l.len > 70 && (sliderId !== 'wrongWay' || !l.road.ring) && (sliderId !== 'speeding' || l.road.major || l.road.id === 'nice'));
    const w = cand.map((l) => 1 + busy[l.id] * (sliderId === 'speeding' ? 0.2 : 1) + (sliderId === 'speeding' && (l.road.id === 'nice' || l.road.id === 'bellary') ? 30 : 0));
    const tot = w.reduce((a, b) => a + b, 0);
    let r = this.rnd() * tot, i = 0;
    while (i < cand.length - 1 && r > w[i]) { r -= w[i]; i++; }
    const l = cand[i];
    return { link: l.id, s: l.len * (0.35 + this.rnd() * 0.3) };
  }

  /** Back to the very first state: default levels, clean map, 9 am, no crashes. */
  reset() {
    for (const a of this.agents) if (a.active) { a.state = S.DRIVE; a.active = false; }
    for (const l of this.net.links) for (const L of l.lanes) { L.agents = []; L.reserved = 0; L.dyn = []; }
    this.boxCount.fill(0); this.jOcc.fill(0);
    this.peds = []; this.riders = []; this.crashes = []; this.fx = [];
    for (const arr of [this.evAcc, this.evInj, this.evNear, this.evPed, this.evHonk, this.evTrip, this.resp]) arr.length = 0;
    this.m = { speedRatio: 0.6, kmh: 30, accPerHr: 0, injPerHr: 0, nearPerHr: 0, pedPerHr: 0, honkPerMin: 0, stress: 0.2, respMin: 0, tripsPerHr: 0, active: 0, stuck: 0, totalAcc: 0, totalInj: 0, totalHonk: 0, warm: 0 };
    this.dbg = {};
    this.t = 0; this.clockMin = 9 * 60; this.env = { rain: false, event: false, surge: 1, volume: 1 };
    this.updateDark();
    this.levels = defaultLevels();
    this.haz.removed.clear(); this.haz.added.clear(); this.haz.sevUp.clear(); this.haz.ghosts = [];
    this.computeE();
    this.haz.regenerate(this.levels, false, 0);
    this.configureSignals();
    this.net.links.forEach((l, i) => (this.linkSpeed[i] = l.vmax));
    this.reroute();
    this.seedFootWalkers();
    this.fitRiders();
    for (let i = 0; i < 250; i++) this.step(0.1);
    this.fx.length = 0;
    this.onLevels?.();
  }

  // Preview demos: inject a visible example of an issue near its hotspot.
  demo(sliderId: string, linkId?: number, sAt?: number) {
    const def = SLIDER_BY_ID[sliderId];
    const sp = def?.spot;
    let l: Link | undefined;
    if (linkId !== undefined) l = this.net.links[linkId];
    else if (sp) l = this.net.linkBetween(sp.a, sp.b);
    if (!l) return;
    const s0 = sAt ?? (sp ? sp.t * l.len : l.len / 2);
    const near = (fn: (a: Agent) => void, r = 120) => {
      for (const a of this.agents) if (a.active && a.link === l.id && Math.abs(a.s - s0) < r && a.type !== VT.AMBULANCE) fn(a);
    };
    const ensure = (n: number, type?: VT) => {
      for (let i = 0; i < n; i++) this.spawn({ link: l.id, s: Math.max(5, s0 - 40 - i * 14 - this.rnd() * 6), type, lane: Math.floor(this.rnd() * l.nLanes) });
    };
    switch (sliderId) {
      case 'signalJump': ensure(4); near((a) => { a.traits |= T.JUMP; a.jumpRoll = 0.1; }); break;
      case 'wrongWay': { const r1 = this.spawnRider(l.id), r2 = this.spawnRider(l.id); r1.s = Math.min(l.len - 4, s0 + 30); r2.s = Math.min(l.len - 4, s0 + 52); this.spawnRider(l.rev).s = Math.min(this.net.links[l.rev].len - 4, l.len - s0 + 40); ensure(4); break; }
      case 'phones': ensure(3, VT.BIKE); near((a) => { a.traits |= T.PHONE; this.applySpeedTraits(a); }); break;
      case 'weaving': ensure(5, VT.BIKE); near((a) => { if (a.type === VT.BIKE || a.type === VT.AUTO) a.traits |= T.WEAVE; }); break;
      case 'tailgating': ensure(5, VT.CAR); near((a) => { a.traits |= T.TAIL; this.applySpeedTraits(a); }); { let lead: Agent | null = null; near((a) => { if (!lead || a.s > lead.s) lead = a; }); if (lead) (lead as Agent).brakeT = 1.4; } break;
      case 'honking': ensure(4); near((a) => (a.traits |= T.HONKER)); near((a) => { if (this.rnd() < 0.5) this.honk(a, null); }); break;
      case 'footpathRiding': ensure(4, VT.BIKE); near((a) => { if (a.type === VT.BIKE) a.traits |= T.FPRIDE; }); break;
      case 'midStops': { const b = this.spawn({ type: VT.BUS, link: l.id, s: s0, lane: 0, force: true }); if (b) { b.state = S.DWELL; b.stateT = 20; } ensure(5); break; }
      case 'speeding': ensure(3, VT.CAR); near((a) => { a.traits |= T.SPEEDER; a.v0 *= 1.4; }); break;
      case 'safetyGear': ensure(5, VT.BIKE); near((a) => { if (a.type === VT.BIKE) a.traits |= T.NOHELMET; }); break;
      case 'nightLights': ensure(3, VT.TRUCK); near((a) => (a.traits |= T.NOLIGHT | T.GLARE)); break;
      case 'heavy': ensure(2, VT.TRUCK); ensure(1, VT.TRACTOR); ensure(1, VT.TANKER); break;
      case 'cargo': { const tr = this.spawn({ type: VT.TRUCK, link: l.id, s: s0 - 30, lane: 0 }); if (tr) tr.traits |= T.CARGO; break; }
      case 'breakdowns': { const c = this.spawn({ type: VT.TRUCK, link: l.id, s: s0, lane: Math.max(0, l.nLanes - 1), force: true }); if (c) { c.ambArrT = 1e9; this.breakDown(c); c.ambArrT = [22, 50, 85, 140][this.levels.breakdowns ?? 0] * 1.3; } ensure(6); break; }
      case 'emergency': {
        const c = this.spawn({ type: VT.CAR, link: l.id, s: s0, lane: 0, force: true });
        const d = this.spawn({ type: VT.BIKE, link: l.id, s: s0 - 5.5, lane: 0, force: true });
        if (c) this.accident('rear', c, d, undefined, true);
        ensure(8);
        break;
      }
      case 'crossings': for (let i = 0; i < 4; i++) this.spawnCrosser(l.id, s0 + (i - 1.5) * 9); ensure(4); break;
      case 'animals': this.spawnCrosser(l.id, s0 + 10, 3); ensure(3); break;
      case 'footpaths': for (let i = 0; i < 3; i++) this.spawnWalker(l.id); ensure(3); break;
      default: ensure(5);
    }
  }
}
