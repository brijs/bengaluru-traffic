import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { WORLD } from '../data/city';
import type { Agent } from '../sim/sim';

export type CamMode = 'top' | 'tilt' | 'follow' | 'street' | 'cockpit';

export class CameraRig {
  controls: MapControls;
  mode: CamMode = 'tilt';
  private fly: { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3 } | null = null;
  follow: Agent | null = null;
  followDist = 22;
  private camPos = new THREE.Vector3(); private look = new THREE.Vector3();
  onModeChange?: (m: CamMode) => void;
  private rot: { t: number; dur: number; from: number; to: number } | null = null;

  /** Camera azimuth around the target: 0 = looking north (north up). */
  azimuth() { const c = this.camera.position, t = this.controls.target; return Math.atan2(c.x - t.x, c.z - t.z); }
  rotateBy(delta: number) {
    if (this.isChase()) return;
    const a = this.rot ? this.rot.to : this.azimuth();
    this.rot = { t: 0, dur: 0.55, from: this.azimuth(), to: a + delta };
  }
  northUp() {
    if (this.isChase()) return;
    const a = this.azimuth();
    let d = -a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.rot = { t: 0, dur: 0.7, from: a, to: a + d };
  }

  constructor(public camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.controls = new MapControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 2200;
    this.controls.zoomSpeed = 1.2;
    this.controls.target.set(60, 0, 40);
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.setMode('tilt', true);
    dom.addEventListener('wheel', (e) => {
      if (this.isChase()) {
        this.followDist = THREE.MathUtils.clamp(this.followDist * (e.deltaY > 0 ? 1.1 : 0.9), 6, 160);
        e.preventDefault();
      }
    }, { passive: false });
  }

  isChase() { return this.mode === 'follow' || this.mode === 'street' || this.mode === 'cockpit'; }
  get distance() { return this.camera.position.distanceTo(this.controls.target); }
  get target() { return this.controls.target; }

  setMode(m: CamMode, silent = false) {
    this.mode = m;
    const c = this.controls;
    c.enabled = m === 'top' || m === 'tilt';
    if (m === 'top') { c.minPolarAngle = 0; c.maxPolarAngle = 0.12; c.enableRotate = true; }
    else if (m === 'tilt') { c.minPolarAngle = 0.15; c.maxPolarAngle = 1.32; c.enableRotate = true; }
    if (m === 'top') {
      const d = Math.max(200, this.distance);
      this.flyTo(this.controls.target.clone(), d, 0.02, 0.8);
    } else if (m === 'tilt' && !silent) {
      const d = Math.min(Math.max(120, this.distance), 900);
      this.flyTo(this.controls.target.clone(), d, 0.85, 0.8);
    }
    if (m === 'street') this.followDist = 9;
    if (m !== 'cockpit' && this.camera.near !== 2) { this.camera.near = 2; this.camera.far = 9000; this.camera.updateProjectionMatrix(); }
    if (m === 'follow') this.followDist = 24;
    if (!silent) this.onModeChange?.(m);
  }

  /** Fly to look at target from distance `dist` with polar tilt `polar` (0 = straight down). */
  flyTo(target: THREE.Vector3, dist: number, polar = 0.85, dur = 1.3, azimuth?: number) {
    const c = this.controls;
    const az = azimuth ?? Math.atan2(this.camera.position.x - c.target.x, this.camera.position.z - c.target.z);
    const p1 = new THREE.Vector3(
      target.x + Math.sin(az) * Math.sin(polar) * dist,
      target.y + Math.cos(polar) * dist,
      target.z + Math.cos(az) * Math.sin(polar) * dist,
    );
    this.fly = { t: 0, dur, p0: this.camera.position.clone(), p1, t0: c.target.clone(), t1: target.clone() };
  }

  followAgent(a: Agent | null, mode: CamMode = 'follow') {
    this.follow = a;
    if (a) this.setMode(mode);
  }

  update(dt: number) {
    const c = this.controls;
    if (this.fly) {
      const f = this.fly;
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // arc up a little while flying
      const lift = Math.sin(k * Math.PI) * Math.min(300, f.p0.distanceTo(f.p1) * 0.25);
      this.camera.position.lerpVectors(f.p0, f.p1, e).y += lift;
      c.target.lerpVectors(f.t0, f.t1, e);
      this.camera.lookAt(c.target);
      if (k >= 1) this.fly = null;
      if (this.mode === 'top' || this.mode === 'tilt') return;
    }
    if (this.rot && !this.fly) {
      const r = this.rot;
      r.t += dt;
      const k = Math.min(1, r.t / r.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const ang = r.from + (r.to - r.from) * e;
      const tg = c.target, p = this.camera.position;
      const rad = Math.hypot(p.x - tg.x, p.z - tg.z);
      p.x = tg.x + Math.sin(ang) * rad; p.z = tg.z + Math.cos(ang) * rad;
      this.camera.lookAt(tg);
      if (k >= 1) this.rot = null;
    }
    if (this.isChase() && this.follow) {
      const a = this.follow;
      if (!a.active) { this.follow = null; this.setMode('tilt'); return; }
      if (this.mode === 'cockpit') {
        // driver's seat: right-hand drive, eye ~1.2 m up, looking down the road
        const eyeH = a.type === 3 ? 2.3 : a.type === 1 ? 1.05 : a.type === 0 ? 1.55 : a.type >= 4 && a.type <= 6 ? 2.2 : 1.2;
        const side = a.type === 0 ? 0 : -0.35; // left-normal is (hz,-hx); negative = right of travel
        const fwd = a.type === 0 ? 0.1 : a.len * 0.12;
        const px = a.x + a.hx * fwd + a.hz * side, pz = a.z + a.hz * fwd - a.hx * side;
        const k = 1 - Math.exp(-dt * 14);
        this.camera.position.set(px, eyeH, pz);
        this.look.set(a.x + a.hx * 30, eyeH - 0.6, a.z + a.hz * 30);
        c.target.lerp(this.look, k);
        this.camera.lookAt(c.target);
        if (this.camera.near !== 0.1) { this.camera.near = 0.1; this.camera.far = 2200; this.camera.updateProjectionMatrix(); }
        return;
      }
      const street = this.mode === 'street';
      const back = this.followDist, h = street ? 2.6 + back * 0.12 : back * 0.75;
      this.camPos.set(a.x - a.hx * back, h, a.z - a.hz * back);
      const k = 1 - Math.exp(-dt * (street ? 6 : 3.5));
      this.camera.position.lerp(this.camPos, k);
      this.look.set(a.x + a.hx * (street ? 14 : 6), street ? 1.6 : 0, a.z + a.hz * (street ? 14 : 6));
      c.target.lerp(this.look, k);
      this.camera.lookAt(c.target);
      return;
    }
    if (this.camera.near !== 2 && this.mode !== 'cockpit') { this.camera.near = 2; this.camera.far = 9000; this.camera.updateProjectionMatrix(); }
    if (c.enabled) {
      c.update();
      // keep the target within the city
      c.target.x = THREE.MathUtils.clamp(c.target.x, WORLD.minX, WORLD.maxX);
      c.target.z = THREE.MathUtils.clamp(c.target.z, WORLD.minZ, WORLD.maxZ);
      c.target.y = 0;
    }
  }
}
