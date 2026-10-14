import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AREAS, DESTINATIONS, LANDMARKS, METRO, WORLD, type AreaKind, type Landmark } from '../data/city';
import { FOOT_W, type Network } from '../sim/network';
import { mulberry32 } from '../sim/rng';
import { IS_MOBILE } from './scene';
import { glowTex } from './textures';

type Seg = { ax: number; az: number; bx: number; bz: number; hw: number };

/** Spatial hash of road centre segments for "is this spot clear of roads?" queries. */
class RoadIndex {
  cell = 40; map = new Map<string, Seg[]>();
  constructor(net: Network) {
    for (const [fi] of net.edgeLinks) {
      const l = net.links[fi];
      for (let i = 0; i < l.pts.length / 2 - 1; i++) {
        const s: Seg = { ax: l.pts[i * 2], az: l.pts[i * 2 + 1], bx: l.pts[i * 2 + 2], bz: l.pts[i * 2 + 3], hw: l.halfW + FOOT_W };
        const x0 = Math.floor(Math.min(s.ax, s.bx) / this.cell) - 1, x1 = Math.floor(Math.max(s.ax, s.bx) / this.cell) + 1;
        const z0 = Math.floor(Math.min(s.az, s.bz) / this.cell) - 1, z1 = Math.floor(Math.max(s.az, s.bz) / this.cell) + 1;
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; const a = this.map.get(k) ?? []; a.push(s); this.map.set(k, a); }
      }
    }
    for (const nd of net.nodes) {
      const s: Seg = { ax: nd.x, az: nd.z, bx: nd.x + 0.01, bz: nd.z, hw: nd.r + 2 };
      const k = Math.floor(nd.x / this.cell) + ',' + Math.floor(nd.z / this.cell);
      const a = this.map.get(k) ?? []; a.push(s); this.map.set(k, a);
    }
  }
  /** distance to nearest road edge (negative = on the road) and that road's direction */
  query(x: number, z: number): { d: number; ang: number } {
    const arr = this.map.get(Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell));
    let best = 1e9, ang = 0;
    if (arr) for (const s of arr) {
      const vx = s.bx - s.ax, vz = s.bz - s.az, L2 = vx * vx + vz * vz || 1;
      let t = ((x - s.ax) * vx + (z - s.az) * vz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(s.ax + vx * t - x, s.az + vz * t - z) - s.hw;
      if (d < best) { best = d; ang = Math.atan2(vz, vx); }
    }
    return { d: best, ang };
  }
}

const PALETTE: Record<AreaKind, string[]> = {
  cbd: ['#9fb7c9', '#c9d3dc', '#7f97ab', '#d7dde2', '#b0bec5'],
  tech: ['#5e8fb5', '#4f7fa8', '#7fb0d0', '#a8c8de', '#6aa0c7'],
  res: ['#f2d0a4', '#e8b4bc', '#cde7c9', '#f6eac2', '#d9d4f0', '#ffffff', '#f4c095', '#b8d8e8', '#f7d6e0'],
  old: ['#efe3cf', '#f3e2c7', '#e6d3b3', '#fff6e5', '#e9d8c4'],
  market: ['#e07a5f', '#f2cc8f', '#81b29a', '#f4f1de', '#e5989b', '#ffd166'],
  outskirt: ['#d9cbb0', '#cfc1a5', '#e3d8c3', '#bfb39b'],
};

