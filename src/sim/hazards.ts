import { SLIDER_BY_ID, type Level, type Levels } from '../data/sliders';
import { AREAS } from '../data/city';
import type { Link, Network } from './network';
import { mulberry32, type Rng } from './rng';

export type HazKind =
  | 'pothole' | 'bump' | 'barrier' | 'pole' | 'garbage' | 'trench' | 'manhole' | 'mud' | 'puddle'
  | 'parked' | 'vendor' | 'cow' | 'dark' | 'faded' | 'nofoot' | 'brokenSignal' | 'mistimed' | 'badJunction';

export interface Hazard {
  id: number; cand: number; slider: string; kind: HazKind;
  link: number;            // -1 for node-level
  node: number;            // -1 for link-level
  lane: number;            // -1 = all lanes
  s: number; len: number; sev: number; count: number;
  x: number; z: number;    // marker position
  ghost?: boolean;         // temporary preview instance
  born: number;            // sim time created (for pop-in animation)
}

// Which links suit which hazard (weights).
function linkWeight(kind: HazKind, l: Link): number {
  const r = l.road.id, major = !!l.road.major, ring = !!l.road.ring;
  const outskirt = l.area === 'outskirt', market = l.area === 'market' || l.area === 'old';
  switch (kind) {
    case 'pothole': return (ring ? 1.4 : 1) * (outskirt ? 1.8 : 1) * (['sarjapur', 'kanakapura', 'bannerghatta', 'mysore', 'tumkur', 'magadi', 'hsr27', 'itpl', 'wfmain', 'varthurrd', 'sjvarthur', 'wfvarthur', 'panathur'].includes(r) ? 2.4 : 1);
    case 'bump': return ring || r === 'hosur' || r === 'bellary' ? 0 : l.nLanes === 1 ? 3 : 1;
    case 'barrier': case 'pole': case 'garbage': return ring || major ? 1.6 : 1;
    case 'trench': case 'manhole': case 'mud': return ['hosur', 'orr', 'sarjapur', 'bannerghatta', 'omr', 'itpl'].includes(r) ? 2 : 1;
    case 'parked': return ring || r === 'bellary' || r === 'airport' ? 0.1 : market ? 3 : l.area === 'res' || l.area === 'cbd' ? 2 : 1;
    case 'vendor': return ring ? 0.05 : market ? 4 : l.area === 'res' ? 1.2 : 0.4;
    case 'cow': return outskirt ? 3 : ['kanakapura', 'bannerghatta', 'sarjapur', 'mysore', 'magadi', 'hsr27', 'bsk', 'marenahalli', 'sjvarthur', 'panathur', 'wfvarthur'].includes(r) ? 2.5 : ring ? 0.6 : 0.8;
    case 'dark': return outskirt ? 3 : ring ? 2 : 1;
    default: return 1;
  }
}

const KIND_LEN: Partial<Record<HazKind, number>> = {
  pothole: 2.6, bump: 1.2, barrier: 3.6, pole: 1.2, garbage: 3, trench: 20, manhole: 1.2, mud: 10, puddle: 22,
  parked: 5, vendor: 3, cow: 3,
};

// Low-lying flood spots (approach to these nodes).
const FLOOD_NODES = ['varthur', 'panathur', 'kadubeesanahalli', 'silk_board', 'bellandur', 'kr_market', 'majestic', 'marathahalli', 'agara', 'hebbal', 'wipro', 'domlur', 'mekhri', 'jayadeva', 'koramangala', 'yeshwanthpur'];

export class Hazards {
  list: Hazard[] = [];
  private nextId = 1;
  private cands = new Map<string, Hazard[]>();       // ordered candidate pool per slider
  removed = new Map<string, Set<number>>();          // user-fixed candidate ids
  added = new Map<string, Hazard[]>();               // user "make worse" additions
  sevUp = new Map<string, Map<number, number>>();    // cand -> sev override
  ghosts: Hazard[] = [];

  constructor(private net: Network) {
    this.tagAreas();
    this.buildCandidates();
  }

