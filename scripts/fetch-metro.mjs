// Regenerates src/data/metro.json from OpenStreetMap (Overpass API).
// run: node scripts/fetch-metro.mjs   — data © OpenStreetMap contributors (ODbL)
import { writeFileSync } from 'node:fs';

const SERVERS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const UA = 'NammaRoads/0.1 (metro data refresh)';

async function overpass(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
  if (attempt) { console.warn('retrying in', 15 * attempt, 's'); await new Promise((r) => setTimeout(r, 15000 * attempt)); }
  for (const s of SERVERS) {
    try {
      const r = await fetch(s, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(90000) });
      const t = await r.text();
      if (t.trim().startsWith('{')) return JSON.parse(t);
      console.warn('busy:', s);
    } catch (e) { console.warn('fail:', s, e.message); }
  }
  }
  throw new Error('All Overpass servers failed');
}

// Same projection as src/data/geo.ts
const LAT0 = 12.96, LON0 = 77.6, K = 7000, R0 = 400, SQ = 0.55;
const W = { minX: -840, maxX: 1000, minZ: -720, maxZ: 800 };
function toWorld(lat, lon) {
  const rx = (lon - LON0) * K, rz = -(lat - LAT0) * K, r = Math.hypot(rx, rz);
  const f = r > R0 ? (R0 + (r - R0) * SQ) / r : 1;
  return [rx * f, rz * f];
}
const inside = ([x, z]) => x > W.minX + 5 && x < W.maxX - 5 && z > W.minZ + 5 && z < W.maxZ - 5;

function dp(pts, eps) { // Douglas–Peucker on [x,z,under]
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], vx = b[0] - a[0], vz = b[1] - a[1], L = Math.hypot(vx, vz) || 1;
    const d = Math.abs((p[0] - a[0]) * vz - (p[1] - a[1]) * vx) / L + (p[2] !== a[2] ? 1e9 : 0);
    if (d > best) { best = d; bi = i; }
  }
  if (best < eps) return [a, b];
  return [...dp(pts.slice(0, bi + 1), eps).slice(0, -1), ...dp(pts.slice(bi), eps)];
}

/** Chain unordered ways into one polyline (greedy, flipping as needed). */
function chain(ways) {
  const segs = ways.map((w) => w.pts.map((p) => [...p, w.under ? 1 : 0]));
  if (!segs.length) return [];
  let line = segs.shift();
  while (segs.length) {
    const head = line[0], tail = line[line.length - 1];
    let bi = -1, bd = 1e9, mode = 0;
    segs.forEach((s, i) => {
      const c = [[tail, s[0], 0], [tail, s[s.length - 1], 1], [head, s[s.length - 1], 2], [head, s[0], 3]];
      for (const [p, q, m] of c) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; mode = m; } }
    });
    if (bd > 60) break; // disconnected piece — stop
    let s = segs.splice(bi, 1)[0];
    if (mode === 1 || mode === 3) s = s.slice().reverse();
    line = mode <= 1 ? [...line, ...s.slice(1)] : [...s.slice(0, -1), ...line];
  }
  return line;
}

const OPEN = { 1798771: 'purple', 1798772: 'green', 19421927: 'yellow' };
const rel = await overpass(`[out:json][timeout:180];rel(id:${Object.keys(OPEN).join(',')});out geom;`);
const relWays = await overpass(`[out:json][timeout:180];rel(id:${Object.keys(OPEN).join(',')});way(r);out tags;`);
const wayTags = new Map(relWays.elements.map((e) => [e.id, e.tags || {}]));
const more = await overpass(`[out:json][timeout:180];(way["name"~"Pink Line",i]["railway"](12.75,77.4,13.3,77.85);way["railway"="construction"]["construction"="subway"]["colour"="blue"](12.75,77.4,13.3,77.85););out tags geom;`);

const isUnder = (t) => t.tunnel === 'yes' || +(t.layer || 0) < 0 || t.location === 'underground';
const lines = [];
for (const r of rel.elements) {
  const id = OPEN[r.id];
  const ways = r.members.filter((m) => m.type === 'way' && m.geometry && m.role !== 'platform').map((m) => ({ pts: m.geometry.map((g) => toWorld(g.lat, g.lon)), under: isUnder(wayTags.get(m.ref) || {}) }));
  const stations = r.members.filter((m) => m.type === 'node' && /stop/.test(m.role) && m.lat).map((m) => ({ p: toWorld(m.lat, m.lon) }));
  lines.push({ id, status: 'open', ways, stations, relId: r.id });
}
// station names
const stationNodes = await overpass(`[out:json][timeout:180];rel(id:${Object.keys(OPEN).join(',')});node(r);out tags;`);
const names = new Map(stationNodes.elements.map((e) => [e.id, e.tags?.name || '']));
for (const r of rel.elements) {
  const L = lines.find((l) => l.relId === r.id);
  L.stations = r.members.filter((m) => m.type === 'node' && /stop/.test(m.role) && m.lat).map((m) => ({ p: toWorld(m.lat, m.lon), name: (names.get(m.ref) || '').replace(/ ?metro station/i, '') }));
}
const pinkWays = more.elements.filter((e) => /Pink/i.test(e.tags?.name || '') && /Kalena Agrahara - Nagawara/.test(e.tags.name));
lines.push({ id: 'pink', status: 'construction', ways: pinkWays.map((w) => ({ pts: w.geometry.map((g) => toWorld(g.lat, g.lon)), under: isUnder(w.tags) })), stations: [] });
const blueWays = more.elements.filter((e) => e.tags?.colour === 'blue');
lines.push({ id: 'blue', status: 'construction', ways: blueWays.map((w) => ({ pts: w.geometry.map((g) => toWorld(g.lat, g.lon)), under: isUnder(w.tags) })), stations: [] });

const out = lines.map((l) => {
  const pts = dp(chain(l.ways).filter((p) => inside(p)), 1.6).map(([x, z, u]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10, u]);
  const stations = l.stations.filter((s) => inside(s.p)).map((s) => ({ x: Math.round(s.p[0] * 10) / 10, z: Math.round(s.p[1] * 10) / 10, name: s.name }));
  console.log(l.id, l.status, 'points', pts.length, 'stations', stations.length, 'underground pts', pts.filter((p) => p[2]).length);
  return { id: l.id, status: l.status, pts, stations };
});
writeFileSync(new URL('../src/data/metro.json', import.meta.url), JSON.stringify({ source: '© OpenStreetMap contributors (ODbL)', fetched: new Date().toISOString().slice(0, 10), lines: out }));
