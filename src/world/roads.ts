import * as THREE from 'three';
import { FOOT_W, LANE_W, type Link, type Network } from '../sim/network';
import type { Sim } from '../sim/sim';
import { asphaltTex, dirtTex, glowTex, paverTex, stripeTex, worldUV, zebraTex } from './textures';
import { mulberry32 } from '../sim/rng';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Accumulates triangles; remembers vertex ranges per key so parts can be hidden by sinking them. */
class Builder {
  pos: number[] = []; uv: number[] = []; col: number[] = []; idx: number[] = [];
  ranges = new Map<string, [number, number][]>();
  private key = '';
  begin(key: string) { this.key = key; }
  private mark(start: number) {
    const arr = this.ranges.get(this.key) ?? [];
    arr.push([start, this.pos.length / 3 - start]);
    this.ranges.set(this.key, arr);
  }
  quad(a: number[], b: number[], c: number[], d: number[], color: number[] = [1, 1, 1], uvs?: number[]) {
    const s = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    this.uv.push(...(uvs ?? [0, 0, 1, 0, 1, 1, 0, 1]));
    for (let i = 0; i < 4; i++) this.col.push(...color);
    this.idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    if (this.key) this.mark(s);
  }
  /** Upward-facing triangle (winding fixed automatically). */
  tri(a: number[], b: number[], c: number[], color: number[]) {
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    if (ny < 0) this.quad(a, c, b, b, color, [0, 0, 1, 0, 1, 1, 1, 1]);
    else this.quad(a, b, c, c, color, [0, 0, 1, 0, 1, 1, 1, 1]);
  }
  // Ribbon along a polyline between lateral offsets la..lb (left-positive) at height y.
  ribbon(pts: Float64Array, la: number, lb: number, y: number, color: number[], uvScale = 0, s0 = 0, s1 = 1e9) {
    const n = pts.length / 2;
    let acc = 0;
    const nrm = (i: number) => {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
      let dx = pts[i1 * 2] - pts[i0 * 2], dz = pts[i1 * 2 + 1] - pts[i0 * 2 + 1];
      const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      return [dz, -dx];
    };
    for (let i = 0; i < n - 1; i++) {
      const segL = Math.hypot(pts[i * 2 + 2] - pts[i * 2], pts[i * 2 + 3] - pts[i * 2 + 1]);
      const a0 = acc, a1 = acc + segL;
      acc = a1;
      if (a1 < s0 || a0 > s1) continue;
      const [ax, az] = nrm(i), [bx, bz] = nrm(i + 1);
      const t0 = Math.max(0, (s0 - a0) / (segL || 1)), t1 = Math.min(1, (s1 - a0) / (segL || 1));
      const X0 = pts[i * 2], Z0 = pts[i * 2 + 1], X1 = pts[i * 2 + 2], Z1 = pts[i * 2 + 3];
      const x0 = X0 + (X1 - X0) * t0, z0 = Z0 + (Z1 - Z0) * t0, x1 = X0 + (X1 - X0) * t1, z1 = Z0 + (Z1 - Z0) * t1;
      const nx0 = ax + (bx - ax) * t0, nz0 = az + (bz - az) * t0, nx1 = ax + (bx - ax) * t1, nz1 = az + (bz - az) * t1;
      const u0 = uvScale ? (a0 + segL * t0) / uvScale : 0, u1 = uvScale ? (a0 + segL * t1) / uvScale : 1;
      this.quad(
        [x0 + nx0 * la, y, z0 + nz0 * la], [x1 + nx1 * la, y, z1 + nz1 * la],
        [x1 + nx1 * lb, y, z1 + nz1 * lb], [x0 + nx0 * lb, y, z0 + nz0 * lb],
        color, [u0, 0, u1, 0, u1, 1, u0, 1],
      );
    }
  }
  // Vertical strip (kerb face) at lateral offset `lat` from y0 to y1.
  wall(pts: Float64Array, lat: number, y0: number, y1: number, color: number[], uvScale = 2) {
    const n = pts.length / 2;
    let acc = 0;
    for (let i = 0; i < n - 1; i++) {
      const x0 = pts[i * 2], z0 = pts[i * 2 + 1], x1 = pts[i * 2 + 2], z1 = pts[i * 2 + 3];
      let dx = x1 - x0, dz = z1 - z0;
      const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      const nx = dz, nz = -dx;
      const u0 = acc / uvScale, u1 = (acc + d) / uvScale;
      acc += d;
      this.quad([x0 + nx * lat, y0, z0 + nz * lat], [x1 + nx * lat, y0, z1 + nz * lat], [x1 + nx * lat, y1, z1 + nz * lat], [x0 + nx * lat, y1, z0 + nz * lat], color, [u0, 0, u1, 0, u1, 1, u0, 1]);
    }
  }
  build(alpha = false): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (alpha) {
      const c4: number[] = [];
      for (let i = 0; i < this.col.length; i += 3) c4.push(this.col[i], this.col[i + 1], this.col[i + 2], 0.3);
      g.setAttribute('color', new THREE.Float32BufferAttribute(c4, 4));
    } else g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

/** Toggle visibility of keyed ranges of a merged geometry by sinking vertices below ground. */
class Toggle {
  private orig: Float32Array;
  private state = new Map<string, boolean>();
  constructor(private geo: THREE.BufferGeometry, private ranges: Map<string, [number, number][]>) {
    this.orig = Float32Array.from((geo.attributes.position as THREE.BufferAttribute).array as Float32Array);
  }
  set(key: string, vis: boolean) {
    if ((this.state.get(key) ?? true) === vis) return;
    this.state.set(key, vis);
    const arr = (this.geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (const [s, n] of this.ranges.get(key) ?? []) for (let i = s; i < s + n; i++) arr[i * 3 + 1] = vis ? this.orig[i * 3 + 1] : -60;
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

const hex = (h: number) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const ASPHALT = hex(0x5c6066), ASPHALT_MAJOR = hex(0x4f5258), FOOT = hex(0xffffff), DIRT = hex(0xffffff), WHITE = hex(0xf2f2f2), YELLOW = hex(0xf5c400), MEDIAN = hex(0x8f9a7a);

export class Roads {
  group = new THREE.Group();
  overlay: THREE.Mesh;
  private footT: Toggle; private markT: Toggle; private zebraT: Toggle;
  private segOf: { start: number; n: number; seg: number }[] = [];
  private juncOv: { start: number; n: number; arms: [number, number][] }[] = [];
  private segV: Float32Array; private segSum: Float32Array; private segCnt: Float32Array;
  private lamps: THREE.InstancedMesh; private lampHeads: THREE.InstancedMesh; private lampGlow: THREE.InstancedMesh;
  private lampEdge: number[] = []; private lampMat: THREE.Matrix4[] = [];
  private sigLamps: THREE.InstancedMesh; private sigKeys: { node: number; link: number }[] = [];
  private zebraOrder: number[] = [];
  private lastDark = new Set<number>(); private glowOn = -1;
  overlayOn = true;

  constructor(private net: Network, private sim: Sim) {
    const roadB = new Builder(), dirtB = new Builder(), footB = new Builder(), kerbB = new Builder(), markB = new Builder(), ovB = new Builder(), zebraB = new Builder();
    const rnd = mulberry32(5);
    net.edgeLinks.forEach(([fi], ei) => {
      const l = net.links[fi];
      const P = l.pts;
      const major = l.road.major || l.road.ring;
      roadB.ribbon(P, -l.halfW, l.halfW, 0.03, major ? ASPHALT_MAJOR : ASPHALT);
      // footpaths and their dirt alternatives
      footB.begin('f' + ei);
      footB.ribbon(P, l.halfW, l.halfW + FOOT_W, 0.2, FOOT);
      footB.ribbon(P, -l.halfW - FOOT_W, -l.halfW, 0.2, FOOT);
      dirtB.begin('d' + ei);
      dirtB.ribbon(P, l.halfW, l.halfW + FOOT_W, 0.045, DIRT);
      dirtB.ribbon(P, -l.halfW - FOOT_W, -l.halfW, 0.045, DIRT);
      kerbB.begin('f' + ei);
      kerbB.wall(P, l.halfW, 0.03, 0.2, [1, 1, 1]);
      kerbB.wall(P, -l.halfW, 0.03, 0.2, [1, 1, 1]);
      kerbB.begin('');
      if (l.median >= 0.8) {
        kerbB.wall(P, l.median / 2, 0.03, 0.4, [1, 0.85, 0.2]);
        kerbB.wall(P, -l.median / 2, 0.03, 0.4, [1, 0.85, 0.2]);
        footB.begin('');
        footB.ribbon(P, -l.median / 2, l.median / 2, 0.4, MEDIAN);
      }
      // markings: lane dashes (fade-able) + edge lines
      const keep = 'k' + ei, fade = 'x' + ei;
      for (const dir of [1, -1]) {
        for (let k = 1; k < l.nLanes; k++) {
          const lat = dir * (l.median / 2 + k * LANE_W);
          for (let s = 2; s < l.len - 4; s += 9) {
            markB.begin(rnd() < 0.75 ? fade : keep);
            markB.ribbon(P, lat - 0.08, lat + 0.08, 0.06, WHITE, 0, s, s + 3.5);
          }
        }
        markB.begin(rnd() < 0.6 ? fade : keep);
        markB.ribbon(P, dir * (l.halfW - 0.35) - 0.07, dir * (l.halfW - 0.35) + 0.07, 0.06, WHITE);
      }
      if (l.median < 0.8) { markB.begin(fade); markB.ribbon(P, -0.18, -0.06, 0.06, YELLOW); markB.ribbon(P, 0.06, 0.18, 0.06, YELLOW); }
    });
    // stop lines + zebra crossings at signal junctions
    for (const nd of net.nodes) {
      if (!sim.signals.has(nd.id)) continue;
      for (const li of nd.ins) {
        const l = net.links[li];
        markB.begin('');
        markB.ribbon(l.pts, l.median / 2, l.halfW, 0.065, WHITE, 0, l.len - 4.4, l.len - 3.9);
        zebraB.begin('z' + nd.id);
        zebraB.ribbon(l.pts, -l.halfW, l.halfW, 0.07, WHITE, 0, l.len - 3.3, l.len - 0.2);
      }
      this.zebraOrder.push(nd.id);
    }
    this.zebraOrder.sort(() => rnd() - 0.5);
    const juncRings: { x: number; z: number; ring: [number, number][]; tris: number[][]; arms: [number, number][] }[] = [];
    // junctions: asphalt shaped from the arms that meet there, with curved kerb returns and footpath corners
    for (const nd of net.nodes) {
      if (nd.kind === 'end' || nd.outs.length < 2) continue;
      const arms = nd.outs.map((li) => {
        const l = net.links[li], p = net.pose(l, 0, 0);
        return { l, x: p.x, z: p.z, dx: p.dx, dz: p.dz, nx: p.dz, nz: -p.dx, hw: l.halfW, ang: Math.atan2(p.dz, p.dx) };
      }).sort((a, b) => a.ang - b.ang);
      const major = arms.some((a) => a.l.road.major || a.l.road.ring);
      const col = major ? ASPHALT_MAJOR : ASPHALT;
      // a curve from point A (heading inward along -da) to B (heading inward along -db): quadratic through the kerb-line intersection
      const curve = (ax: number, az: number, dax: number, daz: number, bx: number, bz: number, dbx: number, dbz: number, n: number) => {
        const det = dax * -dbz + dbx * daz; // solve A + t·da = B + u·db
        let cx = (ax + bx) / 2, cz = (az + bz) / 2;
        if (Math.abs(det) > 0.08) {
          const rx = bx - ax, rz = bz - az;
          const t = (rx * -dbz + dbx * rz) / det, u = (dax * rz - daz * rx) / det;
          if (t < 0.5 && u < 0.5 && t > -nd.r * 0.95 && u > -nd.r * 0.95) { cx = ax + dax * t; cz = az + daz * t; }
        }
        const out: [number, number][] = [];
        for (let k = 0; k <= n; k++) {
          const q = k / n, w0 = (1 - q) * (1 - q), w1 = 2 * q * (1 - q), w2 = q * q;
          out.push([w0 * ax + w1 * cx + w2 * bx, w0 * az + w1 * cz + w2 * bz]);
        }
        return out;
      };
      const ring: [number, number][] = [];
      for (let i = 0; i < arms.length; i++) {
        const A = arms[i], B = arms[(i + 1) % arms.length];
        // A's side facing B is its right (-n); B's side facing A is its left (+n)
        const ra = [A.x - A.nx * A.hw, A.z - A.nz * A.hw], lb = [B.x + B.nx * B.hw, B.z + B.nz * B.hw];
        ring.push([A.x + A.nx * A.hw, A.z + A.nz * A.hw], [ra[0], ra[1]]);
        const inner = curve(ra[0], ra[1], A.dx, A.dz, lb[0], lb[1], B.dx, B.dz, 8);
        ring.push(...inner.slice(1, -1));
        // footpath corner between the two arms
        const fw = A.hw + FOOT_W, fwb = B.hw + FOOT_W;
        const outer = curve(A.x - A.nx * fw, A.z - A.nz * fw, A.dx, A.dz, B.x + B.nx * fwb, B.z + B.nz * fwb, B.dx, B.dz, 8);
        footB.begin('');
        for (let k = 0; k < 8; k++) {
          const a = inner[k], b = inner[k + 1], c = outer[k + 1], d = outer[k];
          footB.tri([a[0], 0.2, a[1]], [b[0], 0.2, b[1]], [c[0], 0.2, c[1]], FOOT);
          footB.tri([a[0], 0.2, a[1]], [c[0], 0.2, c[1]], [d[0], 0.2, d[1]], FOOT);
        }
        kerbB.begin('');
        kerbB.wall(Float64Array.from(inner.flat()), 0, 0.03, 0.2, [1, 1, 1]);
      }
      // earcut handles concave outlines without the overlaps a centre fan gives
      const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
      roadB.begin('');
      for (const [i0, i1, i2] of tris) {
        const a = ring[i0], b = ring[i1], c = ring[i2];
        roadB.tri([a[0], 0.03, a[1]], [b[0], 0.03, b[1]], [c[0], 0.03, c[1]], col);
      }
      juncRings.push({ x: nd.x, z: nd.z, ring, tris, arms: arms.map((a) => [a.l.rev, a.l.id] as [number, number]) });
    }
    // overlay segments
    for (const l of net.links) {
      const nSeg = Math.max(1, Math.round(l.len / 14));
      const start = ovB.pos.length / 3;
      for (let k = 0; k < nSeg; k++) {
        const s0 = (k / nSeg) * l.len, s1 = ((k + 1) / nSeg) * l.len;
        const a = net.pose(l, s0, l.median / 2 + 0.2), b = net.pose(l, s1, l.median / 2 + 0.2);
        const c = net.pose(l, s1, l.halfW - 0.2), d = net.pose(l, s0, l.halfW - 0.2);
        ovB.quad([a.x, 0.09, a.z], [b.x, 0.09, b.z], [c.x, 0.09, c.z], [d.x, 0.09, d.z], hex(0x22c55e));
      }
      this.segOf.push({ start, n: nSeg, seg: l.len / nSeg });
    }
    // junction overlay: each vertex takes the colour of its nearest arm, the centre the average
    for (const j of juncRings) {
      const start = ovB.pos.length / 3;
      for (const [i0, i1, i2] of j.tris) {
        const a = j.ring[i0], b = j.ring[i1], c = j.ring[i2];
        ovB.tri([a[0], 0.09, a[1]], [b[0], 0.09, b[1]], [c[0], 0.09, c[1]], hex(0x22c55e));
      }
      this.juncOv.push({ start, n: ovB.pos.length / 3 - start, arms: j.arms });
    }
    const totalSeg = this.segOf.reduce((a, b) => a + b.n, 0);
    this.segV = new Float32Array(totalSeg).fill(1);
    this.segSum = new Float32Array(totalSeg);
    this.segCnt = new Float32Array(totalSeg);

    const asphalt = asphaltTex();
    const roadGeo = roadB.build(); worldUV(roadGeo, 9);
    const roadMesh = new THREE.Mesh(roadGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: asphalt }));
    const dirtGeo = dirtB.build(); worldUV(dirtGeo, 6);
    const dirtMesh = new THREE.Mesh(dirtGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: dirtTex() }));
    dirtMesh.matrixAutoUpdate = false; this.group.add(dirtMesh);
    this.dirtT = new Toggle(dirtGeo, dirtB.ranges);
    const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, map: paverTex() });
    const footGeo = footB.build();
    worldUV(footGeo, 3);
    const footMesh = new THREE.Mesh(footGeo, vmat);
    const kerbGeo = kerbB.build();
    const kerbMesh = new THREE.Mesh(kerbGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: stripeTex('#1a1a1a', '#f0f0f0', 8), side: THREE.DoubleSide }));
    const markGeo = markB.build();
    const markMesh = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xdddddd }));
    const zebraGeo = zebraB.build();
    const zmat = new THREE.MeshBasicMaterial({ map: zebraTex(), transparent: true, color: 0xeeeeee, depthWrite: false });
    const zebraMesh = new THREE.Mesh(zebraGeo, zmat);
    // repeat zebra texture across width (u along length is fine: stripes run across lanes)
    const uv = zebraGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 6);
    const ovGeo = ovB.build(true);
    this.overlay = new THREE.Mesh(ovGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    this.overlay.renderOrder = 2;
    for (const m of [roadMesh, footMesh, kerbMesh, markMesh, zebraMesh, this.overlay]) { m.matrixAutoUpdate = false; this.group.add(m); }
    markMesh.renderOrder = 1; zebraMesh.renderOrder = 1;
    this.footT = new Toggle(footGeo, footB.ranges);
    this.markT = new Toggle(markGeo, markB.ranges);
    this.zebraT = new Toggle(zebraGeo, zebraB.ranges);
    this.kerbT = new Toggle(kerbGeo, kerbB.ranges);
    net.edgeLinks.forEach((_, ei) => this.dirtT.set('d' + ei, false));

    // street lamps
    const lampPos: { x: number; z: number; ry: number; e: number }[] = [];
    net.edgeLinks.forEach(([fi], ei) => {
      const l = net.links[fi];
      for (let s = 12; s < l.len - 8; s += 34) for (const side of [1, -1]) {
        const p = net.pose(l, s + (side > 0 ? 0 : 17), side * (l.halfW + 0.6));
        lampPos.push({ x: p.x, z: p.z, ry: Math.atan2(-p.dz, p.dx) + (side > 0 ? Math.PI / 2 : -Math.PI / 2), e: ei });
      }
    });
    const pole = new THREE.CylinderGeometry(0.09, 0.14, 7, 5); pole.translate(0, 3.5, 0);
    const head = new THREE.BoxGeometry(1.6, 0.18, 0.4); head.translate(0.7, 7, 0);
    const glow = new THREE.PlaneGeometry(9, 9); glow.rotateX(-Math.PI / 2); glow.translate(1.5, 0.12, 0);
    this.lamps = new THREE.InstancedMesh(pole, new THREE.MeshLambertMaterial({ color: 0x777b80 }), lampPos.length);
    this.lampHeads = new THREE.InstancedMesh(head, new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), lampPos.length);
    this.lampGlow = new THREE.InstancedMesh(glow, new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,214,140,0.9)', 'rgba(255,180,90,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }), lampPos.length);
    this.lampGlow.renderOrder = 3;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    lampPos.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
      m.compose(new THREE.Vector3(p.x, 0, p.z), q, one);
      this.lamps.setMatrixAt(i, m); this.lampHeads.setMatrixAt(i, m); this.lampGlow.setMatrixAt(i, m);
      this.lampMat.push(m.clone()); this.lampEdge.push(p.e);
    });
    this.group.add(this.lamps, this.lampHeads, this.lampGlow);

    // signal poles + lamps
    const sigPole = new THREE.CylinderGeometry(0.12, 0.12, 5, 5); sigPole.translate(0, 2.5, 0);
    const sigBox = new THREE.BoxGeometry(0.5, 1.5, 0.5); sigBox.translate(0, 5.4, 0);
    const keys: { node: number; link: number; x: number; z: number }[] = [];
    for (const nd of net.nodes) if (sim.signals.has(nd.id)) for (const li of nd.ins) {
      const l = net.links[li];
      const p = net.pose(l, l.len - 4, l.halfW + 0.7);
      keys.push({ node: nd.id, link: li, x: p.x, z: p.z });
    }
    const poles = new THREE.InstancedMesh(sigPole, new THREE.MeshLambertMaterial({ color: 0x333333 }), keys.length);
    const boxes = new THREE.InstancedMesh(sigBox, new THREE.MeshLambertMaterial({ color: 0x1c1c1c }), keys.length);
    const lampG = new THREE.SphereGeometry(0.42, 8, 6); lampG.translate(0, 5.4, 0);
    this.sigLamps = new THREE.InstancedMesh(lampG, new THREE.MeshBasicMaterial({ color: 0xffffff }), keys.length);
    keys.forEach((k, i) => {
      m.makeTranslation(k.x, 0, k.z);
      poles.setMatrixAt(i, m); boxes.setMatrixAt(i, m);
      m.makeTranslation(k.x, 0.2, k.z);
      this.sigLamps.setMatrixAt(i, m);
      this.sigLamps.setColorAt(i, new THREE.Color(0x00ff66));
      this.sigKeys.push({ node: k.node, link: k.link });
    });
    this.group.add(poles, boxes, this.sigLamps);

    // bus shelters
    const shelters: THREE.Matrix4[] = [];
    for (const l of net.links) for (const s of l.busStops) {
      const p = net.pose(l, s, l.halfW + FOOT_W * 0.55);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-p.dz, p.dx));
      shelters.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0.2, p.z), q, one));
    }
    const shelterG = new THREE.BoxGeometry(4, 0.15, 1.6); shelterG.translate(0, 2.6, 0);
    const shelterPost = new THREE.BoxGeometry(0.15, 2.6, 0.15); shelterPost.translate(1.8, 1.3, 0.6);
    const sh = new THREE.InstancedMesh(shelterG, new THREE.MeshLambertMaterial({ color: 0x1f6fb2 }), shelters.length);
    const sp = new THREE.InstancedMesh(shelterPost, new THREE.MeshLambertMaterial({ color: 0x888888 }), shelters.length);
    shelters.forEach((mm, i) => { sh.setMatrixAt(i, mm); sp.setMatrixAt(i, mm); });
    this.group.add(sh, sp);
  }
  private kerbT: Toggle;
  private dirtT!: Toggle;

  /** Re-apply hazard-driven visuals: footpaths, faded markings, dark stretches, zebras. */
  syncHazards() {
    const net = this.net;
    net.edgeLinks.forEach(([fi], ei) => {
      const l = net.links[fi];
      this.footT.set('f' + ei, !l.noFoot);
      this.kerbT.set('f' + ei, !l.noFoot);
      this.dirtT.set('d' + ei, l.noFoot);
      this.markT.set('x' + ei, !l.faded);
    });
    const lv = this.sim.levels.crossings ?? 0;
    const frac = [1, 0.7, 0.35, 0.1][lv];
    this.zebraOrder.forEach((nid, i) => this.zebraT.set('z' + nid, i < Math.round(frac * this.zebraOrder.length)));
    // lamps on dark stretches
    const dark = new Set<number>();
    net.edgeLinks.forEach(([fi], ei) => { if (net.links[fi].dark) dark.add(ei); });
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.lampEdge.forEach((e, i) => {
      const was = this.lastDark.has(e), now = dark.has(e);
      if (was === now) return;
      const mm = now ? zero : this.lampMat[i];
      this.lamps.setMatrixAt(i, mm); this.lampHeads.setMatrixAt(i, mm); this.lampGlow.setMatrixAt(i, mm);
    });
    this.lastDark = dark;
    this.lamps.instanceMatrix.needsUpdate = true; this.lampHeads.instanceMatrix.needsUpdate = true; this.lampGlow.instanceMatrix.needsUpdate = true;
  }

  private ovT = 0;
  private cG = new THREE.Color(0x22c55e); private cY = new THREE.Color(0xfacc15); private cO = new THREE.Color(0xf97316); private cR = new THREE.Color(0xdc2626); private cD = new THREE.Color(0x6b0f0f);
  private tc = new THREE.Color();
  update(dt: number, timeSec: number, camDist = 500) {
    const sim = this.sim;
    // night lamp glow
    const d = sim.dark;
    const g = Math.round(d * 20) / 20;
    if (g !== this.glowOn) {
      this.glowOn = g;
      (this.lampGlow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (d - 0.25) * 0.9);
      this.lampGlow.visible = d > 0.25;
      (this.lampHeads.material as THREE.MeshBasicMaterial).color.setHex(d > 0.3 ? 0xffe2a0 : 0xd8d8d0);
    }
    // signals
    const blink = Math.floor(timeSec * 2) % 2 === 0;
    this.sigKeys.forEach((k, i) => {
      const st = sim.signalState(k.node, k.link);
      const hexv = st === 'g' ? 0x19ff6a : st === 'a' ? 0xffb300 : st === 'r' ? 0xff2a2a : blink ? 0xff9a00 : 0x222222;
      this.sigLamps.setColorAt(i, this.tc.setHex(hexv));
    });
    if (this.sigLamps.instanceColor) this.sigLamps.instanceColor.needsUpdate = true;
    // congestion overlay
    this.overlay.visible = this.overlayOn;
    this.ovT += dt;
    if (!this.overlayOn || this.ovT < 0.4) return;
    this.ovT = 0;
    this.segSum.fill(0); this.segCnt.fill(0);
    let base = 0;
    const baseOf: number[] = [];
    for (const so of this.segOf) { baseOf.push(base); base += so.n; }
    for (const a of sim.agents) {
      if (!a.active || a.state === 1 || a.state === 4 || a.state === 5) continue;
      const so = this.segOf[a.link];
      const k = Math.min(so.n - 1, Math.max(0, Math.floor(a.s / so.seg)));
      const idx = baseOf[a.link] + k;
      this.segSum[idx] += a.v / Math.max(4, Math.min(a.v0, this.net.links[a.link].vmax));
      this.segCnt[idx]++;
    }
    const nightK = this.sim.dark, closeK = camDist < 45 ? 0.35 : camDist < 140 ? 0.62 : 1;
    const col = this.overlay.geometry.attributes.color as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    for (let l = 0; l < this.segOf.length; l++) {
      const so = this.segOf[l];
      for (let k = 0; k < so.n; k++) {
        const idx = baseOf[l] + k;
        const r = this.segCnt[idx] > 0 ? this.segSum[idx] / this.segCnt[idx] : 1;
        this.segV[idx] += (r - this.segV[idx]) * (this.segCnt[idx] > 0 ? 0.25 : 0.06);
      }
    }
    const far = camDist > 450;
    for (let l = 0; l < this.segOf.length; l++) {
      const so = this.segOf[l], b0 = baseOf[l];
      for (let k = 0; k < so.n; k++) {
        const v = this.segV[b0 + k];
        const vs = k > 0 ? (v + this.segV[b0 + k - 1]) / 2 : v;          // blend into neighbours so colours flow
        const ve = k < so.n - 1 ? (v + this.segV[b0 + k + 1]) / 2 : v;
        for (let q = 0; q < 4; q++) {
          const vv = q === 0 || q === 3 ? vs : ve;
          this.ramp(vv, this.tc);
          const alpha = this.alphaRamp(vv, far, nightK) * closeK;
          const o = (so.start + k * 4 + q) * 4;
          arr[o] = this.tc.r; arr[o + 1] = this.tc.g; arr[o + 2] = this.tc.b; arr[o + 3] = alpha;
        }
      }
    }
    for (const j of this.juncOv) {
      const av = j.arms.map(([inL, outL]) => {
        const si = this.segOf[inL];
        return (this.segV[baseOf[inL] + si.n - 1] + this.segV[baseOf[outL]]) / 2;
      });
      const mean = av.reduce((x, y) => x + y, 0) / av.length;
      // one even colour per junction (per-arm gradients show the fan's triangles)
      this.ramp(mean, this.tc);
      const alpha = this.alphaRamp(mean, far, nightK) * closeK;
      for (let q = 0; q < j.n; q++) {
        const o = (j.start + q) * 4;
        arr[o] = this.tc.r; arr[o + 1] = this.tc.g; arr[o + 2] = this.tc.b; arr[o + 3] = alpha;
      }
    }
    col.needsUpdate = true;
  }

  /** Continuous colour ramp: 1 free (green) → 0.55 yellow → 0.35 orange → 0.15 red → 0 dark red. */
  private stops: [number, THREE.Color][] = [[0, new THREE.Color(0x6b0f0f)], [0.15, new THREE.Color(0xdc2626)], [0.35, new THREE.Color(0xf97316)], [0.55, new THREE.Color(0xfacc15)], [0.8, new THREE.Color(0x22c55e)], [1.01, new THREE.Color(0x22c55e)]];
  private ramp(v: number, out: THREE.Color) {
    const st = this.stops;
    let i = 1; while (i < st.length - 1 && v > st[i][0]) i++;
    const [a0, c0] = st[i - 1], [a1, c1] = st[i];
    return out.copy(c0).lerp(c1, Math.min(1, Math.max(0, (v - a0) / (a1 - a0))));
  }
  private alphaRamp(v: number, far: boolean, night: number) {
    const lo = far ? 0.95 : 0.72, hi = (far ? 0.42 : 0.22) * (1 - 0.6 * night);
    const t = Math.min(1, Math.max(0, (v - 0.3) / 0.45));
    return lo + (hi - lo) * t;
  }

  /** Average congestion near a point (0 = gridlock … 1 = free) for UI. */
  linkRatio(l: Link) {
    const so = this.segOf[l.id];
    let base = 0;
    for (let i = 0; i < l.id; i++) base += this.segOf[i].n;
    let s = 0;
    for (let k = 0; k < so.n; k++) s += this.segV[base + k];
    return s / so.n;
  }
}