  private tagAreas() {
    for (const l of this.net.links) {
      const p = this.net.pose(l, l.len / 2, 0);
      let best = 'outskirt', bd = 1e9;
      for (const a of AREAS) {
        const d = Math.hypot(a.x - p.x, a.z - p.z) / a.r;
        if (d < bd) { bd = d; best = d < 2.2 ? a.kind : 'outskirt'; }
      }
      l.area = best;
      l.weight = best === 'market' ? 3 : best === 'cbd' ? 2.2 : best === 'old' ? 2 : best === 'res' ? 1.4 : best === 'tech' ? 1.1 : 0.6;
      // bus stops every ~140 units on multi-lane links
      l.busStops = [];
      if (l.nLanes >= 2 && l.len > 60) for (let s = 40; s < l.len - 25; s += 140) l.busStops.push(s);
    }
  }

  private mk(slider: string, kind: HazKind, link: number, node: number, lane: number, s: number, len: number, count = 1): Hazard {
    let x = 0, z = 0;
    if (link >= 0) {
      const l = this.net.links[link];
      const lat = lane < 0 ? l.halfW * 0.5 : this.net.laneLat(l, lane);
      const p = this.net.pose(l, s, lat);
      x = p.x; z = p.z;
    } else {
      const n = this.net.nodes[node];
      x = n.x; z = n.z;
    }
    return { id: 0, cand: 0, slider, kind, link, node, lane, s, len, sev: 1, count, x, z, born: -10 };
  }

  private weightedLinks(r: Rng, kind: HazKind, n: number, filter?: (l: Link) => boolean): Link[] {
    const pool = this.net.links.filter((l) => l.len > 30 && (!filter || filter(l)));
    const w = pool.map((l) => linkWeight(kind, l) * Math.sqrt(l.len));
    const tot = w.reduce((a, b) => a + b, 0);
    const out: Link[] = [];
    for (let i = 0; i < n; i++) {
      let x = r() * tot, k = 0;
      while (k < pool.length - 1 && x > w[k]) { x -= w[k]; k++; }
      out.push(pool[k]);
    }
    return out;
  }

  private spotLink(slider: string): Link | undefined {
    const sp = SLIDER_BY_ID[slider]?.spot;
    return sp ? this.net.linkBetween(sp.a, sp.b) : undefined;
  }

