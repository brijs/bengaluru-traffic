import * as THREE from 'three';
import { SLIDER_BY_ID } from '../data/sliders';
import type { Hazard } from '../sim/hazards';
import { LANE_W, type Network } from '../sim/network';
import type { Sim } from '../sim/sim';
import { mulberry32 } from '../sim/rng';
import { markerTex, stripeTex } from './textures';

const CAT_RING: Record<string, string> = { road: '#ff5a1f', peds: '#d946ef', behavior: '#ef4444', vehicles: '#f59e0b', others: '#16a34a', signals: '#2563eb', environment: '#64748b' };

interface Entry { h: Hazard; g: THREE.Group; marker: THREE.Sprite; born: number; dying: number; sev: number; ripples?: THREE.Mesh[] }

const mat = (c: number, o: Partial<THREE.MeshLambertMaterialParameters> = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const M = {
  pothole: mat(0x23201c), potholeIn: mat(0x141210), bump: new THREE.MeshLambertMaterial({ map: stripeTex('#6e6e6e', '#8f8a6a', 8) }),
  barrier: new THREE.MeshLambertMaterial({ map: stripeTex('#111111', '#f5c400', 6) }), barrierRW: new THREE.MeshLambertMaterial({ map: stripeTex('#f5f5f5', '#d32f2f', 6) }),
  leg: mat(0x333333), pole: mat(0x8a8f94), trafo: mat(0x5f6b63), dirt: mat(0x7a5a3a), cone: mat(0xff6d00), coneW: mat(0xffffff),
  manhole: mat(0x0d0d0d), rim: mat(0x555555), mud: new THREE.MeshLambertMaterial({ color: 0x6f5233, transparent: true, opacity: 0.8 }),
  water: new THREE.MeshPhongMaterial({ color: 0x4a7fa8, transparent: true, opacity: 0.72, shininess: 120, depthWrite: false }),
  ripple: new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.6, depthWrite: false }),
  cart: mat(0x8d5a2b), jcb: mat(0xf2b705),
  bag: [mat(0x1b1b1b), mat(0x2e7d32), mat(0x1565c0), mat(0x6d4c41), mat(0xe0e0e0)],
  car: [0xffffff, 0xc0c4c8, 0x2b2d31, 0xb71c1c, 0x1e4fa3, 0x9aa0a6].map((c) => mat(c)), glass: mat(0x2c3a48),
  fruit: [mat(0xff5722), mat(0xffeb3b), mat(0x4caf50), mat(0xe91e63)], umb: [mat(0xe53935), mat(0x1e88e5), mat(0xfdd835)],
};

export class HazardsView {
  group = new THREE.Group();
  private entries = new Map<number, Entry>();
  markersOn = true;
  /** Slider categories whose markers are switched off. */
  hiddenCats = new Set<string>();
  onRemoved?: (h: Hazard, x: number, z: number) => void;

  constructor(private net: Network, private sim: Sim) {}

  sync(now: number) {
    const list = this.sim.haz.list;
    const seen = new Set<number>();
    for (const h of list) {
      seen.add(h.id);
      const e = this.entries.get(h.id);
      if (!e) this.create(h, now);
      else {
        e.h = h;
        if (e.sev !== h.sev) { e.sev = h.sev; e.born = now - 0.2; }
        e.marker.material.map = markerTex(SLIDER_BY_ID[h.slider]?.icon ?? '⚠️', h.ghost ? '#2b7bff' : CAT_RING[SLIDER_BY_ID[h.slider]?.cat ?? 'road']);
      }
    }
    for (const [id, e] of this.entries) if (!seen.has(id) && e.dying < 0) { e.dying = now; this.onRemoved?.(e.h, e.h.x, e.h.z); }
  }

