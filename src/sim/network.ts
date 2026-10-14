import { EDGES, NODES, ROADS, type CityNode, type RoadDef } from '../data/city';

export const LANE_W = 3.4;
export const FOOT_W = 2.6;
export const ORR_CENTER = { x: 45, z: -45 };

export interface Lane {
  link: Link; idx: number;
  agents: any[];                // sorted by s ascending (filled by Sim)
  obs: Obstacle[];              // static hard obstacles (sorted by s)
  caps: CapZone[];              // speed-cap zones (sorted by s0)
  dyn: Obstacle[];              // dynamic obstacles rebuilt each step
  reserved: number;             // length reserved by agents crossing a junction into this lane
}
export interface Obstacle { s: number; half: number; v: number; hid: number; kind: string }
export interface CapZone { s0: number; s1: number; cap: number; late: boolean; hid: number; kind: string }

export interface Link {
  id: number; from: number; to: number; edge: number; road: RoadDef; nLanes: number; vmax: number;
  pts: Float64Array; cum: Float64Array; len: number; rev: number;
  median: number; halfW: number; lanes: Lane[];
  // per-link issue flags set by hazards
  dark: boolean; faded: boolean; noFoot: boolean; busStops: number[];
  area: string; weight: number; // pedestrian activity weight
}

export interface Node {
  id: number; key: string; def: CityNode; x: number; z: number; kind: CityNode['kind'];
  ins: number[]; outs: number[]; r: number;
  phaseOf: Map<number, number>; nPhases: number;
}

export interface Pose { x: number; z: number; dx: number; dz: number }

function arcPoints(ax: number, az: number, bx: number, bz: number, n: number): number[] {
  const c = ORR_CENTER;
  const a0 = Math.atan2(az - c.z, ax - c.x), a1raw = Math.atan2(bz - c.z, bx - c.x);
  let da = a1raw - a0;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const r0 = Math.hypot(ax - c.x, az - c.z), r1 = Math.hypot(bx - c.x, bz - c.z);
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = a0 + da * t, r = r0 + (r1 - r0) * t + Math.sin(t * Math.PI) * 6;
    out.push(c.x + Math.cos(ang) * r, c.z + Math.sin(ang) * r);
  }
  return out;
}

function bentPoints(ax: number, az: number, bx: number, bz: number, bend: number, n: number): number[] {
  const mx = (ax + bx) / 2, mz = (az + bz) / 2;
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
  // left normal (dz, -dx)
  const cx = mx + (dz / L) * bend * 2, cz = mz + (-dx / L) * bend * 2;
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * az + 2 * u * t * cz + t * t * bz);
  }
  return out;
}

function cumulative(p: number[]): Float64Array {
  const n = p.length / 2, c = new Float64Array(n);
  for (let i = 1; i < n; i++) c[i] = c[i - 1] + Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
  return c;
}

// Cut a polyline to the arc-length interval [s0, s1].
function trim(p: number[], s0: number, s1: number): number[] {
  const c = cumulative(p), n = c.length, out: number[] = [];
  const at = (s: number) => {
    let i = 1;
    while (i < n - 1 && c[i] < s) i++;
    const t = (s - c[i - 1]) / (c[i] - c[i - 1] || 1);
    return [p[(i - 1) * 2] + (p[i * 2] - p[(i - 1) * 2]) * t, p[(i - 1) * 2 + 1] + (p[i * 2 + 1] - p[(i - 1) * 2 + 1]) * t];
  };
  out.push(...at(s0));
  for (let i = 1; i < n - 1; i++) if (c[i] > s0 + 0.5 && c[i] < s1 - 0.5) out.push(p[i * 2], p[i * 2 + 1]);
  out.push(...at(s1));
  return out;
}

export class Network {
  nodes: Node[] = [];
  links: Link[] = [];
  nodeIdx = new Map<string, number>();
  roadById = new Map<string, RoadDef>();
  edgeLinks: [number, number][] = []; // per EDGES entry: [a→b, b→a]