/** Lambert material with procedural windows that light up at night. */
function windowMaterial(night: { value: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp4 = modelMatrix * instanceMatrix * vec4(transformed, 1.0); vWP = wp4.xyz;
        vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight; varying vec3 vWP; varying vec3 vWN;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        diffuseColor.rgb *= 0.62 + 0.38 * smoothstep(0.0, 5.0, vWP.y);
        if (abs(vWN.y) < 0.5) {
          float hor = abs(vWN.x) > 0.5 ? vWP.z : vWP.x;
          vec2 cell = vec2(floor(hor / 2.6), floor((vWP.y - 1.0) / 3.2));
          vec2 f = vec2(fract(hor / 2.6), fract((vWP.y - 1.0) / 3.2));
          float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.78) * step(1.2, vWP.y);
          float lit = step(0.45, h21(cell + floor(vWP.xz * 0.01)));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55 + vec3(0.05, 0.07, 0.1), win * (1.0 - uNight) * 0.8);
          totalEmissiveRadiance += win * lit * uNight * vec3(1.0, 0.78, 0.42) * 0.9;
        }`);
  };
  return m;
}

export class City {
  group = new THREE.Group();
  private trains: { line: number; u: number; dir: number; mesh: THREE.Group; len: number; cum: number[]; pts: [number, number][]; y: number; under?: [number, number] }[] = [];
  stadiumLights: THREE.Mesh[] = [];
  private stadiumGlow: THREE.Sprite[] = [];
  private stadiumField: THREE.Mesh | null = null;
  foam: THREE.Mesh[] = [];
  private roads: RoadIndex;

  constructor(private net: Network, night: { value: number }) {
    this.roads = new RoadIndex(net);
    this.buildGreens();
    this.buildBuildings(night);
    this.buildTrees();
    this.buildLandmarks();
    this.buildFlyovers();
    this.buildCompassLetters();
    this.buildExitSigns();
  }

  /** Green bilingual NH-style gantry signs on roads leaving the city. */
  private buildExitSigns() {
    const net = this.net;
    const poleM = new THREE.MeshLambertMaterial({ color: 0x8a9096 });
    const backM = new THREE.MeshLambertMaterial({ color: 0x0b5e33 });
    for (const nd of net.nodes) {
      const d = DESTINATIONS[nd.key];
      if (!d) continue;
      const li = nd.ins.find((i) => net.links[i].len > 40);
      if (li === undefined) continue;
      const l = net.links[li];
      const c = document.createElement('canvas'); c.width = 768; c.height = 320;
      const g = c.getContext('2d')!;
      const draw = () => {
      g.textAlign = 'left';
      g.fillStyle = '#0b6b3a'; g.fillRect(0, 0, 768, 320);
      g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(14, 14, 740, 292);
      g.fillStyle = '#fff'; g.textBaseline = 'middle';
      g.font = 'bold 96px "Noto Sans", system-ui, sans-serif'; g.fillText('↑', 40, 120);
      g.font = 'bold 60px "Noto Sans Kannada", "Noto Sans", sans-serif'; g.fillText(d.kn, 130, 98, 470);
      g.font = 'bold 70px "Noto Sans", system-ui, sans-serif'; g.fillText(d.en, 130, 178, 470);
      g.font = 'bold 80px "Noto Sans", system-ui, sans-serif'; g.textAlign = 'right'; g.fillText(String(d.km), 730, 135);
      g.font = '34px "Noto Sans", sans-serif'; g.fillText('km', 730, 200);
      if (d.via) { g.textAlign = 'left'; g.font = '38px "Noto Sans", "Noto Sans Kannada", sans-serif'; g.fillStyle = '#d8f3e4'; g.fillText(d.via.en, 130, 262, 600); }
      };
      draw();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      // Kannada glyphs need the web font; redraw once it has loaded
      document.fonts?.load('bold 74px "Noto Sans Kannada"', d.kn).then(() => document.fonts.ready).then(() => { draw(); tex.needsUpdate = true; }).catch(() => {});
      const s = Math.max(8, l.len - 30);
      const p = net.pose(l, s, 0);
      const W = l.halfW * 2 + 2, H = W * (320 / 768);
      const sign = new THREE.Group();
      const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex }));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), backM); back.rotation.y = Math.PI; back.position.z = -0.05;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 0.35, 0.35), poleM); beam.position.set(0, H / 2 + 0.3, -0.25);
      sign.add(front, back, beam);
      for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7 + H, 8), poleM); pole.position.set(sx * (W / 2 + 1.4), -(7 + H) / 2 + H / 2 + 0.3, -0.25); sign.add(pole); }
      sign.position.set(p.x, 7 + H / 2, p.z);
      // face drivers heading out of town (sign normal points back along the road)
      sign.rotation.y = Math.atan2(-p.dx, -p.dz);
      this.group.add(sign);
    }
  }

  private buildCompassLetters() {
    const mk = (ch: string, x: number, z: number, col: string) => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      g.font = 'bold 200px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeText(ch, 128, 138);
      g.fillStyle = col; g.fillText(ch, 128, 138);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.PlaneGeometry(110, 110); p.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(p, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.75 }));
      m.position.set(x, 0.5, z); m.renderOrder = 1;
      this.group.add(m);
    };
    const cx = (WORLD.minX + WORLD.maxX) / 2, cz = (WORLD.minZ + WORLD.maxZ) / 2;
    mk('N', cx, WORLD.minZ - 40, '#ff5252'); mk('S', cx, WORLD.maxZ + 40, '#ffffff');
    mk('E', WORLD.maxX + 50, cz, '#ffffff'); mk('W', WORLD.minX - 50, cz, '#ffffff');
  }

  private blocked(x: number, z: number, pad: number) {
    for (const lm of LANDMARKS) {
      const r = (lm.r2 ? Math.max(lm.r, lm.r2) : lm.r) + pad;
      if (Math.abs(x - lm.x) < r * 1.1 && Math.abs(z - lm.z) < r * 1.1 && Math.hypot((x - lm.x) / (lm.r + pad), (z - lm.z) / ((lm.r2 ?? lm.r) + pad)) < 1.05) return true;
    }
    return false;
  }

  private areaAt(x: number, z: number) {
    let best = AREAS[0], bd = 1e9;
    for (const a of AREAS) { const d = Math.hypot(a.x - x, a.z - z) / a.r; if (d < bd) { bd = d; best = a; } }
    return { a: best, d: bd };
  }

  private buildBuildings(night: { value: number }) {
    const r = mulberry32(42);
    const mats: THREE.Matrix4[] = [], cols: THREE.Color[] = [];
    const tanks: THREE.Matrix4[] = [], roofs: THREE.Matrix4[] = [];
    const step = IS_MOBILE ? 19 : 15;
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let x = WORLD.minX; x < WORLD.maxX; x += step) for (let z = WORLD.minZ; z < WORLD.maxZ; z += step) {
      const px = x + (r() - 0.5) * 6, pz = z + (r() - 0.5) * 6;
      const { a, d } = this.areaAt(px, pz);
      const kind: AreaKind = d < 2.1 ? a.kind : 'outskirt';
      const dens = (kind === 'outskirt' ? 0.16 : ({ cbd: 0.85, market: 0.92, res: 0.72, old: 0.62, tech: 0.55 } as Record<string, number>)[kind] * Math.max(0.15, 1 - d / 2.3));
      if (r() > dens) continue;
      const big = kind === 'cbd' || kind === 'tech';
      const w = big ? 9 + r() * 10 : kind === 'outskirt' ? 5 + r() * 6 : 5 + r() * 6.5;
      const dd = big ? 9 + r() * 10 : 5 + r() * 6;
      const q0 = this.roads.query(px, pz);
      if (q0.d < Math.max(w, dd) * 0.62 + 1.5) continue;
      if (this.blocked(px, pz, Math.max(w, dd))) continue;
      const centre = Math.max(0, 1 - Math.hypot(px - 20, pz + 100) / 600);
      let h: number;
      if (kind === 'cbd') h = 14 + r() * 30 + centre * 25;
      else if (kind === 'tech') h = 18 + r() * 40;
      else if (kind === 'market') h = 6 + r() * 9;
      else if (kind === 'old') h = 4 + r() * 6;
      else if (kind === 'res') h = 6 + r() * 10 + (r() < 0.08 ? 25 : 0);
      else h = 3.5 + r() * 6;
      q.setFromAxisAngle(up, -q0.ang + (r() < 0.15 ? 0.3 : 0));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(px, h / 2, pz), q, new THREE.Vector3(w, h, dd));
      mats.push(m);
      const pal = PALETTE[kind];
      cols.push(new THREE.Color(pal[Math.floor(r() * pal.length)]).multiplyScalar(0.92 + r() * 0.12));
      if (h < 17 && kind !== 'cbd' && kind !== 'tech' && r() < 0.65) {
        tanks.push(new THREE.Matrix4().compose(new THREE.Vector3(px + (r() - 0.5) * w * 0.5, h + 0.7, pz + (r() - 0.5) * dd * 0.5), q, new THREE.Vector3(1, 1, 1)));
      }
      if ((kind === 'old' ? r() < 0.8 : kind === 'res' ? r() < 0.12 : kind === 'outskirt' ? r() < 0.18 : false) && h < 11) {
        roofs.push(new THREE.Matrix4().compose(new THREE.Vector3(px, h + 0.6, pz), q, new THREE.Vector3(w * 1.08, 1.2, dd * 1.08)));
      }
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(box, windowMaterial(night), mats.length);
    mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]); });
    this.group.add(im);
    // Sintex-style black water tanks on rooftops
    const tankG = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 8);
    const ti = new THREE.InstancedMesh(tankG, new THREE.MeshLambertMaterial({ color: 0x202020 }), tanks.length);
    tanks.forEach((m, i) => ti.setMatrixAt(i, m));
    this.group.add(ti);
    // Mangalore-tile roofs
    const roofG = new THREE.ConeGeometry(0.72, 1, 4, 1); roofG.rotateY(Math.PI / 4);
    const ri = new THREE.InstancedMesh(roofG, new THREE.MeshLambertMaterial({ color: 0xb5532f }), roofs.length);
    roofs.forEach((m, i) => ri.setMatrixAt(i, m));
    this.group.add(ri);
  }

  private treeMats: THREE.Matrix4[] = []; private treeCols: THREE.Color[] = []; private trunkMats: THREE.Matrix4[] = [];
  private addTree(x: number, z: number, s: number, r: () => number, flower = 0) {
    const h = 2.2 * s + r() * 1.5;
    const rad = (2.2 + r() * 2.2) * s;
    this.trunkMats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
    this.treeMats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h + rad * 0.55, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(rad, rad * 0.78, rad)));
    const greens = ['#3f7d3a', '#4c8c3f', '#5c9b45', '#2f6b35', '#6aa84f', '#47803d'];
    let c = greens[Math.floor(r() * greens.length)];
    if (flower > 0 && r() < flower) c = r() < 0.55 ? '#d9452b' : '#8a6bbf'; // gulmohar & jacaranda
    this.treeCols.push(new THREE.Color(c));
  }

  private buildTrees() {
    const r = mulberry32(77);
    const parks = LANDMARKS.filter((l) => l.kind === 'park');
    for (const p of parks) {
      const rx = p.r, rz = p.r2 ?? p.r;
      for (let x = -rx; x < rx; x += 4.2) for (let z = -rz; z < rz; z += 4.2) {
        const px = p.x + x + (r() - 0.5) * 3, pz = p.z + z + (r() - 0.5) * 3;
        if (Math.hypot(x / rx, z / rz) > 0.92) continue;
        if (Math.abs(x) < 1.8 || Math.abs(z + x * 0.5) < 1.6) continue; // paths
        if (p.id === 'lalbagh' && Math.hypot(px - -48, pz - 112) < 12) continue;
        if (p.id === 'palacegrounds' && Math.hypot(px - -40, pz - -295) < 16) continue;
        if (r() < 0.82) this.addTree(px, pz, 1 + r() * 0.5, r, 0.12);
      }
    }
    // avenue trees on older / residential roads
    for (const [fi] of this.net.edgeLinks) {
      const l = this.net.links[fi];
      if (l.road.ring) continue;
      const leafy = l.area === 'old' || l.area === 'res' || l.road.id === 'bellary' || l.road.id === 'sankey';
      if (!leafy) continue;
      for (let s = 6; s < l.len - 6; s += 9 + r() * 6) for (const side of [1, -1]) {
        if (r() < 0.35) continue;
        const p = this.net.pose(l, s, side * (l.halfW + FOOT_W + 1.4));
        if (this.blocked(p.x, p.z, 1)) continue;
        this.addTree(p.x, p.z, 1.05, r, 0.08);
      }
    }
    // scattered trees
    for (let i = 0; i < (IS_MOBILE ? 500 : 1300); i++) {
      const x = WORLD.minX + r() * (WORLD.maxX - WORLD.minX), z = WORLD.minZ + r() * (WORLD.maxZ - WORLD.minZ);
      const q = this.roads.query(x, z);
      if (q.d < 3 || this.blocked(x, z, 2)) continue;
      this.addTree(x, z, 0.9 + r() * 0.5, r, 0.05);
    }
    const canopy = new THREE.IcosahedronGeometry(1, 0);
    const ci = new THREE.InstancedMesh(canopy, new THREE.MeshLambertMaterial({ flatShading: true }), this.treeMats.length);
    this.treeMats.forEach((m, i) => { ci.setMatrixAt(i, m); ci.setColorAt(i, this.treeCols[i]); });
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 1, 5);
    const tk = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: 0x6b4f35 }), this.trunkMats.length);
    this.trunkMats.forEach((m, i) => tk.setMatrixAt(i, m));
    this.group.add(ci, tk);
  }

  private ellipse(lm: Landmark, color: number, y: number, grow = 0, mat?: THREE.Material) {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, lm.r + grow, (lm.r2 ?? lm.r) + grow, 0, Math.PI * 2, false, 0);
    const g = new THREE.ShapeGeometry(shape, 40);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat ?? new THREE.MeshLambertMaterial({ color }));
    m.position.set(lm.x, y, lm.z);
    m.rotation.y = lm.rot ?? 0;
    this.group.add(m);
    return m;
  }

  private buildGreens() {
    const water = new THREE.MeshPhongMaterial({ color: 0x3f8fbf, shininess: 90, specular: 0x88bbdd });
    for (const lm of LANDMARKS) {
      if (lm.kind === 'park') { this.ellipse(lm, 0x8bbf6a, 0.07, 1.5); this.ellipse(lm, 0x7cb35f, 0.08); }
      if (lm.kind === 'lake') {
        this.ellipse(lm, 0xc8b98f, 0.02, 2.5);
        this.ellipse(lm, 0, 0.04, 0, lm.id === 'bellandurlake' || lm.id === 'varthurlake' ? new THREE.MeshPhongMaterial({ color: 0x5f8f86, shininess: 60 }) : water);
        if (lm.id === 'bellandurlake' || lm.id === 'varthurlake') {
          // the infamous froth
          const r = mulberry32(3);
          for (let i = 0; i < 14; i++) {
            const g = new THREE.CircleGeometry(2 + r() * 4, 10); g.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xf4f4f0, transparent: true, opacity: 0.85 }));
            const a = r() * Math.PI * 2, rr = r() * 0.7;
            m.position.set(lm.x + Math.cos(a) * lm.r * rr, 0.06, lm.z + Math.sin(a) * (lm.r2 ?? lm.r) * rr);
            m.userData.base = m.position.clone(); m.userData.ph = r() * 6;
            this.foam.push(m); this.group.add(m);
          }
        }
      }
    }
  }

  private add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, opts: { ry?: number; mat?: THREE.Material } = {}) {
    const m = new THREE.Mesh(geo, opts.mat ?? new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    this.group.add(m);
    return m;
  }

  private buildLandmarks() {
    for (const lm of LANDMARKS) {
      const { x, z } = lm;
      switch (lm.kind) {
        case 'vidhana': {
          const stone = 0xd9cfb8;
          this.add(new THREE.BoxGeometry(44, 9, 18), stone, x, 4.5, z);
          this.add(new THREE.BoxGeometry(16, 4, 12), stone, x, 11, z);
          this.add(new THREE.CylinderGeometry(4.5, 4.5, 4, 16), stone, x, 15, z);
          this.add(new THREE.SphereGeometry(4.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xcfc4a8, x, 17, z);
          this.add(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), 0x999999, x, 23, z);
          for (const dx of [-18, 18]) for (const dz of [-6, 6]) {
            this.add(new THREE.CylinderGeometry(1.6, 1.6, 2, 10), stone, x + dx, 10, z + dz);
            this.add(new THREE.SphereGeometry(1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xcfc4a8, x + dx, 11, z + dz);
          }
          for (let i = -5; i <= 5; i++) this.add(new THREE.BoxGeometry(0.8, 8, 0.8), 0xeee6d2, x + i * 1.8, 4, z + 9.6);
          this.add(new THREE.BoxGeometry(20, 1.2, 6), 0xbfb59c, x, 0.6, z + 12);
          const flag = this.add(new THREE.PlaneGeometry(2.4, 1.6), 0xff9933, x + 1.2, 24, z, { mat: new THREE.MeshBasicMaterial({ color: 0xff9933, side: THREE.DoubleSide }) });
          flag.userData.flag = true;
          break;
        }
        case 'stadium': {
          const pts = [new THREE.Vector2(lm.r - 8, 0.2), new THREE.Vector2(lm.r - 1, 0.2), new THREE.Vector2(lm.r, 9), new THREE.Vector2(lm.r - 1, 10), new THREE.Vector2(lm.r - 8, 1.5)];
          this.add(new THREE.LatheGeometry(pts, 36), 0xd8d8d8, x, 0, z, { mat: new THREE.MeshLambertMaterial({ color: 0xd0d4da, side: THREE.DoubleSide }) });
          const roof = new THREE.RingGeometry(lm.r - 6, lm.r + 1, 36, 1); roof.rotateX(-Math.PI / 2);
          this.add(roof, 0xffffff, x, 11.5, z, { mat: new THREE.MeshLambertMaterial({ color: 0xf5f5f5, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }) });
          const field = new THREE.CircleGeometry(lm.r - 8, 32); field.rotateX(-Math.PI / 2);
          this.stadiumField = this.add(field, 0x4caf50, x, 0.3, z);
          this.add(new THREE.BoxGeometry(2, 0.1, 8), 0xd7c08a, x, 0.36, z);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.5;
            const px = x + Math.cos(a) * (lm.r + 3), pz = z + Math.sin(a) * (lm.r + 3);
            this.add(new THREE.CylinderGeometry(0.4, 0.6, 26, 6), 0x9a9a9a, px, 13, pz);
            const head = this.add(new THREE.BoxGeometry(4, 2.4, 1), 0xeeeeee, px, 26.5, pz, { ry: -a + Math.PI / 2, mat: new THREE.MeshBasicMaterial({ color: 0x777777 }) });
            this.stadiumLights.push(head);
            const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,255,230,1)', 'rgba(255,255,200,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            gl.position.set(px, 26.5, pz); gl.scale.set(22, 22, 1); gl.visible = false;
            this.stadiumGlow.push(gl); this.group.add(gl);
          }
          break;
        }
        case 'park':
          if (lm.id === 'cubbon') {
            this.add(new THREE.BoxGeometry(18, 7, 7), 0xa63d2a, x - 14, 3.5, z + 10); // Attara Kacheri (High Court)
            for (let i = -3; i <= 3; i++) this.add(new THREE.BoxGeometry(0.6, 6, 0.6), 0xf2efe6, x - 14 + i * 2.4, 3, z + 13.8);
            this.add(new THREE.BoxGeometry(8, 6, 6), 0xb5503a, x + 10, 3, z - 6); // State Central Library
            this.add(new THREE.ConeGeometry(1.4, 4, 4), 0x8c3a28, x + 10, 8, z - 6);
          }
          break;
        case 'glasshouse': {
          const gm = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55, shininess: 120, side: THREE.DoubleSide });
          this.add(new THREE.CylinderGeometry(4, 4, 18, 16, 1, true, 0, Math.PI), 0, x, 3.5, z, { mat: gm }).rotation.z = Math.PI / 2;
          this.add(new THREE.SphereGeometry(5.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, x, 0.3, z, { mat: gm });
          break;
        }
        case 'tower': {
          this.add(new THREE.BoxGeometry(10, 52, 10), 0x9ab0c0, x, 26, z, { mat: new THREE.MeshStandardMaterial({ color: 0x8fa7b8, metalness: 0.6, roughness: 0.15 }) });
          this.add(new THREE.BoxGeometry(7, 10, 7), 0xbccbd6, x, 57, z);
          this.add(new THREE.CylinderGeometry(0.2, 1.4, 14, 6), 0xdddddd, x, 69, z);
          this.add(new THREE.BoxGeometry(14, 30, 9), 0xa8bccb, x + 12, 15, z + 4);
          break;
        }
        case 'busstand': {
          this.add(new THREE.BoxGeometry(34, 0.6, 22), 0xc7cdd3, x, 6, z);
          for (let i = -2; i <= 2; i++) for (const dz of [-9, 9]) this.add(new THREE.BoxGeometry(0.6, 6, 0.6), 0x888888, x + i * 7.5, 3, z + dz);
          const bus = new THREE.BoxGeometry(10, 2.8, 2.4);
          for (let i = 0; i < 7; i++) this.add(bus, i % 3 === 0 ? 0x2e6fb7 : 0xc62828, x - 14 + i * 4.6, 1.4, z + (i % 2 ? 3 : -3), { ry: Math.PI / 2 });
          break;
        }
        case 'palace': {
          const st = 0xd2c3a3;
          this.add(new THREE.BoxGeometry(22, 9, 10), st, x, 4.5, z);
          for (const dx of [-11, 11]) for (const dz of [-5, 5]) {
            this.add(new THREE.CylinderGeometry(2, 2, 13, 8), st, x + dx, 6.5, z + dz);
            this.add(new THREE.ConeGeometry(2.4, 4, 8), 0x7a5c45, x + dx, 15, z + dz);
          }
          this.add(new THREE.ConeGeometry(3.5, 6, 4), 0x7a5c45, x, 12, z);
          break;
        }
        case 'temple': {
          for (let i = 0; i < 5; i++) this.add(new THREE.BoxGeometry(7 - i * 1.2, 1.8, 7 - i * 1.2), 0xe9d9b6, x, 0.9 + i * 1.8, z);
          this.add(new THREE.SphereGeometry(0.9, 8, 6), 0xd4a017, x, 10, z);
          this.add(new THREE.BoxGeometry(3.4, 1.8, 1.6), 0x555555, x + 6, 0.9, z); // Nandi
          break;
        }
        case 'techpark': {
          const r = mulberry32(lm.x * 7 + lm.z);
          const glass = new THREE.MeshStandardMaterial({ color: 0x4f86b0, metalness: 0.65, roughness: 0.12 });
          for (let i = 0; i < 6; i++) {
            const a = r() * Math.PI * 2, d = r() * lm.r * 0.65;
            const h = 22 + r() * 34;
            this.add(new THREE.BoxGeometry(9 + r() * 6, h, 9 + r() * 6), 0, x + Math.cos(a) * d, h / 2, z + Math.sin(a) * d, { mat: glass });
          }
          break;
        }
        case 'mall': {
          this.add(new THREE.BoxGeometry(26, 9, 18), 0xe8e2d6, x, 4.5, z);
          this.add(new THREE.BoxGeometry(27, 1.6, 19), 0xd84315, x, 7.5, z);
          this.add(new THREE.CylinderGeometry(4, 4, 12, 12), 0x90caf9, x - 10, 6, z + 6, { mat: new THREE.MeshPhongMaterial({ color: 0x90caf9, shininess: 100 }) });
          const lot = new THREE.PlaneGeometry(30, 12); lot.rotateX(-Math.PI / 2);
          this.add(lot, 0x8a8a8a, x, 0.06, z + 16);
          break;
        }
        case 'pyramid': {
          const glass = new THREE.MeshStandardMaterial({ color: 0x5aa0d0, metalness: 0.7, roughness: 0.08, transparent: true, opacity: 0.92 });
          this.add(new THREE.ConeGeometry(lm.r, lm.r * 1.4, 4), 0, x, lm.r * 0.7, z, { mat: glass, ry: Math.PI / 4 });
          const grass = new THREE.CircleGeometry(lm.r * 1.6, 24); grass.rotateX(-Math.PI / 2);
          this.add(grass, 0x7cb35f, x, 0.06, z);
          break;
        }
      }
    }
  }

  private polyCum(pts: [number, number][]) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }

  private buildMetro() {
    const pillarG = new THREE.CylinderGeometry(0.9, 1.1, 1, 8);
    const pillars: THREE.Matrix4[] = [];
    METRO.forEach((line, li) => {
      const y = line.id === 'yellow' ? 17 : 12;
      const decks: THREE.BufferGeometry[] = [], stripes: THREE.BufferGeometry[] = [];
      for (let i = 0; i < line.pts.length - 1; i++) {
        if (line.under && i >= line.under[0] && i < line.under[1]) continue;
        const [ax, az] = line.pts[i], [bx, bz] = line.pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
        const g = new THREE.BoxGeometry(L + 1, 1.2, 5); g.rotateY(-ang); g.translate((ax + bx) / 2, y, (az + bz) / 2);
        decks.push(g);
        const s = new THREE.BoxGeometry(L + 1, 0.5, 5.1); s.rotateY(-ang); s.translate((ax + bx) / 2, y + 0.2, (az + bz) / 2);
        stripes.push(s);
        for (let d = 0; d < L; d += 24) {
          const px = ax + ((bx - ax) * d) / L, pz = az + ((bz - az) * d) / L;
          if (this.roads.query(px, pz).d < -3 && line.id !== 'yellow') continue; // keep pillars out of lanes where possible
          pillars.push(new THREE.Matrix4().compose(new THREE.Vector3(px, y / 2, pz), new THREE.Quaternion(), new THREE.Vector3(1, y, 1)));
        }
      }
      if (decks.length) {
        this.group.add(new THREE.Mesh(mergeGeometries(decks), new THREE.MeshLambertMaterial({ color: 0xc9c9c4 })));
        this.group.add(new THREE.Mesh(mergeGeometries(stripes), new THREE.MeshLambertMaterial({ color: line.color })));
      }
      const cum = this.polyCum(line.pts);
      for (let k = 0; k < 2; k++) {
        const train = new THREE.Group();
        const body = new THREE.MeshStandardMaterial({ color: 0xe9ecef, metalness: 0.5, roughness: 0.35 });
        const livery = new THREE.MeshLambertMaterial({ color: line.color });
        const glass = new THREE.MeshStandardMaterial({ color: 0x1b2836, metalness: 0.8, roughness: 0.15 });
        for (let c = 0; c < 3; c++) {
          const x = -c * 7.9;
          const car = new THREE.Mesh(new RoundedBoxGeometry(7.6, 2.7, 2.8, 3, 0.45), body); car.position.set(x, 0, 0);
          const band = new THREE.Mesh(new RoundedBoxGeometry(7.65, 0.55, 2.86, 2, 0.2), livery); band.position.set(x, -0.75, 0);
          const win = new THREE.Mesh(new RoundedBoxGeometry(7.0, 0.85, 2.88, 2, 0.25), glass); win.position.set(x, 0.35, 0);
          train.add(car, band, win);
          for (const dz of [-1.44, 1.44]) for (const dx of [-2, 2]) {
            const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.05), livery); door.position.set(x + dx, -0.1, dz); train.add(door);
          }
          if (c === 0) { // sloped driver cab nose
            const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI), body);
            nose.rotation.y = Math.PI / 2; nose.scale.set(1, 0.95, 0.75); nose.position.set(x + 3.8, 0, 0); train.add(nose);
          }
        }
        this.group.add(train);
        this.trains.push({ line: li, u: k * 0.5 * cum[cum.length - 1], dir: k ? -1 : 1, mesh: train, len: cum[cum.length - 1], cum, pts: line.pts, y: y + 2, under: line.under });
      }
    });
    const pi = new THREE.InstancedMesh(pillarG, new THREE.MeshLambertMaterial({ color: 0xb5b5ae }), pillars.length);
    pillars.forEach((m, i) => pi.setMatrixAt(i, m));
    this.group.add(pi);
  }

  private buildFlyovers() {
    const net = this.net;
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8d9096 });
    const pillars: THREE.Matrix4[] = [];
    const along = (a: string, b: string, y: number, w: number, from = 0, to = 1) => {
      const l = net.linkBetween(a, b);
      if (!l) return;
      const geos: THREE.BufferGeometry[] = [];
      const n = l.pts.length / 2;
      for (let i = 0; i < n - 1; i++) {
        const t = l.cum[i] / l.len;
        if (t < from || t > to) continue;
        const ax = l.pts[i * 2], az = l.pts[i * 2 + 1], bx = l.pts[i * 2 + 2], bz = l.pts[i * 2 + 3];
        const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
        const g = new THREE.BoxGeometry(L + 0.6, 1.2, w); g.rotateY(-ang); g.translate((ax + bx) / 2, y, (az + bz) / 2);
        geos.push(g);
        pillars.push(new THREE.Matrix4().compose(new THREE.Vector3(ax, y / 2, az), new THREE.Quaternion(), new THREE.Vector3(1.4, y, 1.4)));
      }
      if (geos.length) {
        this.group.add(new THREE.Mesh(mergeGeometries(geos), deckMat));
      }
    };
    along('silk_board', 'btm', 9, 9, 0.18, 0.95);          // Silk Board double-decker (road deck under the Yellow Line)
    along('silk_board', 'bommanahalli', 9, 10, 0.2, 1);    // Hosur Rd elevated expressway
    along('bommanahalli', 'ecity', 9, 10, 0, 0.92);
    along('hebbal', 'mekhri', 7, 9, 0, 0.35);              // Hebbal flyover ramps
    along('hebbal', 'airport', 7, 9, 0, 0.25);
    along('kr_puram', 'marathahalli', 7, 8, 0, 0.18);      // KR Puram hanging bridge approach
    const pg = new THREE.CylinderGeometry(0.8, 1, 1, 6);
    const pi = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: 0xa7a7a0 }), pillars.length);
    pillars.forEach((m, i) => pi.setMatrixAt(i, m));
    this.group.add(pi);
  }

  update(dt: number, t: number, night: number, matchDay: boolean) {
    for (const tr of this.trains) {
      tr.u += tr.dir * dt * 16;
      if (tr.u > tr.len) { tr.u = tr.len; tr.dir = -1; }
      if (tr.u < 0) { tr.u = 0; tr.dir = 1; }
      let i = 1; while (i < tr.cum.length - 1 && tr.cum[i] < tr.u) i++;
      const a = tr.pts[i - 1], b = tr.pts[i];
      const f = (tr.u - tr.cum[i - 1]) / (tr.cum[i] - tr.cum[i - 1] || 1);
      tr.mesh.position.set(a[0] + (b[0] - a[0]) * f, tr.y, a[1] + (b[1] - a[1]) * f);
      tr.mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]) + (tr.dir < 0 ? Math.PI : 0);
      tr.mesh.visible = !(tr.under && i - 1 >= tr.under[0] && i - 1 < tr.under[1]);
    }
    const lit = matchDay && night > 0.25;
    for (const h of this.stadiumLights) (h.material as THREE.MeshBasicMaterial).color.setHex(lit ? 0xffffee : matchDay ? 0xdddddd : 0x777777);
    for (const g of this.stadiumGlow) { g.visible = lit; g.material.opacity = 0.75 + Math.sin(t * 3) * 0.05; }
    if (this.stadiumField) (this.stadiumField.material as THREE.MeshLambertMaterial).emissive.setHex(lit ? 0x2e7d32 : 0x000000);
    for (const f of this.foam) { const b = f.userData.base as THREE.Vector3; f.position.x = b.x + Math.sin(t * 0.2 + f.userData.ph) * 2; f.position.z = b.z + Math.cos(t * 0.17 + f.userData.ph) * 2; }
  }
}
