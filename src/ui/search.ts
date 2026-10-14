import { AREAS, DESTINATIONS, LANDMARKS, NODES, ROADS } from '../data/city';
import { BLR_VIEWBOX, toWorld } from '../data/geo';
import { getLang, L, LK, t } from '../i18n/i18n';
import type { Network } from '../sim/network';
import type { Agent } from '../sim/sim';
import { IS_MOBILE } from '../world/scene';

export interface Place { id: string; icon: string; en: string; kn: string; kindEn: string; kindKn: string; x: number; z: number; zoom: number; osm?: boolean }

export interface SearchCtx {
  net: Network;
  flyTo(x: number, z: number, dist: number): void;
  setPin(which: 'from' | 'to', p: Place | null): void;
  startDrive(from: Place, to: Place | null): Agent | null;
  takeWheel(a: Agent): void; autopilot(a: Agent): void;
  stopDrive(): void;
  clockMin(): number;
  onSceneLoaded?: () => void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Rough real-world scale for trip read-outs (the map itself is compressed). */
const M_PER_UNIT = 10;

export class SearchUI {
  private index: Place[] = [];
  private panel: HTMLDivElement | null = null;
  private trip: HTMLDivElement | null = null;
  from: Place | null = null; to: Place | null = null;
  private car: Agent | null = null;
  private q = '';
  private osm: Place[] = []; private osmState: '' | 'loading' | 'error' | 'none' = '';

  constructor(private ctx: SearchCtx) { this.buildIndex(); }

  private buildIndex() {
    const add = (p: Place) => this.index.push(p);
    for (const a of AREAS) add({ id: 'a:' + a.id, icon: '🏘️', en: a.en, kn: a.kn, kindEn: 'Area', kindKn: 'ಪ್ರದೇಶ', x: a.x, z: a.z, zoom: 260 });
    for (const lm of LANDMARKS) add({ id: 'l:' + lm.id, icon: lm.kind === 'lake' ? '💧' : lm.kind === 'park' ? '🌳' : '🏛️', en: lm.en, kn: lm.kn, kindEn: 'Landmark', kindKn: 'ಹೆಗ್ಗುರುತು', x: lm.x, z: lm.z, zoom: 120 });
    for (const n of NODES) {
      if (n.kind === 'end') continue;
      add({ id: 'n:' + n.id, icon: '🚦', en: n.en, kn: n.kn, kindEn: 'Junction', kindKn: 'ಜಂಕ್ಷನ್', x: n.x, z: n.z, zoom: 90 });
    }
    for (const n of NODES) {
      const d = DESTINATIONS[n.id];
      if (d) add({ id: 'd:' + n.id, icon: '➜', en: `${n.en} → ${d.en}`, kn: `${n.kn} → ${d.kn}`, kindEn: 'Exit road', kindKn: 'ನಿರ್ಗಮನ ರಸ್ತೆ', x: n.x, z: n.z, zoom: 160 });
    }
    const net = this.ctx.net;
    for (const r of ROADS) {
      const edges = net.edgeLinks.map(([f]) => net.links[f]).filter((l) => l.road.id === r.id).sort((a, b) => b.len - a.len);
      if (!edges.length) continue;
      const p = net.pose(edges[0], edges[0].len / 2, 0);
      add({ id: 'r:' + r.id, icon: '🛣️', en: r.en, kn: r.kn, kindEn: 'Road', kindKn: 'ರಸ್ತೆ', x: p.x, z: p.z, zoom: r.ring ? 500 : 220 });
    }
  }

  private match(q: string): Place[] {
    const nq = norm(q);
    if (!nq) return [];
    const words = nq.split(' ');
    const scored: { p: Place; s: number }[] = [];
    for (const p of this.index) {
      const hay = norm(p.en) + ' ' + p.kn;
      let s = 0;
      if (norm(p.en).startsWith(nq) || p.kn.startsWith(q.trim())) s += 10;
      for (const w of words) { if (hay.includes(w)) s += 3; else { s = -1; break; } }
      if (s > 0) scored.push({ p, s: s - p.en.length * 0.01 });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.p);
  }