  constructor() {
    ROADS.forEach((r) => this.roadById.set(r.id, r));
    NODES.forEach((n, i) => {
      this.nodeIdx.set(n.id, i);
      this.nodes.push({ id: i, key: n.id, def: n, x: n.x, z: n.z, kind: n.kind, ins: [], outs: [], r: 6, phaseOf: new Map(), nPhases: 1 });
    });
    // junction radius from widest incident road
    const halfOf = (road: RoadDef, lanes: number) => (road.ring || road.major ? 1.6 : lanes > 1 ? 0.8 : 0.3) / 2 + lanes * LANE_W;
    EDGES.forEach((e) => {
      const road = this.roadById.get(e.road)!;
      const lanes = e.lanes ?? road.lanes;
      const hw = halfOf(road, lanes);
      for (const k of [e.a, e.b]) {
        const nd = this.nodes[this.nodeIdx.get(k)!];
        nd.r = Math.max(nd.r, hw + 2.5);
      }
    });
    for (const nd of this.nodes) if (nd.kind === 'end') nd.r = 3;

    EDGES.forEach((e, ei) => {
      const road = this.roadById.get(e.road)!;
      const A = this.nodes[this.nodeIdx.get(e.a)!], B = this.nodes[this.nodeIdx.get(e.b)!];
      if (!A || !B) throw new Error('bad edge ' + e.a + '-' + e.b);
      const nLanes = e.lanes ?? road.lanes;
      const dist = Math.hypot(B.x - A.x, B.z - A.z);
      const n = Math.max(2, Math.ceil(dist / 12));
      const raw = road.ring ? arcPoints(A.x, A.z, B.x, B.z, n) : bentPoints(A.x, A.z, B.x, B.z, e.bend ?? 0, n);
      const total = cumulative(raw);
      const L = total[total.length - 1];
      const fwd = trim(raw, A.r, L - B.r);
      const back: number[] = [];
      for (let i = fwd.length - 2; i >= 0; i -= 2) back.push(fwd[i], fwd[i + 1]);
      const median = road.ring || road.major ? 1.6 : nLanes > 1 ? 0.8 : 0.3;
      const mk = (from: Node, to: Node, pts: number[]): Link => {
        const cum = cumulative(pts);
        const link: Link = {
          id: this.links.length, from: from.id, to: to.id, edge: ei, road, nLanes, vmax: road.vmax,
          pts: Float64Array.from(pts), cum, len: cum[cum.length - 1], rev: -1,
          median, halfW: median / 2 + nLanes * LANE_W, lanes: [],
          dark: false, faded: false, noFoot: false, busStops: [], area: '', weight: 1,
        };
        for (let i = 0; i < nLanes; i++) link.lanes.push({ link, idx: i, agents: [], obs: [], caps: [], dyn: [], reserved: 0 });
        this.links.push(link);
        from.outs.push(link.id);
        to.ins.push(link.id);
        return link;
      };
      const l1 = mk(A, B, fwd), l2 = mk(B, A, back);
      l1.rev = l2.id; l2.rev = l1.id;
      this.edgeLinks.push([l1.id, l2.id]);
    });

    // signal phases: group incoming links by approach axis (mod 180°)
    for (const nd of this.nodes) {
      const axes: number[] = [];
      for (const li of nd.ins) {
        const l = this.links[li];
        const p = this.pose(l, l.len, 0);
        let ang = Math.atan2(p.dz, p.dx);
        if (ang < 0) ang += Math.PI;
        let ph = axes.findIndex((a) => {
          let d = Math.abs(a - ang) % Math.PI;
          if (d > Math.PI / 2) d = Math.PI - d;
          return d < 0.62;
        });
        if (ph < 0 || axes.length >= 4) {
          if (axes.length < 4) { axes.push(ang); ph = axes.length - 1; } else ph = ph < 0 ? 0 : ph;
        }
        nd.phaseOf.set(li, ph);
      }
      nd.nPhases = Math.max(1, axes.length);
    }
  }

  node(key: string): Node { return this.nodes[this.nodeIdx.get(key)!]; }

  linkBetween(a: string, b: string): Link | undefined {
    const A = this.nodeIdx.get(a), B = this.nodeIdx.get(b);
    return this.links.find((l) => l.from === A && l.to === B);
  }

  // Lateral offset (to the LEFT of travel — Bengaluru drives on the left) of a lane centre.
  laneLat(l: Link, lane: number): number {
    return l.median / 2 + (l.nLanes - lane - 0.5) * LANE_W;
  }

  pose(l: Link, s: number, lat: number, out: Pose = { x: 0, z: 0, dx: 1, dz: 0 }): Pose {
    const c = l.cum, p = l.pts, n = c.length;
    if (s <= 0) s = 0; else if (s >= l.len) s = l.len;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const seg = c[hi] - c[lo] || 1, t = (s - c[lo]) / seg;
    const x0 = p[lo * 2], z0 = p[lo * 2 + 1], x1 = p[hi * 2], z1 = p[hi * 2 + 1];
    let dx = x1 - x0, dz = z1 - z0;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    out.dx = dx; out.dz = dz;
    out.x = x0 + (x1 - x0) * t + dz * lat;
    out.z = z0 + (z1 - z0) * t - dx * lat;
    return out;
  }

  // Closest point on any link to (x,z) — used for click-to-place & area tagging.
  nearestLink(x: number, z: number): { link: Link; s: number; d: number } | null {
    let best: { link: Link; s: number; d: number } | null = null;
    for (const l of this.links) {
      const p = l.pts, c = l.cum;
      for (let i = 0; i < c.length - 1; i++) {
        const ax = p[i * 2], az = p[i * 2 + 1], bx = p[i * 2 + 2], bz = p[i * 2 + 3];
        const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
        let t = ((x - ax) * vx + (z - az) * vz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(ax + vx * t - x, az + vz * t - z);
        if (!best || d < best.d) best = { link: l, s: c[i] + (c[i + 1] - c[i]) * t, d };
      }
    }
    return best;
  }
}