  private buildCandidates() {
    const net = this.net;
    const add = (slider: string, h: Hazard) => {
      const arr = this.cands.get(slider) ?? [];
      h.cand = arr.length;
      arr.push(h);
      this.cands.set(slider, arr);
    };
    const laneFor = (r: Rng, l: Link, kind: HazKind) => {
      if (kind === 'parked' || kind === 'vendor' || kind === 'garbage' || kind === 'pole') return 0;
      if (kind === 'barrier') return r() < 0.55 ? 0 : l.nLanes - 1;
      return Math.floor(r() * l.nLanes);
    };
    const pointHaz = (slider: string, kinds: [HazKind, number][], n: number, seed: number) => {
      const r = mulberry32(seed);
      const sl = this.spotLink(slider);
      const sp = SLIDER_BY_ID[slider].spot!;
      const kindAt = () => { let x = r(), i = 0; while (i < kinds.length - 1 && x > kinds[i][1]) { x -= kinds[i][1]; i++; } return kinds[i][0]; };
      if (sl) {
        const k = kinds[0][0];
        const len = KIND_LEN[k] ?? 3;
        const s = Math.min(sl.len - len - 4, Math.max(len + 4, sp.t * sl.len));
        add(slider, this.mk(slider, k, sl.id, -1, k === 'bump' || k === 'mud' || k === 'puddle' ? -1 : laneFor(r, sl, k), s, len, k === 'parked' ? 4 : k === 'cow' ? 2 : 1));
        // a companion on the reverse direction makes the preview busier
        if (k !== 'bump') {
          const rl = net.links[sl.rev];
          add(slider, this.mk(slider, k, rl.id, -1, k === 'mud' || k === 'puddle' ? -1 : laneFor(r, rl, k), Math.max(len + 4, Math.min(rl.len - len - 4, rl.len - s - 12)), len, k === 'parked' ? 3 : 1));
        }
      }
      const kind0 = kinds[0][0];
      for (const l of this.weightedLinks(r, kind0, n)) {
        const k = kindAt();
        const len = (KIND_LEN[k] ?? 3) * (k === 'trench' ? 0.8 + r() * 0.5 : 1);
        if (l.len < len + 20) continue;
        const s = 10 + len / 2 + r() * (l.len - len - 20);
        const cnt = k === 'parked' ? 2 + Math.floor(r() * 4) : k === 'cow' ? 1 + Math.floor(r() * 3) : 1;
        const L = k === 'parked' ? cnt * 5.2 : len;
        add(slider, this.mk(slider, k, l.id, -1, k === 'bump' || k === 'mud' ? -1 : laneFor(r, l, k), s, L, cnt));
      }
    };
    pointHaz('potholes', [['pothole', 1]], 60, 11);
    pointHaz('bumps', [['bump', 1]], 24, 12);
    pointHaz('obstacles', [['barrier', 0.6], ['garbage', 0.25], ['pole', 0.15]], 24, 13);
    pointHaz('workZones', [['trench', 0.5], ['manhole', 0.28], ['mud', 0.22]], 16, 14);
    pointHaz('parking', [['parked', 1]], 32, 15);
    pointHaz('footpaths', [['vendor', 1]], 14, 16);
    pointHaz('animals', [['cow', 1]], 16, 17);

    // waterlogging — puddles on approaches to flood-prone junctions
    {
      const r = mulberry32(18);
      const sl = this.spotLink('waterlogging');
      if (sl) add('waterlogging', this.mk('waterlogging', 'puddle', sl.id, -1, -1, sl.len * 0.72, 24));
      for (const key of FLOOD_NODES) {
        const nd = net.node(key);
        const li = nd.ins[Math.floor(r() * nd.ins.length)];
        const l = net.links[li];
        if (sl && l.id === sl.id) continue;
        if (l.len < 50) continue;
        add('waterlogging', this.mk('waterlogging', 'puddle', l.id, -1, -1, l.len - 22 - r() * 15, 20 + r() * 8));
      }
    }
    // link-level flags (both directions of an edge)
    const edgeOrder = (seed: number, kind: HazKind, first?: Link) => {
      const r = mulberry32(seed);
      const edges = net.edgeLinks.map(([a]) => net.links[a]).filter((l) => linkWeight(kind, l) > 0);
      const keyed = edges.map((l) => ({ l, k: r() / (linkWeight(kind, l) + 0.01) }));
      keyed.sort((a, b) => a.k - b.k);
      const out = keyed.map((x) => x.l);
      if (first) {
        const fe = first.edge, i = out.findIndex((l) => l.edge === fe);
        if (i > 0) { const [x] = out.splice(i, 1); out.unshift(x); }
      }
      return out;
    };
    edgeOrder(21, 'dark', this.spotLink('darkRoads')).forEach((l) => add('darkRoads', this.mk('darkRoads', 'dark', l.id, -1, -1, l.len / 2, l.len)));
    edgeOrder(22, 'faded', this.spotLink('markings')).forEach((l) => add('markings', this.mk('markings', 'faded', l.id, -1, -1, l.len / 2, l.len)));
    edgeOrder(23, 'nofoot', this.spotLink('footpaths')).filter((l) => !l.road.ring).forEach((l) =>
      add('footpathsLinks', this.mk('footpaths', 'nofoot', l.id, -1, -1, l.len / 2, l.len)));

    // node-level: signals & junctions
    {
      const r = mulberry32(31);
      const sig = net.nodes.filter((n) => n.kind === 'signal' && n.ins.length >= 3);
      const spot = SLIDER_BY_ID.signals.spot!;
      const first = net.node(spot.b);
      const order = [first, ...sig.filter((n) => n !== first).map((n) => ({ n, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.n)];
      order.forEach((n) => add('signals', this.mk('signals', 'brokenSignal', -1, n.id, -1, 0, 0)));
      const jn = net.nodes.filter((n) => n.ins.length >= 3);
      const j0 = net.node(SLIDER_BY_ID.junctions.spot!.b);
      const jo = [j0, ...jn.filter((n) => n !== j0).map((n) => ({ n, k: r() * (n.kind === 'free' ? 0.5 : 1) })).sort((a, b) => a.k - b.k).map((x) => x.n)];
      jo.forEach((n) => add('junctions', this.mk('junctions', 'badJunction', -1, n.id, -1, 0, 0)));
    }
  }

  // Fraction-of-pool sliders: markings / darkRoads / footpath links / junctions / signals
  private countFor(slider: string, level: Level, pool: number): number {
    const def = SLIDER_BY_ID[slider];
    if (slider === 'markings') return Math.round(pool * [0, 0.22, 0.48, 0.78][level]);
    if (slider === 'footpathsLinks') return Math.round(pool * [0, 0.2, 0.45, 0.7][level]);
    if (slider === 'signals') return [0, 2, 4, 7][level];
    return def?.counts ? def.counts[level] : 0;
  }

  regenerate(levels: Levels, rain: boolean, now: number, changed?: string) {
    if (changed) { this.removed.delete(changed); this.added.delete(changed); this.sevUp.delete(changed); if (changed === 'footpaths') { this.removed.delete('footpathsLinks'); this.added.delete('footpathsLinks'); } }
    const prev = new Map(this.list.map((h) => [h.slider + ':' + h.kind + ':' + h.cand + ':' + h.link + ':' + h.node, h]));
    const out: Hazard[] = [];
    for (const [key, pool] of this.cands) {
      const sliderId = key === 'footpathsLinks' ? 'footpaths' : key;
      let level = levels[sliderId] ?? 0;
      if (sliderId === 'waterlogging' && !rain) level = 0;
      const n = Math.min(pool.length, this.countFor(key, level as Level, pool.length));
      const rem = this.removed.get(key);
      const sev = this.sevUp.get(key);
      for (let i = 0; i < n; i++) {
        if (rem?.has(i)) continue;
        const c = pool[i];
        const k = c.slider + ':' + c.kind + ':' + c.cand + ':' + c.link + ':' + c.node;
        const old = prev.get(k);
        const h: Hazard = { ...c, id: old ? old.id : this.nextId++, born: old ? old.born : now, sev: sev?.get(i) ?? 1 };
        out.push(h);
      }
      for (const a of this.added.get(key) ?? []) out.push(a);
    }
    for (const g of this.ghosts) out.push(g);
    this.list = out;
    this.apply();
  }

  /** How many instances the slider level would normally place (for score scaling after map edits). */
  expected(key: string, level: Level) {
    const pool = this.cands.get(key);
    return pool ? Math.min(pool.length, this.countFor(key, level, pool.length)) : 0;
  }
  activeWeight(key: string) {
    let w = 0;
    for (const h of this.list) if (!h.ghost && this.poolKeyOf(h) === key) w += 1 + (h.sev - 1) * 0.6;
    return w;
  }
  keys() { return [...this.cands.keys()]; }
  isCustom(slider: string) {
    const ks = slider === 'footpaths' ? ['footpaths', 'footpathsLinks'] : [slider];
    return ks.some((k) => (this.removed.get(k)?.size ?? 0) > 0 || (this.added.get(k)?.length ?? 0) > 0 || (this.sevUp.get(k)?.size ?? 0) > 0);
  }

  poolKeyOf(h: Hazard) { return h.kind === 'nofoot' ? 'footpathsLinks' : h.slider; }

  fix(h: Hazard) {
    if (h.ghost) { this.ghosts = this.ghosts.filter((g) => g !== h); }
    else if (h.cand < 0) {
      const key = this.poolKeyOf(h);
      this.added.set(key, (this.added.get(key) ?? []).filter((a) => a.id !== h.id));
    } else {
      const key = this.poolKeyOf(h);
      const s = this.removed.get(key) ?? new Set<number>();
      s.add(h.cand);
      this.removed.set(key, s);
    }
    this.list = this.list.filter((x) => x.id !== h.id);
    this.apply();
  }

  // Make worse: bump severity and drop a sibling nearby.
  worsen(h: Hazard, now: number) {
    const key = this.poolKeyOf(h);
    if (h.cand >= 0 && !h.ghost) {
      const m = this.sevUp.get(key) ?? new Map<number, number>();
      m.set(h.cand, Math.min(3, (m.get(h.cand) ?? 1) + 1));
      this.sevUp.set(key, m);
    }
    h.sev = Math.min(3, h.sev + 1);
    if (h.link >= 0 && h.lane !== -1 && h.kind !== 'faded' && h.kind !== 'dark' && h.kind !== 'nofoot') {
      const l = this.net.links[h.link];
      const s = h.s + (h.s + 30 < l.len - 10 ? 22 : -22);
      if (s > 8 && s < l.len - 8) {
        const lane = l.nLanes > 1 ? (h.lane + 1) % l.nLanes : 0;
        const n = this.mk(h.slider, h.kind, h.link, -1, lane, s, h.len, h.count);
        n.id = this.nextId++; n.cand = -1; n.born = now; n.sev = h.sev;
        const arr = this.added.get(key) ?? [];
        arr.push(n);
        this.added.set(key, arr);
        this.list.push(n);
      }
    }
    this.apply();
  }

  addGhost(slider: string, now: number, random = false): Hazard | null {
    const pool = this.cands.get(slider);
    if (!pool || !pool.length) return null;
    const idx = random ? Math.floor(Math.random() * pool.length) : 0;
    const c = pool[idx];
    if (this.list.some((h) => this.poolKeyOf(h) === slider && h.cand === idx && !h.ghost)) return null;
    const g: Hazard = { ...c, id: this.nextId++, ghost: true, born: now };
    this.ghosts.push(g);
    this.list.push(g);
    this.apply();
    return g;
  }
  clearGhosts() {
    if (!this.ghosts.length) return;
    const ids = new Set(this.ghosts.map((g) => g.id));
    this.ghosts = [];
    this.list = this.list.filter((h) => !ids.has(h.id));
    this.apply();
  }

  // Push hazards into lane obstacle / cap structures and link / node flags.
  apply() {
    const net = this.net;
    for (const l of net.links) {
      l.dark = false; l.faded = false; l.noFoot = false;
      for (const ln of l.lanes) { ln.obs = []; ln.caps = []; }
    }
    this.brokenNodes.clear();
    this.badNodes.clear();
    for (const h of this.list) {
      if (h.node >= 0) {
        if (h.kind === 'brokenSignal') this.brokenNodes.add(h.node);
        else if (h.kind === 'badJunction') this.badNodes.add(h.node);
        continue;
      }
      const l = net.links[h.link];
      const both = [l, net.links[l.rev]];
      if (h.kind === 'dark') { both.forEach((x) => (x.dark = true)); continue; }
      if (h.kind === 'faded') { both.forEach((x) => (x.faded = true)); continue; }
      if (h.kind === 'nofoot') { both.forEach((x) => (x.noFoot = true)); continue; }
      const sev = h.sev;
      const lanes = h.lane < 0 ? l.lanes : [l.lanes[Math.min(h.lane, l.nLanes - 1)]];
      const s0 = h.s - h.len / 2, s1 = h.s + h.len / 2;
      const cap = (c: number, late = false) => lanes.forEach((ln) => ln.caps.push({ s0, s1, cap: c, late, hid: h.id, kind: h.kind }));
      const hard = () => {
        // single-lane roads: vehicles squeeze past at crawl instead of stopping dead
        if (l.nLanes === 1) cap(h.kind === 'parked' || h.kind === 'vendor' ? 4.5 / sev : 2.5 / sev);
        else lanes.forEach((ln) => ln.obs.push({ s: h.s, half: h.len / 2, v: 0, hid: h.id, kind: h.kind }));
      };
      switch (h.kind) {
        case 'pothole': cap(5.5 / sev); break;
        case 'bump': cap(3.2 / sev, true); break;
        case 'manhole': cap(4.5 / sev); break;
        case 'mud': cap(7 / sev); break;
        case 'puddle': cap(2.6 / sev); break;
        default: hard();
      }
    }
    for (const l of net.links) for (const ln of l.lanes) { ln.obs.sort((a, b) => a.s - b.s); ln.caps.sort((a, b) => a.s0 - b.s0); }
  }
  brokenNodes = new Set<number>();
  badNodes = new Set<number>();

  byId(id: number) { return this.list.find((h) => h.id === id); }
}
