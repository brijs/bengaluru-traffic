import * as THREE from 'three';
import type { Sim } from '../sim/sim';
import { t } from '../i18n/i18n';
import { burstTex, emojiTex, pillTex } from './textures';

interface Pop { sp: THREE.Sprite; t: number; life: number; vy: number; s0: number; s1: number; fade: boolean }
interface Spark { pts: THREE.Points; vel: Float32Array; t: number; life: number }

export class Fx {
  group = new THREE.Group();
  private pops: Pop[] = [];
  private free: THREE.Sprite[] = [];
  private sparks: Spark[] = [];
  private sparkFree: THREE.Points[] = [];
  private rings: THREE.Mesh[] = [];
  private ringIcons: THREE.Sprite[] = [];
  onHonk?: (x: number, z: number, agent?: number) => void;
  onCrash?: (x: number, z: number, kind: string) => void;
  onEvent?: (type: string, x: number, z: number, a?: number) => void;
  private honkWords: string[] = [];
  /** Show on map switches. */
  show = { honks: true, pops: true, rings: true };

  constructor(private sim: Sim) {
    for (let i = 0; i < 70; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sp.visible = false; sp.renderOrder = 12;
      this.free.push(sp); this.group.add(sp);
    }
    for (let i = 0; i < 10; i++) {
      const n = 36, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.9, color: 0xfff176, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      p.visible = false; p.frustumCulled = false;
      this.sparkFree.push(p); this.group.add(p);
    }
    const rg = new THREE.RingGeometry(0.75, 1, 40); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, depthWrite: false, depthTest: false }));
      m.visible = false; m.renderOrder = 9;
      this.rings.push(m); this.group.add(m);
      const ic = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('🚑'), depthTest: false, sizeAttenuation: false, transparent: true }));
      ic.scale.set(0.03, 0.03, 1); ic.visible = false; ic.renderOrder = 11;
      this.ringIcons.push(ic); this.group.add(ic);
    }
    this.refreshWords();
  }
  refreshWords() { this.honkWords = [t('fx.peep'), t('fx.pom'), t('fx.honk'), t('fx.beep')]; }

  private pop(tex: THREE.Texture, x: number, y: number, z: number, life: number, s0: number, s1: number, vy = 2, aspect = 1, fade = true) {
    const sp = this.free.pop();
    if (!sp) return;
    sp.material.map = tex; sp.material.opacity = 1; sp.material.needsUpdate = true;
    sp.position.set(x, y, z); sp.visible = true;
    sp.userData.aspect = aspect;
    this.pops.push({ sp, t: 0, life, vy, s0, s1, fade });
  }
  private activeHonks() { let n = 0; for (const p of this.pops) if (p.sp.userData.aspect === 2) n++; return n; }
  sparkle(x: number, z: number, color = 0xfff176) {
    const p = this.sparkFree.pop();
    if (!p) return;
    const pos = p.geometry.attributes.position as THREE.BufferAttribute;
    const vel = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, x, 1.5, z);
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 8;
      vel.set([Math.cos(a) * s, 6 + Math.random() * 10, Math.sin(a) * s], i * 3);
    }
    pos.needsUpdate = true;
    (p.material as THREE.PointsMaterial).color.setHex(color);
    p.visible = true;
    this.sparks.push({ pts: p, vel, t: 0, life: 1.1 });
  }
  text(txt: string, x: number, z: number, bg = '#12b76a') { this.pop(pillTex(txt, bg), x, 6, z, 1.6, 0.6, 1, 3, 3.3); }
  emoji(e: string, x: number, z: number, size = 5, life = 1.1) { this.pop(emojiTex(e), x, 4, z, life, size * 0.6, size, 2.5); }

  update(dt: number, focus: THREE.Vector3, camDist: number, wallT: number) {
    const sim = this.sim;
    const R = Math.max(220, camDist * 1.3);
    let honkSpawn = 0;
    for (const f of sim.fx) {
      const near = Math.abs(f.x - focus.x) < R && Math.abs(f.z - focus.z) < R;
      this.onEvent?.(f.type, f.x, f.z, f.a);
      switch (f.type) {
        case 'honk':
          if (this.show.honks && near && honkSpawn < (camDist < 120 ? 2 : 5) && camDist < 900 && (camDist > 120 || this.activeHonks() < 3)) {
            honkSpawn++;
            const w = this.honkWords[Math.floor(Math.random() * this.honkWords.length)];
            const close = camDist < 60;
            const s = close ? 1.1 + camDist * 0.01 : Math.min(6, Math.max(1.4, camDist * 0.011));
            this.pop(burstTex(w), f.x, close ? 2.2 : 3, f.z, close ? 0.75 : 0.9, s * 0.75, s * 1.15, close ? 1.5 : 2.6, 2);
          }
          if (near) this.onHonk?.(f.x, f.z, f.a);
          break;
        case 'crash':
          this.onCrash?.(f.x, f.z, f.txt ?? '');
          if (near && this.show.pops) { const s = Math.max(7, camDist * 0.03); this.pop(emojiTex('💥'), f.x, 3, f.z, 1.4, s * 0.4, s * 1.4, 1.5); this.sparkle(f.x, f.z, 0xff8a00); }
          break;
        case 'near':
          if (near && this.show.pops && camDist < 260) this.pop(emojiTex('❗'), f.x, 4, f.z, 0.7, 1.8, 3, 3);
          break;
        case 'scare':
          if (near && this.show.pops && camDist < 300) this.pop(emojiTex('😱'), f.x, 3, f.z, 0.9, 1.6, 2.6, 2);
          break;
        case 'cleared':
          if (near) { this.sparkle(f.x, f.z, 0x80deea); }
          break;
        case 'tow':
          if (near && this.show.pops) { this.text('🛻 ' + t('fx.towed'), f.x, f.z, '#475569'); this.sparkle(f.x, f.z, 0xb0bec5); }
          break;
        case 'dispatch':
          if (near && this.show.pops) this.text('🚑 ' + t('fx.amb'), f.x, f.z, '#dc2626');
          break;
        case 'arrive':
          if (near) this.sparkle(f.x, f.z, 0xff5252);
          break;
      }
    }
    sim.fx.length = 0;

    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.sp.visible = false; this.free.push(p.sp); this.pops.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - Math.min(1, k * 2.5), 3);
      const s = p.s0 + (p.s1 - p.s0) * e;
      p.sp.scale.set(s * (p.sp.userData.aspect ?? 1), s, 1);
      p.sp.position.y += p.vy * dt;
      if (p.fade) p.sp.material.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt;
      if (s.t > s.life) { s.pts.visible = false; this.sparkFree.push(s.pts); this.sparks.splice(i, 1); continue; }
      const pos = s.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < pos.count; j++) {
        s.vel[j * 3 + 1] -= 22 * dt;
        pos.setXYZ(j, pos.getX(j) + s.vel[j * 3] * dt, Math.max(0.2, pos.getY(j) + s.vel[j * 3 + 1] * dt), pos.getZ(j) + s.vel[j * 3 + 2] * dt);
      }
      pos.needsUpdate = true;
      (s.pts.material as THREE.PointsMaterial).opacity = 1 - s.t / s.life;
      (s.pts.material as THREE.PointsMaterial).size = Math.max(0.9, camDist * 0.004);
    }
    // persistent rings at active crash sites
    let k = 0;
    for (const c of sim.crashes) {
      if (!this.show.rings || c.cleared || k >= this.rings.length) continue;
      const ring = this.rings[k], ic = this.ringIcons[k];
      const base = Math.max(5, camDist * 0.016);
      const ph = (wallT * 1.4 + c.id * 0.3) % 1;
      ring.visible = true;
      ring.position.set(c.x, 0.3, c.z);
      ring.scale.setScalar(base * (0.6 + ph * 1.2));
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.9;
      (ring.material as THREE.MeshBasicMaterial).color.setHex(c.injured ? 0xff1744 : 0xffa000);
      ic.visible = c.injured && c.arrived < 0;
      ic.position.set(c.x, 7, c.z);
      ic.userData.crash = c.id;
      ring.userData.crash = c.id;
      k++;
    }
    for (; k < this.rings.length; k++) { this.rings[k].visible = false; this.ringIcons[k].visible = false; }
  }
}
