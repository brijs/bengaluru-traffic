import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { METRO_LINES, type MetroLineData } from '../data/metro';

/** Sweep a rectangular deck cross-section along sampled points (smooth, no corner gaps). */
function sweepBox(pts: THREE.Vector3[], width: number, height: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const n = pts.length;
  const ring = (i: number) => {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, L = Math.hypot(tx, tz) || 1;
    const nx = -tz / L, nz = tx / L, w = width / 2;
    return [
      [p.x + nx * w, p.y + height / 2, p.z + nz * w], [p.x - nx * w, p.y + height / 2, p.z - nz * w],
      [p.x - nx * w, p.y - height / 2, p.z - nz * w], [p.x + nx * w, p.y - height / 2, p.z + nz * w],
    ];
  };
  for (let i = 0; i < n; i++) for (const v of ring(i)) pos.push(...v);
  for (let i = 0; i < n - 1; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

interface Train { curve: THREE.CatmullRomCurve3; len: number; u: number; dir: number; cars: THREE.Group[]; under: [number, number][]; speed: number }

export class Metro {
  group = new THREE.Group();
  stations: { x: number; z: number; name: string; line: string }[] = [];
  private trains: Train[] = [];

  constructor() {
    const pillarG = new THREE.CylinderGeometry(0.9, 1.15, 1, 10);
    const pillars: THREE.Matrix4[] = [], greyPillars: THREE.Matrix4[] = [];
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xcfcfca });
    const wipMat = new THREE.MeshLambertMaterial({ color: 0x9a9a95 });
    for (const line of METRO_LINES) this.buildLine(line, pillars, greyPillars, deckMat, wipMat);
    const mk = (arr: THREE.Matrix4[], color: number) => {
      const im = new THREE.InstancedMesh(pillarG, new THREE.MeshLambertMaterial({ color }), arr.length);
      arr.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true;
      this.group.add(im);
    };
    mk(pillars, 0xb8b8b0); mk(greyPillars, 0x8f8f8a);
  }

  private buildLine(line: MetroLineData, pillars: THREE.Matrix4[], grey: THREE.Matrix4[], deckMat: THREE.Material, wipMat: THREE.Material) {
    const y = line.id === 'yellow' ? 15 : line.id === 'pink' ? 13 : 12;
    const open = line.status === 'open';
    const all = line.pts.map(([x, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(all, false, 'centripetal');
    const len = curve.getLength();
    const N = Math.max(8, Math.ceil(len / 4));
    const samples = curve.getSpacedPoints(N);
    // underground flag per sample: nearest source point's flag
    const flags = line.pts.map((p) => p[2]);
    let j = 0;
    const under = samples.map((p) => {
      while (j < all.length - 1 && all[j + 1].distanceToSquared(p) < all[j].distanceToSquared(p)) j++;
      return flags[j] === 1;
    });
    // elevated runs
    const runs: THREE.Vector3[][] = [];
    const underIv: [number, number][] = [];
    let cur: THREE.Vector3[] = [], uStart = -1;
    samples.forEach((p, i) => {
      if (!under[i]) { cur.push(p); if (uStart >= 0) { underIv.push([uStart / N, i / N]); uStart = -1; } }
      else { if (cur.length > 1) runs.push(cur); cur = []; if (uStart < 0) uStart = i; }
    });
    if (cur.length > 1) runs.push(cur);
    if (uStart >= 0) underIv.push([uStart / N, 1]);
    const decks: THREE.BufferGeometry[] = [], stripes: THREE.BufferGeometry[] = [];
    for (const run of runs) {
      if (open) {
        decks.push(sweepBox(run, 5, 1.2));
        stripes.push(sweepBox(run.map((p) => p.clone().setY(p.y + 0.25)), 5.15, 0.45));
      } else {
        // under construction: unfinished deck chunks with gaps
        for (let k = 0; k < run.length - 1; k += 14) decks.push(sweepBox(run.slice(k, Math.min(run.length, k + 8)), 5, 1.2));
      }
      let acc = 0;
      for (let k = 1; k < run.length; k++) {
        acc += run[k].distanceTo(run[k - 1]);
        if (acc >= 24) { acc = 0; (open ? pillars : grey).push(new THREE.Matrix4().compose(new THREE.Vector3(run[k].x, y / 2, run[k].z), new THREE.Quaternion(), new THREE.Vector3(1, y, 1))); }
      }
    }
    if (decks.length) {
      const d = new THREE.Mesh(mergeGeometries(decks), open ? deckMat : wipMat); d.castShadow = true; this.group.add(d);
    }
    if (stripes.length) this.group.add(new THREE.Mesh(mergeGeometries(stripes), new THREE.MeshLambertMaterial({ color: line.color })));
    // stations
    const roofM = new THREE.MeshLambertMaterial({ color: 0xf2f2ee }), platM = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
    for (const st of line.stations) {
      const t = this.nearestT(curve, samples, N, st.x, st.z);
      const iu = Math.round(t * N);
      if (under[iu]) { this.stations.push({ ...st, line: line.id }); continue; }
      const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const g = new THREE.Group();
      const plat = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 9), platM); plat.position.y = -0.4;
      const roof = new THREE.Mesh(new RoundedBoxGeometry(19, 0.5, 10, 2, 0.2), roofM); roof.position.y = 4.2;
      const band = new THREE.Mesh(new THREE.BoxGeometry(19.1, 0.6, 10.1), new THREE.MeshLambertMaterial({ color: line.color })); band.position.y = 3.7;
      g.add(plat, roof, band);
      g.position.set(p.x, y, p.z);
      g.rotation.y = -Math.atan2(tg.z, tg.x);
      g.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
      this.group.add(g);
      this.stations.push({ ...st, line: line.id });
    }
    if (!open) return;
    // trains: 3 cars, each placed on the curve at its own offset so they bend through curves
    const body = new THREE.MeshStandardMaterial({ color: 0xe9ecef, metalness: 0.5, roughness: 0.35 });
    const livery = new THREE.MeshLambertMaterial({ color: line.color });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1b2836, metalness: 0.8, roughness: 0.15 });
    const carG = new RoundedBoxGeometry(7.6, 2.7, 2.8, 3, 0.45), bandG = new RoundedBoxGeometry(7.65, 0.55, 2.86, 2, 0.2), winG = new RoundedBoxGeometry(7.0, 0.85, 2.88, 2, 0.25);
    const count = Math.max(2, Math.round(len / 500));
    for (let k = 0; k < count; k++) {
      const cars: THREE.Group[] = [];
      for (let c = 0; c < 3; c++) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(carG, body), b = new THREE.Mesh(bandG, livery), w = new THREE.Mesh(winG, glass);
        b.position.y = -0.75; w.position.y = 0.35; m.castShadow = true;
        g.add(m, b, w);
        this.group.add(g); cars.push(g);
      }
      this.trains.push({ curve, len, u: (k / count) * len, dir: k % 2 ? -1 : 1, cars, under: underIv, speed: 15 + (k % 3) });
    }
  }

  private nearestT(curve: THREE.CatmullRomCurve3, samples: THREE.Vector3[], N: number, x: number, z: number) {
    let bi = 0, bd = 1e9;
    samples.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi / N;
  }

  private tmp = new THREE.Vector3(); private tg = new THREE.Vector3();
  update(dt: number) {
    for (const tr of this.trains) {
      tr.u += tr.dir * dt * tr.speed;
      if (tr.u > tr.len - 30) { tr.u = tr.len - 30; tr.dir = -1; }
      if (tr.u < 30) { tr.u = 30; tr.dir = 1; }
      tr.cars.forEach((car, c) => {
        const u = Math.min(tr.len, Math.max(0, tr.u - tr.dir * c * 7.9)) / tr.len;
        tr.curve.getPointAt(u, this.tmp); tr.curve.getTangentAt(u, this.tg);
        car.position.set(this.tmp.x, this.tmp.y + 2, this.tmp.z);
        car.rotation.y = -Math.atan2(this.tg.z, this.tg.x);
        car.visible = !tr.under.some(([a, b]) => u >= a && u <= b);
      });
    }
  }
}
