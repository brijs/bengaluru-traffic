import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Agent } from '../sim/sim';

/** Interior seen from the driver's seat (right-hand drive). Children of the camera. */
export class Cockpit {
  group = new THREE.Group();
  private wheel = new THREE.Group();
  private gauge: THREE.CanvasTexture;
  private gctx: CanvasRenderingContext2D;
  private indL: THREE.Mesh; private indR: THREE.Mesh;
  private car = new THREE.Group(); private bike = new THREE.Group();
  private steer = 0; private lastDraw = -1;

  constructor(camera: THREE.Camera) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x23252a });
    const dash = new THREE.MeshLambertMaterial({ color: 0x3a3c42 });
    const trim = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });
    // dashboard across the bottom
    const d = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.32, 0.5, 2, 0.08), dash);
    d.position.set(0.15, -0.36, -0.75); d.rotation.x = -0.25;
    // A-pillars + roof edge
    for (const x of [-0.95, 0.85]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.09), dark);
      p.position.set(x, 0.05, -0.75); p.rotation.z = x < 0 ? -0.42 : 0.42;
      this.car.add(p);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), dark); roof.position.set(0, 0.36, -0.55);
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.1, 0.04, 2, 0.02), dark); mirror.position.set(-0.3, 0.27, -0.8);
    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ color: 0x6d7d8c })); mirrorGlass.position.set(-0.3, 0.27, -0.778);
    // steering wheel in front of the right-hand seat (camera already sits on the right)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 28), dark);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), trim); hub.rotation.x = Math.PI / 2;
    this.wheel.add(rim, hub);
    for (const a of [Math.PI / 2, Math.PI * 7 / 6, -Math.PI / 6]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.02), dark);
      sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); sp.rotation.z = a; this.wheel.add(sp);
    }
    this.wheel.position.set(0, -0.24, -0.55); this.wheel.rotation.x = -0.35;
    // instrument cluster (canvas)
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    this.gctx = c.getContext('2d')!;
    this.gauge = new THREE.CanvasTexture(c); this.gauge.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: this.gauge, transparent: true }));
    g.position.set(0, -0.215, -0.66); g.rotation.x = -0.3; g.scale.setScalar(0.7);
    // indicators
    const im = () => new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0 }));
    this.indL = im(); this.indL.position.set(-0.1, -0.16, -0.64);
    this.indR = im(); this.indR.position.set(0.1, -0.16, -0.64);
    this.car.add(d, roof, mirror, mirrorGlass, this.wheel, g, this.indL, this.indR);
    // two-wheeler: handlebar + mirrors only
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), dark); bar.position.set(0, -0.26, -0.55);
    const tank = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.12, 0.4, 2, 0.05), new THREE.MeshLambertMaterial({ color: 0xb71c1c })); tank.position.set(0, -0.36, -0.45);
    const g2 = g.clone(); g2.position.set(0, -0.25, -0.6);
    this.bike.add(bar, tank, g2);
    this.group.add(this.car, this.bike);
    for (const o of [this.car, this.bike]) o.traverse((m) => { (m as THREE.Mesh).renderOrder = 50; const mat = (m as THREE.Mesh).material as THREE.Material | undefined; if (mat) { mat.depthTest = false; mat.depthWrite = false; } });
    this.group.visible = false;
    camera.add(this.group);
  }

  private prevAng = 0;
  update(a: Agent | null, show: boolean, time: number, dt = 0.016) {
    this.group.visible = show && !!a;
    if (!this.group.visible || !a) return;
    const bike = a.type === 0;
    this.car.visible = !bike; this.bike.visible = bike;
    // steering follows lane changes and junction turns
    let target = 0;
    if (a.latT < 1) target = (a.latTo - a.latFrom) > 0 ? 0.5 : -0.5;
    const ang = Math.atan2(a.hz, a.hx);
    let dA = ang - this.prevAng; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2;
    this.prevAng = ang;
    if (Math.abs(dA) > 1e-4 && dt > 0) target = Math.max(-1, Math.min(1, -(dA / dt) * 1.2)) || target;
    this.steer += (target - this.steer) * 0.12;
    this.wheel.rotation.z = this.steer * 1.6;
    const blink = Math.floor(time * 3) % 2 === 0 ? 1 : 0;
    (this.indL.material as THREE.MeshBasicMaterial).opacity = target > 0 ? blink : 0;
    (this.indR.material as THREE.MeshBasicMaterial).opacity = target < 0 ? blink : 0;
    const kmh = Math.round(a.v * 3.6);
    const key = kmh * 100 + Math.round(a.stress * 20);
    if (key === this.lastDraw) return;
    this.lastDraw = key;
    const g = this.gctx;
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(10,12,16,0.92)'; g.beginPath(); g.roundRect(4, 4, 248, 120, 20); g.fill();
    g.strokeStyle = '#2b2f36'; g.lineWidth = 10; g.beginPath(); g.arc(80, 78, 46, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
    g.strokeStyle = kmh > 60 ? '#ef4444' : '#38bdf8'; g.beginPath(); g.arc(80, 78, 46, Math.PI * 0.8, Math.PI * (0.8 + Math.min(1, kmh / 100) * 1.4)); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.fillText(String(kmh), 80, 88);
    g.font = '13px system-ui'; g.fillStyle = '#9fb0c8'; g.fillText('km/h', 80, 108);
    const s = a.stress;
    g.fillStyle = '#9fb0c8'; g.textAlign = 'left'; g.font = '13px system-ui'; g.fillText('STRESS', 150, 40);
    g.fillStyle = '#2b2f36'; g.fillRect(150, 50, 90, 12);
    g.fillStyle = s < 0.4 ? '#22c55e' : s < 0.7 ? '#f59e0b' : '#ef4444'; g.fillRect(150, 50, 90 * Math.min(1, s), 12);
    g.font = '30px system-ui'; g.fillText(s < 0.25 ? '😌' : s < 0.5 ? '😐' : s < 0.75 ? '😠' : '🤬', 175, 100);
    this.gauge.needsUpdate = true;
  }
}