  private create(h: Hazard, now: number) {
    const g = new THREE.Group();
    const net = this.net;
    const r = mulberry32(h.id * 31 + 7);
    if (h.link >= 0) {
      const l = net.links[h.link];
      const lat = h.lane < 0 ? (l.median / 2 + l.halfW) / 2 : net.laneLat(l, Math.min(h.lane, l.nLanes - 1));
      const p = net.pose(l, h.s, lat);
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(-p.dz, p.dx);
      const width = l.halfW - l.median / 2;
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
        const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o;
      };
      switch (h.kind) {
        case 'pothole': {
          const shape = new THREE.Shape();
          const n = 11, R = 1.15 + r() * 0.5;
          for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = R * (0.7 + r() * 0.5); i ? shape.lineTo(Math.cos(a) * rr * 1.4, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr * 1.4, Math.sin(a) * rr); }
          const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-Math.PI / 2);
          add(sg, M.pothole, 0, 0.075, 0);
          const ig = sg.clone(); ig.scale(0.6, 1, 0.6); add(ig, M.potholeIn, 0.1, 0.08, 0.05);
          for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.3, 0.15, 0.25), M.rim, (r() - 0.5) * 3, 0.1, (r() - 0.5) * 2.2, r() * 3);
          break;
        }
        case 'bump': add(new THREE.BoxGeometry(1.1, 0.22, width), M.bump, 0, 0.11, 0); break;
        case 'barrier': {
          const m = r() < 0.5 ? M.barrier : M.barrierRW;
          for (let i = 0; i < 2; i++) {
            add(new THREE.BoxGeometry(1.7, 0.75, 0.35), m, (i - 0.5) * 1.9, 0.75, (r() - 0.5) * 0.6, (r() - 0.5) * 0.5);
            add(new THREE.BoxGeometry(0.1, 0.5, 0.9), M.leg, (i - 0.5) * 1.9 - 0.7, 0.25, 0);
            add(new THREE.BoxGeometry(0.1, 0.5, 0.9), M.leg, (i - 0.5) * 1.9 + 0.7, 0.25, 0);
          }
          break;
        }
        case 'pole': {
          add(new THREE.CylinderGeometry(0.18, 0.25, 9, 6), M.pole, 0, 4.5, 0.6);
          add(new THREE.BoxGeometry(1.1, 1.4, 0.9), M.trafo, 0, 5.5, 0.6);
          add(new THREE.BoxGeometry(1.4, 0.4, 1.4), M.rim, 0, 0.2, 0.6);
          break;
        }
        case 'garbage': {
          const mound = new THREE.ConeGeometry(1.6, 0.8, 7); add(mound, M.dirt, 0, 0.4, 0.4);
          for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.35 + r() * 0.25, 6, 5), M.bag[Math.floor(r() * M.bag.length)], (r() - 0.5) * 2.6, 0.45 + r() * 0.4, (r() - 0.2) * 1.4);
          break;
        }
        case 'trench': {
          const L = h.len;
          add(new THREE.BoxGeometry(L, 0.12, 2.6), M.dirt, 0, 0.06, 0);
          add(new THREE.ConeGeometry(1.4, 1.6, 7), M.dirt, L / 2 - 1.5, 0.8, 0.4);
          for (let x = -L / 2; x <= L / 2; x += 3.2) for (const z of [-1.5, 1.5]) {
            if (r() < 0.35) continue; // gaps: no proper barricading
            add(new THREE.ConeGeometry(0.25, 0.8, 8), M.cone, x, 0.4, z);
            add(new THREE.CylinderGeometry(0.17, 0.2, 0.15, 8), M.coneW, x, 0.5, z);
          }
          const jcb = new THREE.Group();
          const b1 = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 2), M.jcb); b1.position.y = 1.3; jcb.add(b1);
          const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.6), M.jcb); b2.position.set(-0.6, 2.6, 0); jcb.add(b2);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.3), M.jcb); arm.position.set(2.4, 2.4, 0); arm.rotation.z = -0.5; jcb.add(arm);
          jcb.position.set(-L / 2 - 2, 0, 0.3);
          g.add(jcb);
          break;
        }
        case 'manhole': {
          add(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 16), M.rim, 0, 0.07, 0);
          add(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 16), M.manhole, 0, 0.08, 0);
          break;
        }
        case 'mud': {
          const pg = new THREE.PlaneGeometry(h.len, width * 0.95); pg.rotateX(-Math.PI / 2);
          add(pg, M.mud, 0, 0.08, 0);
          for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.3 + r() * 0.3, 5, 4), M.dirt, (r() - 0.5) * h.len, 0.1, (r() - 0.5) * width);
          break;
        }
        case 'puddle': {
          const shape = new THREE.Shape(); shape.absellipse(0, 0, h.len / 2, width * 0.55, 0, Math.PI * 2, false, 0);
          const sg = new THREE.ShapeGeometry(shape, 24); sg.rotateX(-Math.PI / 2);
          add(sg, M.water, 0, 0.11, 0);
          break;
        }
        case 'parked': {
          for (let k = 0; k < h.count; k++) {
            const x = (k - (h.count - 1) / 2) * 5.2;
            const cm = M.car[Math.floor(r() * M.car.length)];
            add(new THREE.BoxGeometry(4.1, 0.75, 1.75), cm, x, 0.6, 0.45 + (r() - 0.5) * 0.4, (r() - 0.5) * 0.12);
            add(new THREE.BoxGeometry(2.2, 0.6, 1.55), M.glass, x - 0.2, 1.25, 0.45);
          }
          break;
        }
        case 'vendor': {
          add(new THREE.BoxGeometry(2, 0.7, 1.1), M.cart, 0, 0.9, 0.5);
          for (const x of [-0.7, 0.7]) add(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 10), M.leg, x, 0.35, 1.1).rotation.x = Math.PI / 2;
          for (let i = 0; i < 10; i++) add(new THREE.SphereGeometry(0.17, 6, 5), M.fruit[i % 4], (r() - 0.5) * 1.7, 1.35, 0.5 + (r() - 0.5) * 0.8);
          add(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), M.leg, 0, 1.9, 0.5);
          add(new THREE.ConeGeometry(1.5, 0.6, 8), M.umb[Math.floor(r() * 3)], 0, 3, 0.5);
          add(new THREE.CylinderGeometry(0.22, 0.3, 1.25, 6), M.umb[0], 1.4, 0.65, 0.2);
          add(new THREE.SphereGeometry(0.2, 7, 5), M.cart, 1.4, 1.5, 0.2);
          break;
        }
      }
    } else {
      const nd = net.nodes[h.node];
      g.position.set(nd.x, 0, nd.z);
    }
    const sl = SLIDER_BY_ID[h.slider];
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex(sl?.icon ?? '⚠️', h.ghost ? '#2b7bff' : CAT_RING[sl?.cat ?? 'road']), depthTest: false, sizeAttenuation: false, transparent: true }));
    marker.scale.set(0.042, 0.049, 1);
    marker.center.set(0.5, 0);
    marker.position.set(0, h.kind === 'pole' ? 10 : 5, 0);
    marker.renderOrder = 20;
    marker.userData.hid = h.id;
    g.add(marker);
    g.userData.hid = h.id;
    this.group.add(g);
    this.entries.set(h.id, { h, g, marker, born: now, dying: -1, sev: h.sev });
  }

  update(now: number, camDist: number, wallT: number, cam?: THREE.Vector3) {
    const low = !!cam && cam.y < 60;
    const showFar = camDist < 1000;
    const showLinkLevel = camDist < 420;
    for (const [id, e] of this.entries) {
      if (e.dying >= 0) {
        const k = 1 - (now - e.dying) / 0.7;
        if (k <= 0) { this.group.remove(e.g); this.entries.delete(id); continue; }
        e.g.scale.setScalar(Math.max(0.01, k));
        e.g.position.y = (1 - k) * 2;
        continue;
      }
      const age = now - e.born;
      const pop = age < 0.6 ? 1 + Math.sin(Math.min(1, age / 0.6) * Math.PI) * 0.45 : 1;
      const sev = 1 + (e.h.sev - 1) * 0.35;
      const s = Math.min(1, Math.max(0.05, age / 0.35)) * pop * sev;
      for (const c of e.g.children) if (c !== e.marker) c.scale.setScalar(s);
      const linkLevel = e.h.kind === 'dark' || e.h.kind === 'faded' || e.h.kind === 'nofoot';
      const far = low && Math.hypot(e.h.x - cam!.x, e.h.z - cam!.z) > 160;
      e.marker.visible = this.markersOn && !this.hiddenCats.has(SLIDER_BY_ID[e.h.slider]?.cat ?? 'road') && showFar && !far && (!linkLevel || showLinkLevel);
      const pulse = 1 + Math.sin(wallT * 4 + id) * 0.06 + (e.h.ghost ? Math.sin(wallT * 8) * 0.12 : 0);
      e.marker.scale.set(0.042 * pulse, 0.049 * pulse, 1);
      if (e.h.kind === 'puddle') {
        const w = e.g.children[0];
        if (w) w.position.y = 0.11 + Math.sin(wallT * 2 + id) * 0.01;
      }
    }
  }

  markers(): THREE.Sprite[] { return [...this.entries.values()].filter((e) => e.dying < 0 && e.marker.visible).map((e) => e.marker); }
}

export const CAT_COLORS = CAT_RING;
export const LANE = LANE_W;
