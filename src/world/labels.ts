import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AREAS, DESTINATIONS, LANDMARKS, ROADS } from '../data/city';
import type { Network } from '../sim/network';
import { L } from '../i18n/i18n';

const LM_ICON: Record<string, string> = {
  vidhana: '🏛️', stadium: '🏏', park: '🌳', glasshouse: '🌺', tower: '🏙️', busstand: '🚌', palace: '🏰', temple: '🛕', lake: '💧', techpark: '💻', pyramid: '🔷', mall: '🛍️',
};

export type LabelKind = 'area' | 'lm' | 'road' | 'node' | 'dest' | 'stn';
interface Lbl { obj: CSS2DObject; el: HTMLDivElement; kind: LabelKind; name: { en: string; kn: string }; icon?: string; minD: number; maxD: number }

export class Labels {
  renderer = new CSS2DRenderer();
  group = new THREE.Group();
  private items: Lbl[] = [];
  /** Label kinds switched off in Show on map. */
  hidden = new Set<LabelKind>();

  constructor(container: HTMLElement, net: Network) {
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    const el = this.renderer.domElement;
    el.className = 'labels-layer';
    container.appendChild(el);
    window.addEventListener('resize', () => this.renderer.setSize(container.clientWidth, container.clientHeight));

    for (const a of AREAS) this.add('area', a, a.x, 2, a.z, 0, 2600);
    for (const lm of LANDMARKS) {
      if (lm.id === 'glasshouse' || lm.id === 'palacegrounds') continue;
      const vip = ['vidhana', 'chinnaswamy', 'cubbon', 'lalbagh', 'bellandurlake', 'busstand'].includes(lm.id);
      this.add('lm', lm, lm.x, lm.kind === 'tower' ? 75 : lm.kind === 'stadium' ? 30 : lm.kind === 'vidhana' ? 28 : 14, lm.z, 0, vip ? 2600 : lm.kind === 'lake' || lm.kind === 'park' ? 650 : 850, LM_ICON[lm.kind]);
    }
    // one label per road (on its longest edge) + a few repeats for long roads
    for (const r of ROADS) {
      const edges = net.edgeLinks.map(([f]) => net.links[f]).filter((l) => l.road.id === r.id).sort((a, b) => b.len - a.len);
      edges.slice(0, r.ring ? 5 : r.major ? 2 : 1).forEach((l) => {
        const p = net.pose(l, l.len * 0.5, 0);
        this.add('road', r, p.x, 1, p.z, 0, r.ring ? 1700 : r.major ? 1300 : 520);
      });
    }
    for (const nd of net.nodes) {
      const d = DESTINATIONS[nd.key];
      if (d) { this.add('dest', { en: `${d.en} ${d.km} km`, kn: `${d.kn} ${d.km} ಕಿ.ಮೀ` }, nd.x, 4, nd.z, 0, 3000, '➜'); continue; }
      if (nd.def.label) this.add('node', nd.def, nd.x, 3, nd.z, 0, 800);
    }
    this.refresh();
  }

  private add(kind: Lbl['kind'], name: { en: string; kn: string }, x: number, y: number, z: number, minD: number, maxD: number, icon?: string) {
    const el = document.createElement('div');
    el.className = 'lbl lbl-' + kind;
    const obj = new CSS2DObject(el);
    obj.position.set(x, y, z);
    this.group.add(obj);
    this.items.push({ obj, el, kind, name, icon, minD, maxD });
  }

  addStations(st: { x: number; z: number; name: string; kn?: string; open?: boolean; color?: number }[]) {
    for (const s of st) {
      if (!s.name) continue;
      this.add('stn', { en: s.name, kn: s.kn || s.name }, s.x, 18, s.z, 0, 320, s.open === false ? '🚧' : 'Ⓜ️');
      if (s.color !== undefined) this.items[this.items.length - 1].el.style.borderLeft = `4px solid #${s.color.toString(16).padStart(6, '0')}`;
    }
    this.refresh();
  }

  refresh() {
    for (const it of this.items) it.el.innerHTML = (it.icon ? `<span class="ic">${it.icon}</span>` : '') + `<span>${L(it.name)}</span>`;
  }

  update(scene: THREE.Scene, camera: THREE.Camera, camDist: number) {
    const cp = camera.position;
    for (const it of this.items) {
      const p = it.obj.position;
      const real = Math.hypot(p.x - cp.x, p.y - cp.y, p.z - cp.z);
      const d = Math.max(camDist, real * 0.8);
      // near the ground only nearby labels make sense (keeps street view clean)
      const vis = !this.hidden.has(it.kind) && d >= it.minD && d <= it.maxD && !(cp.y < 60 && real > (it.kind === 'dest' ? 600 : it.kind === 'area' ? 350 : 220)) && !(it.kind === 'dest' && real < 170);
      if (it.kind === 'area') it.el.style.opacity = camDist < 110 ? '0' : camDist < 260 ? String((camDist - 110) / 150) : '1';
      it.obj.visible = vis;
    }
    this.renderer.render(scene, camera);
  }
}
