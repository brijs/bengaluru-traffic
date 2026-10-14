import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, T, VT, type Agent, type Sim } from '../sim/sim';
import { emojiTex, glowTex } from './textures';

function paint(g0: THREE.BufferGeometry, c: number[]): THREE.BufferGeometry {
  const g = g0.index ? g0.toNonIndexed() : g0;
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
function box(w: number, h: number, d: number, x: number, y: number, z: number, c: number[]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return paint(g, c);
}
/** Rounded box — reads as a moulded body panel instead of a block. */
function rbox(w: number, h: number, d: number, x: number, y: number, z: number, c: number[], r = 0.25, seg = 1): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.2, h / 2.2, d / 2.2)); g.translate(x, y, z); return paint(g, c);
}
function cyl(r: number, len: number, x: number, y: number, z: number, c: number[], axis: 'x' | 'z' = 'z', seg = 12, r2 = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r2, len, seg);
  if (axis === 'z') g.rotateX(Math.PI / 2); else g.rotateZ(Math.PI / 2);
  g.translate(x, y, z); return paint(g, c);
}
/** Side-profile extrusion (x = length, y = up) centred across the width. */
function profile(pts: [number, number][], width: number, c: number[], bevel = 0.06): THREE.BufferGeometry {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 2 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  return paint(g, c);
}
const W = [1, 1, 1], K = [0.07, 0.07, 0.08], GL = [0.16, 0.22, 0.3], DK = [0.14, 0.15, 0.17], CH = [0.75, 0.76, 0.78];
const HL = [1, 0.97, 0.82], TL = [0.85, 0.08, 0.06], AMB = [1, 0.6, 0.05];
/** Tyre + hub cap, oriented across the vehicle. */
const wheel = (x: number, z: number, r: number, wd: number) => [cyl(r, wd, x, r, z, K, 'z', 9), cyl(r * 0.55, wd * 1.04, x, r, z, CH, 'z', 6)];
const wheels = (xs: number[], zs: number[], r: number, wd = 0.3) => xs.flatMap((x) => zs.flatMap((z) => wheel(x, z, r, wd)));
const lights = (front: number, rear: number, y: number, zs: number, size = 0.18) => [
  box(0.06, size, size * 2, front, y, zs, HL), box(0.06, size, size * 2, front, y, -zs, HL),
  box(0.06, size, size * 1.6, rear, y, zs, TL), box(0.06, size, size * 1.6, rear, y, -zs, TL),
];