  /** Businesses / buildings via OpenStreetMap Nominatim (one request per explicit search). */
  private async searchOSM() {
    const q = this.q.trim();
    if (q.length < 2) return;
    this.osmState = 'loading'; this.osm = []; this.drawResults();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&bounded=1&viewbox=${BLR_VIEWBOX}&accept-language=${getLang() === 'kn' ? 'kn,en' : 'en'}&q=${encodeURIComponent(q + ', Bengaluru')}`;
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 10000);
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ac.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(String(res.status));
      const rows: { lat: string; lon: string; name: string; display_name: string; type: string; category?: string }[] = await res.json();
      this.osm = rows.map((r, i) => {
        const w = toWorld(+r.lat, +r.lon);
        const name = r.name || r.display_name.split(',')[0];
        const addr = r.display_name.split(',').slice(1, 4).join(',').trim();
        return { id: 'o:' + i, icon: '🏢', en: name, kn: name, kindEn: addr || r.type, kindKn: addr || r.type, x: w.x, z: w.z, zoom: 70, osm: true } as Place;
      });
      this.osmState = this.osm.length ? '' : 'none';
    } catch { this.osmState = 'error'; }
    this.drawResults();
  }

  toggle(open?: boolean) {
    const want = open ?? !this.panel;
    if (!want) { this.panel?.remove(); this.panel = null; return; }
    if (this.panel) return;
    const p = document.createElement('div');
    p.className = 'search-panel glass';
    p.innerHTML = `<div class="sp-row"><input class="search" id="sp-q" placeholder="${t('search.ph')}" autocomplete="off"/><button class="mini" data-x>✕</button></div>
      <div id="sp-res"></div>
      <button class="btn sp-osm" data-osm>🏢 ${t('search.osm')}</button>
      <div class="sp-note">${t('search.osmnote')}</div>
      <div id="sp-trip"></div>`;
    document.getElementById('ui')!.append(p);
    this.panel = p;
    const inp = p.querySelector('#sp-q') as HTMLInputElement;
    inp.value = this.q;
    inp.oninput = () => { this.q = inp.value; this.osm = []; this.osmState = ''; this.drawResults(); };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { const m = this.match(this.q); if (m.length && !e.shiftKey) this.go(m[0]); else this.searchOSM(); }
      if (e.key === 'Escape') this.toggle(false);
      e.stopPropagation();
    };
    (p.querySelector('[data-x]') as HTMLElement).onclick = () => this.toggle(false);
    (p.querySelector('[data-osm]') as HTMLElement).onclick = () => this.searchOSM();
    this.drawResults(); this.drawTripSetup();
    setTimeout(() => inp.focus(), 30);
  }

  private go(pl: Place) { this.ctx.flyTo(pl.x, pl.z, pl.zoom); if (IS_MOBILE) this.toggle(false); }

  private row(pl: Place) {
    const r = document.createElement('div');
    r.className = 'sp-item';
    r.innerHTML = `<span class="ic">${pl.icon}</span><div class="nm"><b>${esc(LK(pl.en, pl.kn))}</b><small>${esc(LK(pl.kindEn, pl.kindKn))}</small></div>
      <button class="mini eye" data-go title="${t('search.go')}">📍</button><button class="mini" data-from title="${t('search.from')}">🟢</button><button class="mini" data-to title="${t('search.to')}">🏁</button>`;
    (r.querySelector('[data-go]') as HTMLElement).onclick = () => this.go(pl);
    (r.querySelector('.nm') as HTMLElement).onclick = () => this.go(pl);
    (r.querySelector('[data-from]') as HTMLElement).onclick = () => { this.from = pl; this.ctx.setPin('from', pl); this.drawTripSetup(); };
    (r.querySelector('[data-to]') as HTMLElement).onclick = () => { this.to = pl; this.ctx.setPin('to', pl); this.drawTripSetup(); };
    return r;
  }

  private drawResults() {
    const box = this.panel?.querySelector('#sp-res');
    if (!box) return;
    box.innerHTML = '';
    const loc = this.match(this.q);
    for (const pl of loc) box.append(this.row(pl));
    if (this.osmState === 'loading') box.append(Object.assign(document.createElement('div'), { className: 'sp-note', textContent: '⏳ ' + t('search.loading') }));
    if (this.osmState === 'error') box.append(Object.assign(document.createElement('div'), { className: 'sp-note', textContent: '⚠️ ' + t('search.error') }));
    if (this.osmState === 'none') box.append(Object.assign(document.createElement('div'), { className: 'sp-note', textContent: t('search.none') }));
    if (this.osm.length) {
      const h = document.createElement('div'); h.className = 'sp-h'; h.textContent = '🏢 OpenStreetMap'; box.append(h);
      for (const pl of this.osm) box.append(this.row(pl));
    }
    if (!loc.length && !this.osm.length && this.q.trim() && !this.osmState) box.append(Object.assign(document.createElement('div'), { className: 'sp-note', textContent: t('search.tryosm') }));
  }

  private drawTripSetup() {
    const box = this.panel?.querySelector('#sp-trip');
    if (!box) return;
    const f = this.from, d = this.to;
    box.innerHTML = `<div class="sp-h">🚗 ${t('trip.title')}</div>
      <div class="sp-trip"><span>🟢 ${f ? esc(LK(f.en, f.kn)) : `<i>${t('trip.pickfrom')}</i>`}</span><span>🏁 ${d ? esc(LK(d.en, d.kn)) : `<i>${t('trip.pickto')}</i>`}</span></div>
      <div class="acts"><button class="btn primary" data-drive ${f && d ? '' : 'disabled'}>🚗 ${t('trip.start')}</button><button class="btn" data-self ${f ? '' : 'disabled'}>🕹️ ${t(d ? 'drive.take' : 'drive.free')}</button><button class="btn" data-swap>⇅</button><button class="btn" data-clear>✕</button></div>`;
    (box.querySelector('[data-drive]') as HTMLButtonElement).onclick = () => this.start();
    (box.querySelector('[data-self]') as HTMLButtonElement).onclick = () => this.start(true);
    (box.querySelector('[data-swap]') as HTMLElement).onclick = () => { [this.from, this.to] = [this.to, this.from]; this.ctx.setPin('from', this.from); this.ctx.setPin('to', this.to); this.drawTripSetup(); };
    (box.querySelector('[data-clear]') as HTMLElement).onclick = () => { this.from = this.to = null; this.ctx.setPin('from', null); this.ctx.setPin('to', null); this.drawTripSetup(); };
  }

  start(manual = false) {
    if (!this.from || (!this.to && !manual)) return;
    const a = this.ctx.startDrive(this.from, this.to);
    if (!a) return;
    this.car = a;
    if (manual) this.ctx.takeWheel(a);
    this.toggle(false);
    this.showTrip();
  }

  private showTrip() {
    this.trip?.remove();
    const c = document.createElement('div');
    c.className = 'trip-card glass';
    document.getElementById('ui')!.append(c);
    this.trip = c;
    this.update();
  }

  /** Live read-out; call ~2× per second. */
  update() {
    const a = this.car, c = this.trip;
    if (!a || !c || !a.trip) return;
    const tr = a.trip;
    const clockMin = Math.max(0, (((tr.done && tr.endClock >= 0 ? tr.endClock : this.ctx.clockMin()) - tr.startClock + 1440) % 1440));
    const km = (tr.dist * M_PER_UNIT) / 1000;
    const kmh = clockMin > 0.5 ? km / (clockMin / 60) : 0;
    const freeMin = ((tr.dist / 13) * 10) / 60; // same distance at free-flow speed
    if (!this.to) { /* free drive: no destination */ }
    const stress = tr.samples ? tr.stressSum / tr.samples : 0;
    const em = (s: number) => (s < 0.25 ? '😌' : s < 0.5 ? '😐' : s < 0.75 ? '😠' : '🤬');
    const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
    const done = tr.done;
    c.classList.toggle('driving', a.manual && !done);
    const outcome = tr.outcome === 'arrived' ? `🏁 ${t('trip.arrived')}` : tr.outcome === 'crashed' ? `💥 ${t('trip.crashed')}` : tr.outcome === 'stuck' ? `🚫 ${t('trip.stuck')}` : '';
    c.innerHTML = `<div class="ch"><span class="big">🚗</span><h3>${t('trip.car')}<small>${esc(LK(this.from!.en, this.from!.kn))}${this.to ? ' → ' + esc(LK(this.to.en, this.to.kn)) : ''}</small></h3><button class="mini" data-close>✕</button></div>
      ${done ? `<div class="note" style="font-size:14px">${outcome}</div>` : ''}
      <div class="trip-grid">
        <div><small>⏱️ ${t('trip.time')}</small><b>${fmt(clockMin)}</b></div>
        <div><small>📏 ${t('trip.dist')}</small><b>${km.toFixed(1)} km</b></div>
        <div><small>🚗 ${t('trip.avg')}</small><b>${kmh.toFixed(0)} km/h</b></div>
        <div><small>${em(a.stress)} ${t('trip.stress')}</small><b>${Math.round((done ? stress : a.stress) * 100)}%</b></div>
        <div><small>🛑 ${t('trip.stops')}</small><b>${tr.stops}</b></div>
        <div><small>⌛ ${t('trip.waiting')}</small><b>${fmt((tr.waitT * 10) / 60)}</b></div>
        <div><small>📢 ${t('trip.honked')}</small><b>${tr.honksAt}</b></div>
        <div><small>❗ ${t('trip.near')}</small><b>${tr.near}</b></div>
      </div>
      <p>${t('trip.free', { m: fmt(freeMin) })}${clockMin > freeMin + 1 ? ' · ' + t('trip.lost', { m: fmt(clockMin - freeMin) }) : ''}</p>
      <div class="acts">${done ? `<button class="btn primary" data-again>🔁 ${t('trip.again')}</button>` : `<button class="btn" data-stop>⏹ ${t('trip.stop')}</button>${a.manual ? (this.to ? `<button class="btn" data-auto>🤖 ${t('drive.auto')}</button>` : '') : `<button class="btn primary" data-wheel>🕹️ ${t('drive.take')}</button>`}`}</div>`;
    const wh = c.querySelector('[data-wheel]') as HTMLElement | null; if (wh) wh.onclick = () => { this.ctx.takeWheel(a); this.update(); };
    const au = c.querySelector('[data-auto]') as HTMLElement | null; if (au) au.onclick = () => { this.ctx.autopilot(a); this.update(); };
    (c.querySelector('[data-close]') as HTMLElement).onclick = () => { if (!done) this.ctx.stopDrive(); c.remove(); this.trip = null; this.car = null; };
    const st = c.querySelector('[data-stop]') as HTMLElement | null;
    if (st) st.onclick = () => { this.ctx.stopDrive(); };
    const ag = c.querySelector('[data-again]') as HTMLElement | null;
    if (ag) ag.onclick = () => this.start();
  }
  get active() { return !!this.trip; }
}
export const placeName = (p: Place) => L(p);
