// Fills metro station names (English + Kannada) in src/data/metro.json from Wikidata,
// matching each station position to the nearest Wikidata metro station.
// Also adds stations along under-construction lines (Pink, Blue), which OSM has no stops for yet.
// run: node scripts/name-stations.mjs   — data: Wikidata (CC0)
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'NammaRoads/0.1 (metro station names)';
const Q = `SELECT ?s ?sLabel ?kn ?coord WHERE {
  SERVICE wikibase:box { ?s wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(77.40 12.75)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(77.85 13.30)"^^geo:wktLiteral . }
  ?s wdt:P31/wdt:P279* wd:Q928830 .
  OPTIONAL { ?s rdfs:label ?kn FILTER(LANG(?kn) = "kn") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;

// Same projection as src/data/geo.ts
const LAT0 = 12.96, LON0 = 77.6, K = 7000, R0 = 400, SQ = 0.55;
function toWorld(lat, lon) {
  const rx = (lon - LON0) * K, rz = -(lat - LAT0) * K, r = Math.hypot(rx, rz);
  const f = r > R0 ? (R0 + (r - R0) * SQ) / r : 1;
  return [rx * f, rz * f];
}
const cleanEn = (s) => s.replace(/\s*metro station\s*/i, '').replace(/\s*\(Namma Metro\)\s*/i, '').trim();
const cleanKn = (s) => s.replace(/\s*\(ಬೆಂಗಳೂರು\)\s*/, '').replace(/\s*ಮೆಟ್ರ[ೋೊ]\s*ನಿಲ್ದಾಣ\s*/, '').trim();

const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(Q);
const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(90000) });
const rows = (await res.json()).results.bindings;
const wd = [];
for (const b of rows) {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value);
  if (!m) continue;
  const [x, z] = toWorld(+m[2], +m[1]);
  const en = cleanEn(b.sLabel.value);
  if (/^Q\d+$/.test(en)) continue; // no English label
  wd.push({ x, z, en, kn: b.kn ? cleanKn(b.kn.value) : en });
}
console.log('wikidata stations', wd.length);

const file = new URL('../src/data/metro.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const near = (x, z, max) => {
  let best = null, bd = max;
  for (const s of wd) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
  return best;
};
// distance from a point to a line's polyline
const distToLine = (pts, x, z) => {
  let bd = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L2));
    bd = Math.min(bd, Math.hypot(ax + vx * t - x, az + vz * t - z));
  }
  return bd;
};
const used = new Set();
for (const line of data.lines) {
  if (line.stations.length) {
    let named = 0;
    for (const st of line.stations) {
      const s = near(st.x, st.z, 18);
      if (s) { st.name = s.en; st.kn = s.kn; used.add(s); named++; }
    }
    // drop duplicate stops (both directions) that resolved to the same station
    const seen = new Set();
    line.stations = line.stations.filter((st) => !st.name || (seen.has(st.name) ? false : (seen.add(st.name), true)));
    console.log(line.id, 'named', named, 'of', line.stations.length);
  }
}
for (const line of data.lines) {
  if (line.status !== 'construction') continue;
  // stations that sit on this line and aren't already on an open line
  const st = wd.filter((s) => !used.has(s) && distToLine(line.pts, s.x, s.z) < 9);
  line.stations = st.map((s) => ({ x: Math.round(s.x * 10) / 10, z: Math.round(s.z * 10) / 10, name: s.en, kn: s.kn }));
  st.forEach((s) => used.add(s));
  console.log(line.id, 'construction stations', line.stations.length);
}
data.stationNames = { source: 'Wikidata (CC0)', fetched: new Date().toISOString().slice(0, 10) };
writeFileSync(file, JSON.stringify(data));