function geoFor(type: VT): THREE.BufferGeometry {
  switch (type) {
    case VT.BIKE: return mergeGeometries([
      ...wheel(-0.68, 0, 0.31, 0.12), ...wheel(0.7, 0, 0.31, 0.12),
      rbox(1.05, 0.32, 0.28, 0.02, 0.62, 0, W, 0.12),                 // body / fuel tank
      rbox(0.62, 0.12, 0.3, -0.3, 0.84, 0, DK, 0.05),                 // seat
      box(0.08, 0.5, 0.08, 0.62, 0.72, 0, CH),                        // fork
      box(0.06, 0.06, 0.62, 0.55, 1.0, 0, DK),                        // handlebar
      box(0.06, 0.12, 0.16, 0.74, 0.86, 0, HL), box(0.05, 0.08, 0.14, -0.86, 0.72, 0, TL),
      cyl(0.06, 0.6, -0.45, 0.42, 0.17, CH, 'x', 6),                  // exhaust
    ]);
    case VT.AUTO: return mergeGeometries([
      profile([[-1.35, 0.3], [-1.35, 1.05], [0.9, 1.05], [1.25, 0.85], [1.38, 0.45], [1.3, 0.3]], 1.3, [0.12, 0.5, 0.22], 0.08), // green body
      cyl(0.72, 2.05, -0.2, 1.08, 0, [0.98, 0.8, 0.08], 'x', 10),     // yellow canopy (half hidden in body)
      box(0.06, 0.55, 1.05, 1.07, 1.35, 0, GL),                        // windscreen
      box(2.0, 0.04, 1.32, -0.2, 1.08, 0, DK),                          // canopy seam
      ...wheel(1.05, 0, 0.27, 0.18), ...wheel(-0.9, -0.55, 0.27, 0.18), ...wheel(-0.9, 0.55, 0.27, 0.18),
      box(0.06, 0.16, 0.28, 1.4, 0.65, 0, HL), box(0.05, 0.1, 0.2, -1.38, 0.55, 0.5, TL), box(0.05, 0.1, 0.2, -1.38, 0.55, -0.5, TL),
    ]);
    case VT.CAR: return mergeGeometries([
      profile([[-2.12, 0.28], [-2.16, 0.72], [-1.95, 0.9], [-1.25, 0.95], [-0.72, 1.45], [0.48, 1.48], [1.1, 0.98], [1.95, 0.86], [2.15, 0.6], [2.1, 0.28]], 1.76, W),
      profile([[-1.22, 0.96], [-0.71, 1.43], [0.47, 1.45], [1.08, 0.99]], 1.8, GL, 0.02),   // glasshouse
      box(4.0, 0.08, 1.8, 0, 0.3, 0, DK),                                                     // skirts / bumpers line
      ...lights(2.13, -2.15, 0.72, 0.62),
      ...wheels([-1.35, 1.32], [-0.82, 0.82], 0.33, 0.24),
    ]);
    case VT.BUS: return mergeGeometries([
      rbox(10.8, 2.6, 2.45, 0, 1.75, 0, W, 0.3),
      rbox(10.3, 0.95, 2.5, 0, 2.3, 0, [0.1, 0.12, 0.16], 0.12),         // window band
      box(0.08, 1.5, 2.1, 5.41, 2.1, 0, GL),                                // windscreen
      rbox(10.82, 0.35, 2.47, 0, 0.95, 0, [0.95, 0.95, 0.95], 0.1),       // white skirt stripe
      box(1.0, 1.9, 0.06, 3.4, 1.55, 1.24, [0.12, 0.14, 0.18]), box(1.0, 1.9, 0.06, -1.2, 1.55, 1.24, [0.12, 0.14, 0.18]), // doors (kerb side)
      box(2.0, 0.35, 0.06, 4.0, 3.15, 0, AMB),                              // destination board
      ...lights(5.42, -5.42, 0.9, 0.95, 0.22),
      ...wheels([-3.4, 3.6], [-1.1, 1.1], 0.5, 0.32),
    ]);
    case VT.TRUCK: return mergeGeometries([
      rbox(2.1, 2.25, 2.35, 3.15, 1.65, 0, W, 0.25),                       // cab (instance-coloured)
      box(0.06, 0.95, 2.0, 4.21, 2.15, 0, GL),
      box(0.3, 0.3, 2.3, 4.25, 0.75, 0, CH),                                 // bumper
      rbox(6.0, 2.2, 2.45, -1.1, 1.85, 0, [0.6, 0.44, 0.27], 0.12),       // wooden body
      cyl(1.22, 6.0, -1.1, 2.65, 0, [0.2, 0.38, 0.62], 'x', 14),           // blue tarpaulin hump
      box(6.1, 0.3, 2.5, -1.1, 0.72, 0, [0.95, 0.82, 0.18]),               // painted chassis band
      ...lights(4.23, -4.12, 0.9, 0.9, 0.2),
      ...wheels([-3.0, -1.8, 3.1], [-1.1, 1.1], 0.5, 0.32),
    ]);
    case VT.TANKER: return mergeGeometries([
      rbox(2.0, 2.1, 2.25, 2.7, 1.55, 0, [0.95, 0.95, 0.95], 0.25),
      box(0.06, 0.8, 1.9, 3.71, 2.0, 0, GL),
      cyl(1.05, 4.6, -0.9, 1.78, 0, W, 'x', 10),
      paint(new THREE.SphereGeometry(1.05, 10, 6).scale(0.35, 1, 1).translate(-3.2, 1.78, 0), W),
      paint(new THREE.SphereGeometry(1.05, 10, 6).scale(0.35, 1, 1).translate(1.4, 1.78, 0), W),
      box(5.2, 0.3, 1.8, -0.9, 0.7, 0, DK), cyl(0.25, 0.3, -0.9, 2.9, 0, CH, 'z', 10),
      ...lights(3.73, -3.55, 0.9, 0.85, 0.18),
      ...wheels([-2.6, -1.4, 2.6], [-1.05, 1.05], 0.48, 0.3),
    ]);
    case VT.TRACTOR: return mergeGeometries([
      rbox(1.9, 0.95, 1.0, 1.55, 1.15, 0, W, 0.2),                          // red bonnet
      box(0.7, 1.0, 1.1, 0.55, 1.55, 0, [0.2, 0.2, 0.2]), cyl(0.08, 0.9, 2.1, 1.9, 0.3, DK, 'x', 6).rotateZ(0),
      cyl(0.78, 0.38, 0.45, 0.78, -0.78, K, 'z', 10), cyl(0.78, 0.38, 0.45, 0.78, 0.78, K, 'z', 10),
      cyl(0.42, 0.26, 2.3, 0.42, -0.55, K), cyl(0.42, 0.26, 2.3, 0.42, 0.55, K),
      rbox(2.6, 0.9, 2.0, -1.45, 1.0, 0, [0.6, 0.48, 0.32], 0.08),
      ...wheels([-1.45], [-1.05, 1.05], 0.4, 0.22),
    ]);
    case VT.AMBULANCE: return mergeGeometries([
      rbox(5.3, 2.25, 2.05, 0, 1.4, 0, W, 0.28),
      box(5.34, 0.38, 2.09, 0, 1.45, 0, [0.85, 0.1, 0.1]),
      box(0.06, 0.8, 1.8, 2.66, 1.85, 0, GL),
      box(0.8, 0.8, 2.1, -0.6, 1.5, 0, [0.85, 0.1, 0.1]), box(0.25, 0.8, 2.11, -0.6, 1.5, 0, W), // red cross band
      ...lights(2.66, -2.66, 0.8, 0.8, 0.2),
      ...wheels([-1.8, 1.8], [-0.95, 0.95], 0.4, 0.26),
    ]);
    case VT.PLAYER: {
      const RED = [0.92, 0.08, 0.08], BLK = [0.05, 0.05, 0.06];
      return mergeGeometries([
        // tall-boy hatch: short bonnet, near-vertical tailgate
        profile([[-1.82, 0.28], [-1.85, 0.95], [-1.78, 1.12], [1.05, 1.12], [1.7, 0.86], [1.86, 0.58], [1.82, 0.28]], 1.64, RED),
        profile([[-1.78, 1.1], [-1.72, 1.66], [0.55, 1.68], [1.05, 1.12]], 1.6, GL, 0.03),        // big glasshouse
        rbox(2.42, 0.1, 1.62, -0.6, 1.72, 0, BLK, 0.05),                                           // black roof
        ...[-0.81, 0.81].flatMap((z) => [box(0.12, 0.56, 0.06, 0.6, 1.4, z, BLK), box(0.1, 0.56, 0.06, -0.55, 1.4, z, BLK), box(0.1, 0.56, 0.06, -1.7, 1.4, z, BLK)]), // black pillars
        box(0.05, 0.12, 1.2, -1.86, 0.62, 0, [0.85, 0.85, 0.85]),                                   // rear bumper strip
        box(0.04, 0.16, 0.44, -1.87, 0.82, 0, [0.95, 0.85, 0.2]),                                   // number plate
        box(3.4, 0.09, 1.68, 0, 0.3, 0, DK),
        box(0.06, 0.12, 0.25, 1.86, 0.78, 0.0, [0.15, 0.15, 0.15]),                                // grille
        ...lights(1.84, -1.86, 0.88, 0.6, 0.17),
        ...wheels([-1.18, 1.18], [-0.76, 0.76], 0.31, 0.22),
      ]);
    }
  }
}

const CAP = [2100, 650, 1650, 380, 380, 320, 130, 30, 2];
const CAR_COLS = [0xffffff, 0xf2f2f2, 0xc0c4c8, 0x9aa0a6, 0x2b2d31, 0xb71c1c, 0x1e4fa3, 0x8d6e63, 0xe0e0e0, 0x455a64, 0xd4af37];
const BIKE_COLS = [0x1f1f1f, 0xb71c1c, 0x1565c0, 0x9e9e9e, 0xf5f5f5, 0x2e7d32, 0xff6f00, 0x6a1b9a];
const BUS_COLS = [0xc62828, 0xc62828, 0x2e6fb7, 0x2e7d32];
const TRUCK_COLS = [0xff8f00, 0xfdd835, 0x1e88e5, 0x43a047, 0xe53935, 0x8e24aa];
const TANK_COLS = [0x1e88e5, 0xffffff, 0x42a5f5];
const SHIRTS = [0xffffff, 0x1e88e5, 0xe53935, 0x43a047, 0xfdd835, 0x8e24aa, 0xff7043, 0x00897b, 0x5d4037, 0xf06292];

export class Vehicles {
  group = new THREE.Group();
  meshes: THREE.InstancedMesh[] = [];
  ids: Int32Array[] = [];
  private torso: THREE.InstancedMesh; private head: THREE.InstancedMesh; private helmet: THREE.InstancedMesh;
  private rods: THREE.InstancedMesh; private siren: THREE.InstancedMesh;
  private headGlow: THREE.InstancedMesh; private tailGlow: THREE.InstancedMesh; private blob: THREE.InstancedMesh;
  pedBody: THREE.InstancedMesh; pedHead: THREE.InstancedMesh; cows: THREE.InstancedMesh;
  pedIds = new Int32Array(400); cowIds = new Int32Array(200); riderSlot: number[] = [];
  private icons: THREE.Sprite[] = [];
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v = new THREE.Vector3(); private sc = new THREE.Vector3(); private c = new THREE.Color();
  highlight = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 32), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, depthWrite: false }));
  followId = -1; hideId = -1;
  /** Show on map switches (your own car always stays visible). */
  show = { vehicles: true, people: true, bubbles: true };

  constructor(private sim: Sim) {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (let t = 0; t <= VT.PLAYER; t++) {
      const im = new THREE.InstancedMesh(geoFor(t), mat, CAP[t]);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, new THREE.Color(1, 1, 1));
      im.frustumCulled = false;
      this.meshes.push(im); this.ids.push(new Int32Array(CAP[t]));
      this.group.add(im);
    }
    const mk = (g: THREE.BufferGeometry, n: number, m: THREE.Material) => {
      const im = new THREE.InstancedMesh(g, m, n);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
      this.group.add(im);
      return im;
    };
    const lam = new THREE.MeshLambertMaterial();
    const tg0 = new THREE.CapsuleGeometry(0.21, 0.42, 4, 8); tg0.rotateZ(0.25); tg0.translate(-0.12, 1.2, 0);
    const arm = new THREE.CapsuleGeometry(0.07, 0.42, 2, 6); arm.rotateZ(1.2);
    const tg = mergeGeometries([tg0, arm.clone().translate(0.22, 1.25, 0.22), arm.clone().translate(0.22, 1.25, -0.22)].map((g) => { g.deleteAttribute('uv'); return g; }));
    this.torso = mk(tg, CAP[0] + 40, lam);
    const hg = new THREE.SphereGeometry(0.2, 8, 6); hg.translate(-0.1, 1.68, 0);
    this.head = mk(hg, CAP[0] + 40, new THREE.MeshLambertMaterial({ color: 0x8d5524 }));
    const hm = new THREE.SphereGeometry(0.27, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62); hm.translate(-0.1, 1.68, 0);
    this.helmet = mk(hm, CAP[0] + 40, lam);
    const rg = new THREE.BoxGeometry(3.6, 0.12, 0.12); rg.translate(-5.6, 2.9, 0.3);
    const rg2 = rg.clone(); rg2.translate(0, 0.1, -0.6);
    this.rods = mk(mergeGeometries([rg, rg2]), 120, new THREE.MeshLambertMaterial({ color: 0xff5722 }));
    const sg = new THREE.BoxGeometry(0.5, 0.25, 1.4); sg.translate(1.4, 2.55, 0);
    this.siren = mk(sg, CAP[7], new THREE.MeshBasicMaterial());
    const hgG = new THREE.PlaneGeometry(9, 4.5); hgG.rotateX(-Math.PI / 2); hgG.translate(6.5, 0.15, 0);
    this.headGlow = mk(hgG, 3800, new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,245,210,0.85)', 'rgba(255,230,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const tgG = new THREE.PlaneGeometry(2, 2.2); tgG.rotateX(-Math.PI / 2); tgG.translate(-1.2, 0.16, 0);
    this.tailGlow = mk(tgG, 3800, new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,40,30,0.9)', 'rgba(255,0,0,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.headGlow.renderOrder = 4; this.tailGlow.renderOrder = 4;
    const bg = new THREE.PlaneGeometry(1, 1); bg.rotateX(-Math.PI / 2); bg.translate(0, 0.13, 0);
    this.blob = mk(bg, 3900, new THREE.MeshBasicMaterial({ map: glowTex('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
    this.blob.renderOrder = 3;
    // pedestrians & cows
    const pb = new THREE.CylinderGeometry(0.22, 0.3, 1.25, 6); pb.translate(0, 0.72, 0);
    this.pedBody = mk(pb, 400, lam);
    const ph = new THREE.SphereGeometry(0.2, 7, 5); ph.translate(0, 1.55, 0);
    this.pedHead = mk(ph, 400, new THREE.MeshLambertMaterial({ color: 0x6d4c33 }));
    const cowG = mergeGeometries([
      box(2.1, 0.95, 0.85, 0, 1.15, 0, W), box(0.75, 0.55, 0.5, 1.3, 1.45, 0, W),
      box(0.15, 0.3, 0.12, 1.45, 1.85, 0.2, [0.85, 0.8, 0.7]), box(0.15, 0.3, 0.12, 1.45, 1.85, -0.2, [0.85, 0.8, 0.7]),
      ...[-0.75, 0.75].flatMap((x) => [-0.28, 0.28].map((z) => box(0.18, 0.75, 0.18, x, 0.38, z, [0.8, 0.8, 0.8]))),
      box(0.1, 0.7, 0.1, -1.1, 1.0, 0, [0.6, 0.6, 0.6]),
    ]);
    this.cows = mk(cowG, 200, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.highlight.geometry.rotateX(-Math.PI / 2);
    this.highlight.visible = false;
    this.group.add(this.highlight);
    for (let i = 0; i < 36; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('📱'), depthTest: false, sizeAttenuation: false, transparent: true }));
      sp.scale.set(0.034, 0.034, 1); sp.visible = false; sp.renderOrder = 10;
      this.icons.push(sp); this.group.add(sp);
    }
  }

  private colorOf(a: Agent): number {
    const h = a.color;
    switch (a.type) {
      case VT.BIKE: return BIKE_COLS[h % BIKE_COLS.length];
      case VT.AUTO: return 0xffffff;
      case VT.CAR: return CAR_COLS[h % CAR_COLS.length];
      case VT.BUS: return BUS_COLS[h % BUS_COLS.length];
      case VT.TRUCK: return TRUCK_COLS[h % TRUCK_COLS.length];
      case VT.TANKER: return TANK_COLS[h % TANK_COLS.length];
      case VT.TRACTOR: return 0xd32f2f;
      default: return 0xffffff;
    }
  }

  private iconT = 0;
  update(dt: number, time: number, camera: THREE.Camera, focus: THREE.Vector3, camDist: number) {
    const sv = this.show.vehicles;
    this.meshes.forEach((m, t) => (m.visible = sv || t === VT.PLAYER));
    for (const m of [this.torso, this.head, this.helmet, this.rods, this.siren, this.headGlow, this.tailGlow, this.blob]) m.visible = sv;
    for (const m of [this.pedBody, this.pedHead, this.cows]) m.visible = this.show.people;
    const sim = this.sim;
    const counts = new Array(9).fill(0);
    let nb = 0, nRod = 0, nGlow = 0, nSir = 0, nBlob = 0;
    const dark = sim.dark;
    const lights = dark > 0.2;
    const up = new THREE.Vector3(0, 1, 0);
    const m = this.m, q = this.q, v = this.v, sc = this.sc;
    const placeRider = (x: number, y: number, z: number, yaw: number, roll: number, s: number, shirt: number, helmet: boolean, helmetCol: number) => {
      if (nb >= CAP[0] + 40) return;
      this.e.set(roll, yaw, 0, 'YXZ'); q.setFromEuler(this.e);
      m.compose(v.set(x, y, z), q, sc.set(s, s, s));
      this.torso.setMatrixAt(nb, m); this.head.setMatrixAt(nb, m);
      this.torso.setColorAt(nb, this.c.setHex(shirt));
      if (helmet) { this.helmet.setMatrixAt(nb, m); this.helmet.setColorAt(nb, this.c.setHex(helmetCol)); }
      else { m.makeScale(0, 0, 0); this.helmet.setMatrixAt(nb, m); }
      nb++;
    };
    for (const a of sim.agents) {
      if (!a.active || a.id === this.hideId) continue;
      const t = a.type, i = counts[t];
      if (i >= CAP[t]) continue;
      counts[t]++;
      this.ids[t][i] = a.id;
      let yaw = Math.atan2(-a.hz, a.hx);
      let roll = 0, pitch = 0, y = 0;
      if (a.state === S.CRASHED) { yaw += ((a.id % 7) - 3) * 0.18; roll = t === VT.BIKE ? 1.35 : 0.05; }
      if (a.state === S.FOOTPATH) y = 0.18;
      if (t === VT.BIKE && a.latT < 1) roll = (a.latTo - a.latFrom) > 0 ? -0.25 : 0.25;
      if (a.traits & T.WEAVE && t === VT.BIKE && a.state === S.DRIVE) roll += Math.sin(time * 3 + a.id) * 0.06;
      const s = a.age < 0.5 ? 0.3 + 1.4 * a.age : 1;
      this.e.set(roll, yaw, pitch, 'YXZ'); q.setFromEuler(this.e);
      m.compose(v.set(a.x, y, a.z), q, sc.set(s, s, s));
      const im = this.meshes[t];
      im.setMatrixAt(i, m);
      if (nBlob < 3900) {
        m.compose(v.set(a.x, y, a.z), q.setFromAxisAngle(up, yaw), sc.set(a.len * 1.25 * s, 1, a.wid * 1.7 * s));
        this.blob.setMatrixAt(nBlob++, m);
        this.e.set(roll, yaw, pitch, 'YXZ'); q.setFromEuler(this.e);
        m.compose(v.set(a.x, y, a.z), q, sc.set(s, s, s));
      }
      im.setColorAt(i, this.c.setHex(this.colorOf(a)));
      if (t === VT.BIKE) {
        placeRider(a.x, y, a.z, yaw, roll, s, SHIRTS[(a.color >> 3) % SHIRTS.length], !(a.traits & T.NOHELMET), [0xffffff, 0x111111, 0xd32f2f, 0x1565c0, 0xfdd835][(a.color >> 5) % 5]);
      }
      if (t === VT.TRUCK && (a.traits & T.CARGO) && nRod < 120) { this.rods.setMatrixAt(nRod++, m); }
      if (t === VT.AMBULANCE && nSir < CAP[7]) {
        this.siren.setMatrixAt(nSir, m);
        this.siren.setColorAt(nSir, this.c.setHex(Math.floor(time * 6 + a.id) % 2 ? 0xff1a1a : 0x2962ff));
        nSir++;
      }
      if (lights && a.state !== S.CRASHED && a.state !== S.BROKEN && nGlow < 3800) {
        const nol = (a.traits & T.NOLIGHT) !== 0;
        const glare = (a.traits & T.GLARE) !== 0;
        const k = nol ? 0 : (glare ? 1.9 : t === VT.BIKE ? 0.6 : 1) * s;
        m.compose(v.set(a.x, 0, a.z), q.setFromAxisAngle(up, yaw), sc.set(k * (t === VT.BUS || t === VT.TRUCK ? 1.2 : 1), 1, k * (glare ? 1.5 : 1)));
        this.headGlow.setMatrixAt(nGlow, m);
        const kt = nol || t === VT.TRACTOR ? 0 : a.v < 1 ? 1.4 : 0.8;
        m.compose(v.set(a.x - a.hx * (a.len / 2 - 1.2), 0, a.z - a.hz * (a.len / 2 - 1.2)), q, sc.set(kt, 1, kt));
        this.tailGlow.setMatrixAt(nGlow, m);
        nGlow++;
      }
    }
    // wrong-way riders as extra bikes
    this.riderSlot.length = 0;
    for (const r of sim.riders) {
      const i = counts[VT.BIKE];
      if (i >= CAP[0]) break;
      counts[VT.BIKE]++;
      this.ids[0][i] = -100000 - r.id;
      const yaw = Math.atan2(-r.hz, r.hx);
      this.e.set(0, yaw, 0, 'YXZ'); q.setFromEuler(this.e);
      m.compose(v.set(r.x, 0, r.z), q, sc.set(1, 1, 1));
      this.meshes[0].setMatrixAt(i, m);
      this.meshes[0].setColorAt(i, this.c.setHex(0xd50000));
      placeRider(r.x, 0, r.z, yaw, 0, 1, 0xff1744, false, 0);
      this.riderSlot.push(r.id);
    }
    for (let t = 0; t < 9; t++) {
      const im = this.meshes[t];
      im.count = counts[t];
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    this.torso.count = nb; this.head.count = nb; this.helmet.count = nb;
    for (const x of [this.torso, this.head, this.helmet]) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; }
    this.rods.count = nRod; this.rods.instanceMatrix.needsUpdate = true;
    this.blob.count = nBlob; this.blob.instanceMatrix.needsUpdate = true;
    this.siren.count = nSir; this.siren.instanceMatrix.needsUpdate = true; if (this.siren.instanceColor) this.siren.instanceColor.needsUpdate = true;
    this.headGlow.count = lights ? nGlow : 0; this.tailGlow.count = lights ? nGlow : 0;
    (this.headGlow.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (dark - 0.2) * 1.6);
    (this.tailGlow.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (dark - 0.2) * 1.6);
    this.headGlow.instanceMatrix.needsUpdate = true; this.tailGlow.instanceMatrix.needsUpdate = true;

    // pedestrians and crossing cows
    let np = 0, nc = 0;
    for (const p of sim.peds) {
      if (p.kind === 3) {
        if (nc >= 200) continue;
        const yaw = Math.atan2(-p.hz, p.hx);
        m.compose(v.set(p.x, 0, p.z), q.setFromAxisAngle(up, yaw), sc.set(1, 1, 1));
        this.cows.setMatrixAt(nc, m); this.cows.setColorAt(nc, this.c.setHex(p.color % 3 ? 0xf2efe8 : 0xb9a48a));
        this.cowIds[nc] = -p.id; nc++;
        continue;
      }
      if (np >= 400) continue;
      const yaw = Math.atan2(-p.hz, p.hx);
      const bob = p.down ? 0 : Math.abs(Math.sin(time * 9 + p.id)) * 0.08;
      if (p.down) { this.e.set(Math.PI / 2, yaw, 0, 'YXZ'); q.setFromEuler(this.e); m.compose(v.set(p.x, 0.25, p.z), q, sc.set(1, 1, 1)); }
      else m.compose(v.set(p.x, bob, p.z), q.setFromAxisAngle(up, yaw), sc.set(1, 1, 1));
      this.pedBody.setMatrixAt(np, m); this.pedHead.setMatrixAt(np, m);
      this.pedBody.setColorAt(np, this.c.setHex(SHIRTS[p.color % SHIRTS.length]));
      this.pedIds[np] = p.id; np++;
    }
    // resting cows from hazards
    for (const h of sim.haz.list) {
      if (h.kind !== 'cow') continue;
      const l = sim.net.links[h.link];
      for (let k = 0; k < h.count && nc < 200; k++) {
        const p = sim.net.pose(l, h.s + (k - (h.count - 1) / 2) * 2.4, sim.net.laneLat(l, Math.max(0, h.lane)) + (k % 2 ? 0.7 : -0.5));
        const yaw = Math.atan2(-p.dz, p.dx) + (k * 1.7 + h.id) % 3;
        const lying = (h.id + k) % 2 === 0;
        m.compose(v.set(p.x, lying ? -0.45 : 0, p.z), q.setFromAxisAngle(up, yaw + Math.sin(time * 0.5 + k) * 0.05), sc.set(1, lying ? 0.75 : 1, 1));
        this.cows.setMatrixAt(nc, m); this.cows.setColorAt(nc, this.c.setHex((h.id + k) % 3 ? 0xf2efe8 : 0xb9a48a));
        this.cowIds[nc] = 1000000 + h.id; nc++;
      }
    }
    this.pedBody.count = np; this.pedHead.count = np; this.cows.count = nc;
    for (const x of [this.pedBody, this.pedHead, this.cows]) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; }

    // follow highlight
    const fa = this.followId >= 0 ? sim.agents[this.followId] : null;
    if (fa && fa.active && this.hideId < 0) {
      this.highlight.visible = true;
      this.highlight.position.set(fa.x, 0.25, fa.z);
      const k = 1 + Math.sin(time * 5) * 0.08;
      this.highlight.scale.set(k * (fa.len / 4), 1, k * (fa.len / 4));
    } else this.highlight.visible = false;

    this.iconT -= dt;
    if (this.iconT <= 0) { this.iconT = 0.25; this.assignIcons(focus, camDist); }
    for (const sp of this.icons) {
      if (!sp.visible) continue;
      const id = sp.userData.id as number;
      if (id >= 0) { const a = sim.agents[id]; if (!a.active) { sp.visible = false; continue; } sp.position.set(a.x, (a.type === VT.BUS || a.type === VT.TRUCK ? 5 : 3.6) + Math.sin(time * 4 + id) * 0.15, a.z); }
      else { const r = sim.riders.find((x) => x.id === -100000 - id); if (!r) { sp.visible = false; continue; } sp.position.set(r.x, 3.6 + Math.sin(time * 6) * 0.2, r.z); }
    }
  }

  private assignIcons(focus: THREE.Vector3, camDist: number) {
    const sim = this.sim;
    for (const sp of this.icons) sp.visible = false;
    if (!this.show.bubbles) return;
    const show = camDist < 420;
    const cands: { a: Agent; d: number; e: string }[] = [];
    const R = Math.max(60, camDist * 0.55);
    for (const a of sim.agents) {
      if (!a.active) continue;
      let e = '';
      if (a.type === VT.AMBULANCE) e = '🚑';
      else if (!show) continue;
      else if (a.state === S.CRASHED) e = '💥';
      else if (a.state === S.BROKEN) e = '🛠️';
      else if (a.state === S.DWELL) e = '🛑';
      else if (a.state === S.FOOTPATH) e = '🛵';
      else if (a.fixed) e = '😇';
      else if (a.jump && a.state === S.JUNCTION) e = '🚨';
      else if (a.traits & T.PHONE) e = '📱';
      else if (a.traits & T.DRUNK) e = '🍺';
      else if (a.traits & T.SPEEDER && a.v > 13) e = '🏎️';
      else if (a.traits & T.WEAVE && a.latT < 1) e = '🔀';
      else if (a.traits & T.NOLIGHT && sim.dark > 0.5) e = '🌑';
      if (!e) continue;
      const d = Math.hypot(a.x - focus.x, a.z - focus.z);
      if (d > R && a.type !== VT.AMBULANCE) continue;
      cands.push({ a, d: a.type === VT.AMBULANCE ? -1 : d, e });
    }
    if (show) for (const r of sim.riders) {
      const d = Math.hypot(r.x - focus.x, r.z - focus.z);
      if (d < R) cands.push({ a: { id: -100000 - r.id } as any, d: d * 0.5, e: '⛔' });
    }
    cands.sort((x, y) => x.d - y.d);
    for (let i = 0; i < Math.min(this.icons.length, cands.length); i++) {
      const sp = this.icons[i], c = cands[i];
      (sp.material as THREE.SpriteMaterial).map = emojiTex(c.e);
      sp.userData.id = c.a.id;
      sp.visible = true;
    }
  }

  /** Raycast pick → {kind, id} */
  pick(ray: THREE.Raycaster): { kind: 'agent' | 'rider' | 'ped' | 'cow'; id: number; dist: number } | null {
    let best: { kind: 'agent' | 'rider' | 'ped' | 'cow'; id: number; dist: number } | null = null;
    for (const m of [...this.meshes, this.pedBody, this.cows]) m.computeBoundingSphere();
    for (let t = 0; t < this.meshes.length; t++) {
      if (!this.meshes[t].visible) continue;
      const hits = ray.intersectObject(this.meshes[t], false);
      if (hits.length && hits[0].instanceId !== undefined) {
        const id = this.ids[t][hits[0].instanceId];
        const h = { kind: id <= -100000 ? 'rider' as const : 'agent' as const, id: id <= -100000 ? -100000 - id : id, dist: hits[0].distance };
        if (!best || h.dist < best.dist) best = h;
      }
    }
    for (const [mesh, ids, kind] of [[this.pedBody, this.pedIds, 'ped'], [this.cows, this.cowIds, 'cow']] as const) {
      if (!mesh.visible) continue;
      const hits = ray.intersectObject(mesh, false);
      if (hits.length && hits[0].instanceId !== undefined && (!best || hits[0].distance < best.dist)) best = { kind, id: ids[hits[0].instanceId], dist: hits[0].distance };
    }
    return best;
  }
}
