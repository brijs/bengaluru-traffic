import { AREAS } from '../data/city';
import { AREA_CORP, CONTACTS, CORPS } from '../data/accountability';
import { AGENCIES, CATEGORIES, FREQ_LABEL, ISSUES, OWNERS, SEV_LABEL, type AgencyId, type CategoryId, type OwnerId } from '../data/issues';
import { SLIDERS, SLIDER_BY_ID, type Level, type SliderDef } from '../data/sliders';
import { PRESETS, SOLUTIONS, type Preset, type Solution } from '../data/presets';
import { getLang, L, LK, onLang, setLang, t, type Key } from '../i18n/i18n';
import { grade, type DeptScore, type Parts } from '../sim/score';
import { S, T, TRAIT_SLIDER, VT, type Agent, type Crash, type Ped, type Rider, type Sim } from '../sim/sim';
import type { Hazard } from '../sim/hazards';
import type { CamMode, CameraRig } from '../world/camera';
import { IS_MOBILE } from '../world/scene';

export interface Ctx {
  sim: Sim; rig: CameraRig;
  score(): { est: Parts; meas: Parts; final: Parts };
  setLevel(id: string, lv: Level, quiet?: boolean): void;
  setLevels(lv: Record<string, Level>): void;
  speed: number; setSpeed(n: number): void;
  setOverlay(b: boolean): void; overlay: boolean;
  setMarkers(b: boolean): void; markers: boolean;
  setSound(b: boolean): void; sound: boolean;
  setRain(b: boolean): void; setEvent(b: boolean): void;
  fixHazard(h: Hazard): void; worsenHazard(h: Hazard): void;
  fixAgent(a: Agent): void; towAgent(a: Agent): void; clearCrash(c: Crash): void;
  removeRider(id: number): void; moreRiders(r: Rider): void; removePed(p: Ped): void;
  follow(id: number | null, mode?: CamMode): void; randomCar(): void;
  flyTo(x: number, z: number, dist: number, polar?: number, az?: number): void;
  resetView(): void; setCam(m: CamMode): void;
  spot(id: string): { x: number; z: number; dx: number; dz: number } | null;
  isCustom(id: string): boolean;
  celebrate(x: number, z: number, txt: string): void;
  sparkleSlider(id: string): void;
  reset(): void;
  rotate(dir: number): void; northUp(): void; azimuth(): number;
  depts(): DeptScore[];
  quality: 'low' | 'med' | 'high'; setQuality(q: 'low' | 'med' | 'high'): void;
  openSearch(): void; volume: number; setVolume(v: number): void;
}

type CardKind = 'preview' | 'hazard' | 'agent' | 'rider' | 'ped' | 'where' | null;
type Theme = 'auto' | 'light' | 'dark';
const THEME_ICON: Record<Theme, string> = { auto: '🌓', light: '☀️', dark: '🌙' };
let theme: Theme = 'auto';
try { const v = localStorage.getItem('nr.theme'); if (v === 'light' || v === 'dark') theme = v; } catch { /* storage unavailable */ }
function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('nr.theme', theme); } catch { /* ignore */ }
}
applyTheme();
const CAT_ORDER: CategoryId[] = ['road', 'peds', 'behavior', 'vehicles', 'others', 'signals', 'environment'];

const h = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmtClock = (min: number) => {
  const hh = Math.floor(min / 60) % 24, mm = Math.floor(min % 60);
  const ap = hh < 12 ? 'AM' : 'PM', h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} <small>${ap}</small>`;
};

export class UI {
  root = document.getElementById('ui')!;
  private tab: 'issues' | 'solutions' | 'scenes' | 'book' | 'stats' = 'issues';
  private closedCats = new Set<string>();
  private openInfo = new Set<string>();
  private bookQ = ''; private bookCat: CategoryId | 'all' = 'all'; private bookOwner: OwnerId | 'all' = 'all';
  private card: HTMLElement | null = null; private cardKind: CardKind = null; private cardData: any = null;
  private shown = 0; private lastMilestone = 0;
  private solPrev = new Map<string, Record<string, Level>>();
  private els: Record<string, HTMLElement> = {};
  private sheet: 'peek' | 'half' | 'full' = 'half';
  private pv: { id: string; prev: Level; ghost: boolean; on: boolean; clock?: number; rain?: boolean; x: number; z: number } | null = null;
  private tickT = 0; private liveT = 0;

  constructor(private ctx: Ctx) {
    this.sheet = IS_MOBILE ? 'peek' : 'half';
    this.render();
    onLang(() => this.render());
    try { if (!localStorage.getItem('nr.seen')) this.help(); } catch { this.help(); }
  }

  // ───────────────────────────── layout
  render() {
    const r = this.root;
    r.innerHTML = '';
    document.documentElement.lang = getLang();
    r.append(this.topBar(), this.metricsRow(), this.panel(), this.rightBar(), this.els.toasts ?? (this.els.toasts = h('div', '', '')));
    this.els.toasts.id = 'toasts';
    if (this.card && this.cardKind) { const k = this.cardKind, d = this.cardData; this.closeCard(true); this.openCard(k, d); }
    this.syncSheet();
    this.updateScore(true);
    this.updateMetrics();
  }

  private topBar() {
    const top = h('div', ''); top.id = 'top';
    const brand = h('div', 'brand glass', `<span class="logo">🛺</span><div><b>${t('app.title')}</b><small>${t('app.sub')}</small></div>`);
    const score = h('div', 'score glass');
    score.innerHTML = `
      <div class="gauge">
        <svg viewBox="0 0 132 76">
          <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#ef4444"/><stop offset=".45" stop-color="#f59e0b"/><stop offset=".75" stop-color="#facc15"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>
          <path d="M10 70 A56 56 0 0 1 122 70" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="11" stroke-linecap="round"/>
          <path id="garc" d="M10 70 A56 56 0 0 1 122 70" fill="none" stroke="url(#gg)" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>
          <line id="gneedle" x1="66" y1="70" x2="66" y2="24" stroke="var(--text)" stroke-width="3" stroke-linecap="round" style="transform-origin:66px 70px;transition:transform .5s"/>
          <circle cx="66" cy="70" r="5" fill="var(--text)"/>
        </svg>
        <div class="num" id="snum">0</div>
      </div>
      <div class="meta">
        <div class="grade"><span id="semo">🤯</span><span id="sgrade"></span></div>
        <div class="parts">
          ${(['flow', 'safety', 'comfort', 'ped'] as const).map((k) => `<div class="part">${t(('score.' + k) as Key)}<i><b id="sp-${k}"></b></i></div>`).join('')}
        </div>
      </div>
      <div class="delta" id="sdelta"></div>`;
    score.title = t('est.note');
    score.onclick = () => { this.tab = 'stats'; this.sheet = this.sheet === 'peek' ? 'half' : this.sheet; this.render(); };
    const tr = h('div', 'topright glass');
    const lang = h('button', 'btn', getLang() === 'en' ? 'ಕನ್ನಡ' : 'EN');
    lang.onclick = () => setLang(getLang() === 'en' ? 'kn' : 'en');
    lang.title = t('help.lang');
    const snd = h('button', 'btn icon', this.ctx.sound ? '🔊' : '🔇');
    snd.title = t('tog.sound');
    snd.onclick = () => { this.ctx.setSound(!this.ctx.sound); snd.textContent = this.ctx.sound ? '🔊' : '🔇'; };
    const help = h('button', 'btn icon', '❔');
    help.onclick = () => this.help();
    const th = h('button', 'btn icon', THEME_ICON[theme]);
    th.title = t(('theme.' + theme) as Key);
    th.onclick = () => { theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'; applyTheme(); th.textContent = THEME_ICON[theme]; th.title = t(('theme.' + theme) as Key); this.toast(THEME_ICON[theme] + ' ' + t(('theme.' + theme) as Key)); };
    const rs = h('button', 'btn', '↺ <span class="desk-only">' + t('reset') + '</span>');
    rs.title = t('reset');
    let armed = 0;
    rs.onclick = () => {
      if (Date.now() - armed < 3500) { armed = 0; this.ctx.reset(); return; }
      armed = Date.now();
      rs.innerHTML = '⚠️ ' + t('reset.confirm'); rs.classList.add('danger');
      setTimeout(() => { if (rs.isConnected) { rs.innerHTML = '↺ <span class="desk-only">' + t('reset') + '</span>'; rs.classList.remove('danger'); } }, 3500);
    };
    const sb = h('button', 'btn', '🔍 <span class="desk-only">' + t('search.btn') + '</span>');
    sb.title = t('search.ph') + ' (/)';
    sb.onclick = () => this.ctx.openSearch();
    tr.append(sb, rs, lang, th, snd, help);
    const where = h('button', 'where glass', '');
    where.id = 'where';
    where.onclick = () => { if (this.whereArea) this.showWhere(this.whereArea); };
    if (IS_MOBILE) top.append(where); else brand.append(where);
    top.append(brand, score, tr);
    return top;
  }

  private metricsRow() {
    const m = h('div', 'metrics');
    const items: [string, string, Key, boolean][] = [
      ['kmh', '🚗', 'm.kmh', false], ['acc', '💥', 'm.acc', false], ['inj', '🚑', 'm.inj', true], ['honk', '📢', 'm.honk', false],
      ['stress', '😤', 'm.stress', false], ['ped', '🚶', 'm.ped', true], ['resp', '⏱️', 'm.resp', true],
    ];
    for (const [id, ic, k, opt] of items) {
      const c = h('div', 'metric glass' + (opt ? ' opt' : ''), `${ic} <b id="m-${id}">–</b> ${t(k)}`);
      m.append(c);
    }
    this.els.metrics = m;
    return m;
  }

  private panel() {
    const p = h('div', 'glass'); p.id = 'panel';
    const handle = h('div', 'sheet-handle');
    let startY = 0, startH = 0, dragging = false;
    handle.onclick = () => { if (dragging) return; this.sheet = this.sheet === 'peek' ? 'half' : this.sheet === 'half' ? 'full' : 'peek'; this.syncSheet(); };
    handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; startH = p.getBoundingClientRect().height; dragging = false; p.style.transition = 'none'; }, { passive: true });
    handle.addEventListener('touchmove', (e) => { const dy = startY - e.touches[0].clientY; if (Math.abs(dy) > 6) dragging = true; p.style.height = Math.max(90, Math.min(window.innerHeight * 0.9, startH + dy)) + 'px'; }, { passive: true });
    handle.addEventListener('touchend', () => {
      p.style.transition = ''; const hh = p.getBoundingClientRect().height; p.style.height = '';
      if (dragging) { const f = hh / window.innerHeight; this.sheet = f < 0.25 ? 'peek' : f < 0.65 ? 'half' : 'full'; this.syncSheet(); }
      setTimeout(() => (dragging = false), 50);
    });
    const tabs = h('div', 'tabs');
    const defs: [typeof this.tab, string, Key][] = [['issues', '🎚️', 'tab.issues'], ['solutions', '🛠️', 'tab.solutions'], ['scenes', '🎬', 'tab.scenes'], ['book', '📚', 'tab.book'], ['stats', '📊', 'tab.stats']];
    for (const [id, ic, k] of defs) {
      const b = h('button', 'tab' + (this.tab === id ? ' on' : ''), `<span>${ic}</span>${t(k)}`);
      b.onclick = () => { this.tab = id; if (this.sheet === 'peek') this.sheet = 'half'; this.render(); };
      tabs.append(b);
    }
    const pane = h('div', 'pane');
    if (this.tab === 'issues') this.issuesPane(pane);
    else if (this.tab === 'solutions') this.solutionsPane(pane);
    else if (this.tab === 'scenes') this.scenesPane(pane);
    else if (this.tab === 'book') this.bookPane(pane);
    else this.statsPane(pane);
    p.append(handle, tabs, pane);
    this.els.panel = p; this.els.pane = pane;
    return p;
  }

  private syncSheet() {
    const p = this.els.panel; if (!p) return;
    p.classList.toggle('peek', this.sheet === 'peek');
    p.classList.toggle('full', this.sheet === 'full');
    this.els.right?.classList.toggle('sheet-peek', this.sheet === 'peek');
    this.els.right?.classList.toggle('sheet-full', this.sheet === 'full');
    this.card?.classList.toggle('sheet-peek', this.sheet === 'peek');
  }

  // ───────────────────────────── issues
  private issuesPane(pane: HTMLElement) {
    for (const cat of CAT_ORDER) {
      const sl = SLIDERS.filter((s) => s.cat === cat);
      if (!sl.length) continue;
      const C = CATEGORIES[cat];
      const box = h('div', 'cat' + (this.closedCats.has(cat) ? ' closed' : ''));
      const hd = h('div', 'cat-h', `<span>${C.icon}</span><span>${L(C)}</span><span class="n">${sl.length}</span><span class="chev">▾</span>`);
      hd.onclick = () => { box.classList.toggle('closed'); if (box.classList.contains('closed')) this.closedCats.add(cat); else this.closedCats.delete(cat); };
      const rows = h('div', 'rows');
      for (const s of sl) rows.append(this.sliderRow(s));
      box.append(hd, rows);
      pane.append(box);
    }
  }

  private sliderRow(s: SliderDef) {
    const lv = this.ctx.sim.levels[s.id] ?? 0;
    const row = h('div', 'row'); row.dataset.sid = s.id;
    const custom = this.ctx.isCustom(s.id);
    const flags = (s.night ? ' 🌙' : '') + (s.rain ? ' 🌧️' : '') + (s.behaviour ? '' : '');
    const rh = h('div', 'rh', `<span class="ic">${s.icon}</span><span class="nm">${esc(L(s))}${flags}${custom ? `<span class="badge">● ${t('custom')}</span>` : ''}</span>`);
    const eye = h('button', 'mini eye', '👁 ' + t('preview'));
    eye.title = t('preview');
    eye.onclick = () => this.preview(s.id);
    const info = h('button', 'mini', 'ⓘ'); info.title = t('info');
    info.onclick = () => { if (this.openInfo.has(s.id)) this.openInfo.delete(s.id); else this.openInfo.add(s.id); this.render(); };
    rh.append(eye, info);
    const desc = h('div', 'desc', esc(LK(s.dEn, s.dKn)));
    const seg = h('div', 'seg');
    for (const l of [0, 1, 2, 3] as Level[]) {
      const b = h('button', l === lv ? 'on' : '', t(('lv.' + l) as Key));
      b.dataset.l = String(l);
      b.onclick = () => { this.ctx.setLevel(s.id, l); this.refreshRow(s.id); };
      seg.append(b);
    }
    row.append(rh, desc, seg);
    if (this.openInfo.has(s.id)) row.append(this.details(s));
    return row;
  }

  private details(s: SliderDef) {
    const d = h('div', 'details');
    const iss = s.issues.map((id) => ISSUES.find((i) => i.id === id)!).filter(Boolean);
    const owners = [...new Set(iss.map((i) => i.owner))];
    const ags = [...new Set(iss.flatMap((i) => i.ag))];
    d.innerHTML = `<h5>${t('linked')}</h5><ul>${iss.map((i) => `<li>#${i.id} ${esc(L(i))} <span class="sev-${i.sev}">●</span></li>`).join('')}</ul>
      <h5>${t('who')}</h5><div class="chips">${owners.map((o) => `<span class="chip">${esc(L(OWNERS[o]))}</span>`).join('')}${ags.map((a) => `<span class="chip">🏛️ ${esc(L(AGENCIES[a]))}</span>`).join('')}</div>
      <h5>${t('fixidea')}</h5><ul>${iss.map((i) => `<li>${esc(LK(i.fixEn, i.fixKn))}</li>`).join('')}</ul>`;
    return d;
  }

  refreshRow(id: string) {
    const row = this.root.querySelector(`.row[data-sid="${id}"]`) as HTMLElement | null;
    if (!row) return;
    const nr = this.sliderRow(SLIDER_BY_ID[id]);
    row.replaceWith(nr);
  }
  refreshRows() { for (const s of SLIDERS) this.refreshRow(s.id); if (this.tab === 'solutions') this.render(); }
  flashRow(id: string) {
    const row = this.root.querySelector(`.row[data-sid="${id}"]`) as HTMLElement | null;
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 1800);
  }

  // ───────────────────────────── solutions / scenes / book / stats
  private solutionsPane(pane: HTMLElement) {
    pane.append(h('div', 'intro', t('sol.intro')));
    const grid = h('div', 'card-grid');
    for (const s of SOLUTIONS) {
      const applied = Object.entries(s.set).every(([k, v]) => (this.ctx.sim.levels[k] ?? 0) <= v);
      const c = h('div', 'sol' + (applied ? ' done' : ''));
      c.innerHTML = `<div class="si">${s.icon}</div><b>${esc(L(s))}</b><p>${esc(LK(s.dEn, s.dKn))}</p>`;
      const act = h('div', 'act');
      const chips = Object.keys(s.set).map((k) => `<span class="chip">${SLIDER_BY_ID[k].icon} ${esc(L(SLIDER_BY_ID[k]))}</span>`).join('');
      if (!applied) {
        const b = h('button', 'btn primary', '▶ ' + t('sol.apply'));
        b.onclick = () => this.applySolution(s);
        act.append(b);
      } else {
        act.append(h('span', 'chip', t('sol.applied')));
        if (this.solPrev.has(s.id)) {
          const u = h('button', 'btn', '↩ ' + t('sol.undo'));
          u.onclick = () => { const prev = this.solPrev.get(s.id)!; for (const [k, v] of Object.entries(prev)) this.ctx.setLevel(k, v, true); this.solPrev.delete(s.id); this.render(); };
          act.append(u);
        }
      }
      act.append(h('span', 'chip', `${t('sol.who')}: ${s.who.join(', ')}`));
      const ch = h('div', 'chips', chips); ch.style.gridColumn = '2';
      c.append(act, ch);
      grid.append(c);
    }
    pane.append(grid);
  }

  applySolution(s: Solution) {
    const prev: Record<string, Level> = {};
    for (const k of Object.keys(s.set)) prev[k] = this.ctx.sim.levels[k] ?? 0;
    this.solPrev.set(s.id, prev);
    const before = this.ctx.score().est.total;
    for (const k of Object.keys(s.set)) this.ctx.sparkleSlider(k);
    setTimeout(() => {
      for (const [k, v] of Object.entries(s.set)) if ((this.ctx.sim.levels[k] ?? 0) > v) this.ctx.setLevel(k, v, true);
      const after = this.ctx.score().est.total;
      this.toast(`${s.icon} ${t('toast.applied', { name: L(s) })}  +${Math.max(0, Math.round(after - before))}`, 'good');
      this.render();
    }, 650);
  }

  private scenesPane(pane: HTMLElement) {
    pane.append(h('div', 'intro', t('sc.intro')));
    const grid = h('div', 'card-grid');
    for (const p of PRESETS) {
      const c = h('div', 'sol');
      c.innerHTML = `<div class="si">${p.icon}</div><b>${esc(L(p))}</b><p>${esc(LK(p.dEn, p.dKn))}</p>`;
      const act = h('div', 'act');
      const b = h('button', 'btn primary', '▶ ' + LK('Play', 'ಆಡಿ'));
      b.onclick = () => this.applyPreset(p);
      act.append(b);
      c.append(act);
      grid.append(c);
    }
    pane.append(grid);
  }

  applyPreset(p: Preset) {
    this.closeCard();
    const sim = this.ctx.sim;
    this.ctx.setLevels(p.levels());
    sim.setClock(p.clock);
    this.ctx.setRain(p.rain);
    this.ctx.setEvent(p.event);
    sim.env.surge = p.surge;
    this.ctx.flyTo(p.focus.x, p.focus.z, p.focus.dist, p.focus.dist > 900 ? 0.75 : 0.9);
    this.toast(`${p.icon} ${t('toast.preset', { name: L(p) })}`, 'gold');
    this.solPrev.clear();
    this.render();
  }

  private bookPane(pane: HTMLElement) {
    const q = h('input', 'search') as HTMLInputElement;
    q.placeholder = t('book.search'); q.value = this.bookQ;
    const list = h('div', '');
    const count = h('div', 'intro', '');
    const draw = () => {
      list.innerHTML = '';
      const qq = this.bookQ.toLowerCase();
      const items = ISSUES.filter((i) => (this.bookCat === 'all' || i.cat === this.bookCat) && (this.bookOwner === 'all' || i.owner === this.bookOwner)
        && (!qq || (i.en + ' ' + i.kn + ' ' + i.fixEn + ' ' + i.fixKn).toLowerCase().includes(qq)));
      count.textContent = t('book.count', { n: items.length });
      for (const i of items) {
        const el = h('div', 'issue');
        const sl = SLIDER_BY_ID[i.slider];
        el.innerHTML = `<div class="ih"><span class="id">#${i.id}</span><span class="t">${CATEGORIES[i.cat].icon} ${esc(L(i))}</span></div>
          <div class="fix">💡 ${esc(LK(i.fixEn, i.fixKn))}</div>
          <div class="meta"><span class="chip sev-${i.sev}">${t('book.sev')}: ${L(SEV_LABEL[i.sev])}</span><span class="chip">${t('book.freq')}: ${L(FREQ_LABEL[i.freq])}</span>
          <span class="chip">👷 ${esc(L(OWNERS[i.owner]))}</span>${i.ag.map((a: AgencyId) => `<span class="chip">🏛️ ${a}</span>`).join('')}</div>`;
        if (sl) {
          const acts = h('div', 'meta'); acts.style.marginTop = '6px';
          const go = h('button', 'mini eye', '🎚️ ' + t('book.goto') + ' · ' + sl.icon);
          go.onclick = () => { this.tab = 'issues'; this.closedCats.delete(sl.cat); this.render(); setTimeout(() => this.flashRow(sl.id), 50); };
          const pv = h('button', 'mini eye', '👁 ' + t('preview'));
          pv.onclick = () => this.preview(sl.id);
          acts.append(go, pv);
          el.append(acts);
        }
        list.append(el);
      }
    };
    q.oninput = () => { this.bookQ = q.value; draw(); };
    const fc = h('div', 'filters');
    const mk = (label: string, on: boolean, fn: () => void) => { const c = h('span', 'chip' + (on ? ' on' : ''), label); c.onclick = fn; return c; };
    fc.append(mk(t('book.all'), this.bookCat === 'all', () => { this.bookCat = 'all'; this.render(); }));
    for (const c of CAT_ORDER) fc.append(mk(CATEGORIES[c].icon + ' ' + L(CATEGORIES[c]), this.bookCat === c, () => { this.bookCat = c; this.render(); }));
    const fo = h('div', 'filters');
    fo.append(mk('👷 ' + t('book.all'), this.bookOwner === 'all', () => { this.bookOwner = 'all'; this.render(); }));
    for (const o of Object.keys(OWNERS) as OwnerId[]) fo.append(mk(L(OWNERS[o]), this.bookOwner === o, () => { this.bookOwner = o; this.render(); }));
    pane.append(q, fc, fo, count, list);
    draw();
  }

  private statsPane(pane: HTMLElement) {
    const sc = this.ctx.score();
    const m = this.ctx.sim.m;
    const bar = (label: string, v: number, est: number, meas: number) => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${label}</b><span>${Math.round(v)}</span></div>
      <div class="stress"><b style="width:${v}%;"></b></div><div style="font-size:11px;color:var(--muted);margin-top:2px">≈ ${Math.round(est)} · 📈 ${Math.round(meas)}</div></div>`;
    const depts = this.ctx.depts().slice().sort((a, b) => a.score - b.score);
    const gc = (g: string) => ({ A: '#22c55e', B: '#84cc16', C: '#facc15', D: '#f97316', F: '#ef4444' } as Record<string, string>)[g];
    const report = depts.map((d) => `<div class="dept" data-ag="${d.id}">
        <span class="gr" style="background:${gc(d.grade)}">${d.grade}</span>
        <div class="dm"><div class="dn"><b>${esc(L(AGENCIES[d.id]))}</b><span>${Math.round(d.score)}</span></div>
        <div class="stress"><b style="width:${d.score}%;background:${gc(d.grade)}"></b></div>
        <div class="chips" style="margin-top:4px">${d.open.length ? d.open.map((o) => `<span class="chip dept-open" data-sid="${o.slider}">${SLIDER_BY_ID[o.slider].icon} ${esc(L(SLIDER_BY_ID[o.slider]))}</span>`).join('') : `<span class="chip">${t('dept.allclear')}</span>`}</div></div></div>`).join('');
    pane.innerHTML = `<h4 style="margin:4px 0 2px">🏛️ ${t('dept.title')}</h4><div class="intro">${t('dept.note')}</div>${report}
      <div class="intro" style="margin-top:14px">${t('est.note')}</div>
      <h4 style="margin:6px 0">${t('stats.parts')}</h4>
      ${bar('🚗 ' + t('score.flow'), sc.final.flow, sc.est.flow, sc.meas.flow)}
      ${bar('🛡️ ' + t('score.safety'), sc.final.safety, sc.est.safety, sc.meas.safety)}
      ${bar('😌 ' + t('score.comfort'), sc.final.comfort, sc.est.comfort, sc.meas.comfort)}
      ${bar('🚶 ' + t('score.ped'), sc.final.ped, sc.est.ped, sc.meas.ped)}
      <h4 style="margin:12px 0 4px">${t('stats.today')}</h4>
      <div class="kv"><span>💥 ${t('stats.crashes')}</span><b>${m.totalAcc}</b><span>🚑 ${t('stats.injuries')}</span><b>${m.totalInj}</b><span>📢 ${t('stats.honks')}</span><b>${m.totalHonk.toLocaleString()}</b>
      <span>🚗 ${t('m.active')}</span><b>${m.active}</b><span>🧭 ${t('m.trips')}</span><b>${Math.round(m.tripsPerHr)}</b></div>
      ${getLang() === 'kn' ? `<div class="intro">ℹ️ ${t('kn.note')}</div>` : ''}`;
    pane.querySelectorAll('.dept-open').forEach((c) => ((c as HTMLElement).onclick = () => {
      const sid = (c as HTMLElement).dataset.sid!; this.tab = 'issues'; this.closedCats.delete(SLIDER_BY_ID[sid].cat); this.render(); setTimeout(() => this.flashRow(sid), 50);
    }));
  }

  /** Toast when a fix moves a department's grade noticeably. */
  deptChanged(before: DeptScore[], after: DeptScore[]) {
    const prev = new Map(before.map((d) => [d.id, d.score]));
    const moved = after.map((d) => ({ d, delta: d.score - (prev.get(d.id) ?? d.score) })).filter((x) => Math.abs(x.delta) >= 5).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    for (const m of moved.slice(0, 2)) this.toast(`🏛️ ${t('dept.toast', { name: m.d.id, d: (m.delta > 0 ? '+' : '') + Math.round(m.delta), g: m.d.grade })}`, m.delta > 0 ? 'good' : 'bad');
    if (this.tab === 'stats' && this.els.pane) { this.els.pane.innerHTML = ''; this.statsPane(this.els.pane); }
  }

  /** Called after Sim.reset(): forget UI-side state too. */
  resetState() {
    this.pv = null;
    this.closeCard(true); this.cardKind = null; this.cardData = null;
    this.solPrev.clear(); this.openInfo.clear(); this.lastMilestone = 0;
    this.shown = this.ctx.score().final.total;
    this.render();
    this.toast('↺ ' + t('reset.done'), 'gold');
  }

  // ───────────────────────────── right controls
  private rightBar() {
    const r = h('div', ''); r.id = 'right';
    const ctx = this.ctx;
    // mobile FABs
    const fabs = h('div', 'mob-only'); fabs.style.cssText = 'flex-direction:column;gap:8px;align-items:flex-end';
    const fCam = h('button', 'btn glass fab', '🎥');
    fCam.onclick = () => { const order: CamMode[] = ['tilt', 'top', 'follow', 'street']; const i = order.indexOf(ctx.rig.mode); const n = order[(i + 1) % order.length]; if (n === 'follow' || n === 'street') { if (!ctx.rig.follow) ctx.randomCar(); ctx.setCam(n); } else ctx.setCam(n); this.toast('🎥 ' + t(('cam.' + n) as Key)); };
    const fPlay = h('button', 'btn glass fab', ctx.speed === 0 ? '▶️' : '⏸️');
    fPlay.onclick = () => { ctx.setSpeed(ctx.speed === 0 ? 1 : 0); fPlay.textContent = ctx.speed === 0 ? '▶️' : '⏸️'; };
    const fSpeed = h('button', 'btn glass fab', '⏩');
    fSpeed.onclick = () => { const sp = [1, 2, 5]; const i = sp.indexOf(ctx.speed); ctx.setSpeed(sp[(i + 1) % sp.length]); this.toast('⏩ ' + ctx.speed + '×'); };
    const fMore = h('button', 'btn glass fab', '⚙️');
    fMore.onclick = () => r.classList.toggle('expanded');
    fabs.append(fCam, fPlay, fSpeed, fMore);

    const comp = h('div', 'box glass compass-box');
    comp.innerHTML = `<button class="mini" data-rot="-1" title="${t('rot.left')}">⟲</button>
      <button class="compass" title="${t('compass.north')}"><svg viewBox="-30 -30 60 60" id="rose">
        <circle r="27" fill="var(--chip)" stroke="var(--line)"/>
        <path d="M0 -22 L6 0 L0 4 L-6 0Z" fill="#ef4444"/><path d="M0 22 L6 0 L0 -4 L-6 0Z" fill="var(--muted)"/>
        <text y="-11" x="0" class="cn">N</text><text y="19" x="0" class="cd">S</text><text x="15" y="4" class="cd">E</text><text x="-15" y="4" class="cd">W</text>
      </svg></button>
      <button class="mini" data-rot="1" title="${t('rot.right')}">⟳</button>`;
    comp.querySelectorAll('[data-rot]').forEach((b) => ((b as HTMLElement).onclick = () => ctx.rotate(+(b as HTMLElement).dataset.rot!)));
    (comp.querySelector('.compass') as HTMLElement).onclick = () => ctx.northUp();
    const cam = h('div', 'box glass collapsible');
    cam.append(h('h6', '', '🎥 ' + LK('Camera', 'ಕ್ಯಾಮೆರಾ')));
    const cams = h('div', 'cams');
    for (const m of ['top', 'tilt', 'follow', 'street', 'cockpit'] as CamMode[]) {
      const b = h('button', 'btn' + (ctx.rig.mode === m ? ' on' : ''), { top: '🗺️ ', tilt: '🧊 ', follow: '🚗 ', street: '👀 ', cockpit: '🪑 ' }[m] + t(('cam.' + m) as Key));
      b.onclick = () => { if ((m === 'follow' || m === 'street' || m === 'cockpit') && !ctx.rig.follow) ctx.randomCar(); ctx.setCam(m); };
      b.dataset.cam = m;
      cams.append(b);
    }
    const reset = h('button', 'btn', '🌆 ' + t('cam.reset'));
    reset.onclick = () => ctx.resetView();
    cams.append(reset);
    cam.append(cams);
    this.els.cams = cams;

    const time = h('div', 'box glass collapsible');
    const clock = h('div', 'clock', `<span id="clk"></span><small id="clkd"></small>`);
    const speeds = h('div', 'speeds');
    for (const s of [0, 1, 2, 5, 10]) {
      const b = h('button', 'btn' + (ctx.speed === s ? ' on' : ''), s === 0 ? '⏸' : s + '×');
      b.dataset.sp = String(s);
      b.onclick = () => { ctx.setSpeed(s); speeds.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
      if (IS_MOBILE && s === 10) b.classList.add('hidden');
      speeds.append(b);
    }
    const range = h('input') as HTMLInputElement;
    range.type = 'range'; range.min = '0'; range.max = '1439'; range.step = '5';
    range.value = String(Math.round(ctx.sim.clockMin));
    range.oninput = () => ctx.sim.setClock(+range.value);
    this.els.range = range;
    time.append(h('h6', '', '⏰ ' + LK('Time', 'ಸಮಯ')), clock, speeds, range);

    const tog = h('div', 'box glass collapsible');
    const tg = h('div', 'toggles');
    const mkT = (icon: string, k: Key, on: () => boolean, fn: (b: boolean) => void) => {
      const b = h('button', 'btn' + (on() ? ' on' : ''), `${icon} ${t(k)}`);
      b.onclick = () => { fn(!on()); b.classList.toggle('on', on()); };
      return b;
    };
    tg.append(
      mkT('🌧️', 'tog.rain', () => ctx.sim.env.rain, (b) => ctx.setRain(b)),
      mkT('🏏', 'tog.event', () => ctx.sim.env.event, (b) => ctx.setEvent(b)),
      mkT('🚥', 'tog.overlay', () => ctx.overlay, (b) => ctx.setOverlay(b)),
      mkT('📍', 'tog.markers', () => ctx.markers, (b) => ctx.setMarkers(b)),
    );
    const qs = h('div', 'speeds'); qs.style.gridTemplateColumns = 'repeat(3,1fr)'; qs.style.marginTop = '6px';
    for (const q of ['low', 'med', 'high'] as const) {
      const b = h('button', 'btn' + (ctx.quality === q ? ' on' : ''), t(('q.' + q) as Key));
      b.onclick = () => { ctx.setQuality(q); qs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
      qs.append(b);
    }
    const vol = h('div', 'vol');
    const vr = h('input') as HTMLInputElement;
    vr.type = 'range'; vr.min = '30'; vr.max = '180'; vr.step = '10'; vr.value = String(Math.round(ctx.volume * 100));
    const vb = h('b', '', vr.value + '%');
    vr.oninput = () => { ctx.setVolume(+vr.value / 100); vb.textContent = vr.value + '%'; };
    vol.append(h('span', '', '🚗'), vr, vb);
    tog.append(h('h6', '', '🌦️ ' + LK('World', 'ಜಗತ್ತು')), tg, h('h6', '', '🚦 ' + t('vol.title')), vol, h('h6', '', '✨ ' + t('q.title')), qs);
    const leg = h('div', 'box glass collapsible desk-only');
    leg.innerHTML = `<h6>🚥 ${t('legend.title')}</h6><div class="legend"><span><i style="background:#22c55e"></i>${t('legend.free')}</span><span><i style="background:#facc15"></i>${t('legend.slow')}</span><span><i style="background:#f97316"></i>${t('legend.jam')}</span><span><i style="background:#dc2626"></i>${t('legend.stop')}</span></div>`;
    r.append(comp, fabs, cam, time, tog, leg);
    this.els.right = r;
    return r;
  }

  camChanged(m: CamMode) { this.els.cams?.querySelectorAll('button[data-cam]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.cam === m)); }

  // ───────────────────────────── cards
  closeCard(silent = false) {
    if (this.pv && !silent) this.endPreview();
    this.card?.remove();
    this.card = null;
    if (!silent) { this.cardKind = null; this.cardData = null; }
  }
  private openCard(kind: CardKind, data: any) {
    this.card?.remove();
    this.cardKind = kind; this.cardData = data;
    const c = h('div', 'card glass');
    this.card = c;
    this.root.append(c);
    this.syncSheet();
    this.fillCard();
  }
  private fillCard() {
    const c = this.card; if (!c) return;
    const kind = this.cardKind, d = this.cardData;
    const close = `<button class="mini" data-close>✕</button>`;
    if (kind === 'preview') {
      const s = SLIDER_BY_ID[d.id];
      const pv = this.pv!;
      const st = this.ctx.sim.localStats(pv.x, pv.z, 45);
      const iss = s.issues.map((id) => ISSUES.find((i) => i.id === id)!).filter(Boolean);
      const ags = [...new Set(iss.flatMap((i) => i.ag))];
      const notes: string[] = [];
      if (pv.ghost) notes.push(t('pv.ghost'));
      if (pv.clock !== undefined) notes.push(t('pv.night'));
      if (pv.rain !== undefined) notes.push(t('pv.rain'));
      if (!s.spot || s.id === 'enforcement' || s.id === 'demand' || s.id === 'haze') notes.push(t('pv.global'));
      c.innerHTML = `<div class="ch"><span class="big">${s.icon}</span><h3>${esc(L(s))}<small>👁 ${t('pv.title')}</small></h3>${close}</div>
        <p>${esc(LK(s.dEn, s.dKn))}</p>
        ${notes.map((n) => `<div class="note">ℹ️ ${esc(n)}</div>`).join('')}
        <div class="live"><span class="chip">📍 ${t('pv.live')}</span><span class="chip" id="pv-kmh">🚗 ${st.kmh.toFixed(0)} km/h</span><span class="chip">🚦 ${st.n} ${t('m.active')}</span></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted)">${t('pv.before')}:</span>
          <div class="switch"><button data-pv="on" class="${pv.on ? 'on bad' : ''}">⚠️ ${t('pv.on')}</button><button data-pv="off" class="${!pv.on ? 'on good' : ''}">✅ ${t('pv.off')}</button></div></div>
        <div class="pv-extra"><p style="margin-bottom:4px"><b style="color:var(--text)">${t('who')}:</b></p>
        <div class="chips">${ags.map((a) => `<span class="chip">🏛️ ${esc(L(AGENCIES[a]))}</span>`).join('')}</div>
        <p style="margin:8px 0 0">💡 ${iss.slice(0, 2).map((i) => esc(LK(i.fixEn, i.fixKn))).join(' · ')}</p></div>
        <div class="acts"><button class="btn" data-another>🎲 ${t('pv.another')}</button><button class="btn" data-nextiss>⏭ ${t('pv.next')}</button>
        <button class="btn primary" data-fixall>✅ ${t('pv.fixall')}</button><button class="btn" data-details>ⓘ ${t('info')}</button></div>`;
      (c.querySelector('[data-another]') as HTMLElement).onclick = () => this.anotherSpot();
      (c.querySelector('[data-nextiss]') as HTMLElement).onclick = () => this.nextIssue(1);
      c.querySelectorAll('[data-pv]').forEach((b) => ((b as HTMLElement).onclick = () => this.togglePreview((b as HTMLElement).dataset.pv === 'on')));
      (c.querySelector('[data-fixall]') as HTMLElement).onclick = () => {
        const id = pv.id;
        this.pv!.prev = 0;
        this.ctx.setLevel(id, 0);
        this.ctx.celebrate(pv.x, pv.z, t('hz.fixed'));
        this.closeCard();
        this.refreshRow(id);
      };
      (c.querySelector('[data-details]') as HTMLElement).onclick = () => { this.openInfo.add(d.id); this.tab = 'issues'; this.closedCats.delete(s.cat); if (this.sheet === 'peek') this.sheet = 'half'; const keep = this.pv; this.render(); this.pv = keep; setTimeout(() => this.flashRow(d.id), 60); };
    } else if (kind === 'hazard') {
      const hz: Hazard = d.h;
      const s = SLIDER_BY_ID[hz.slider];
      const road = hz.link >= 0 ? L(this.ctx.sim.net.links[hz.link].road) : L(this.ctx.sim.net.nodes[hz.node].def);
      const iss = s.issues.map((id) => ISSUES.find((i) => i.id === id)!).filter(Boolean);
      const ags = [...new Set(iss.flatMap((i) => i.ag))];
      c.innerHTML = `<div class="ch"><span class="big">${s.icon}</span><h3>${esc(L(s))}<small>📍 ${esc(road)}${hz.sev > 1 ? ' · ⚠️×' + hz.sev : ''}</small></h3>${close}</div>
        <p>${esc(LK(s.dEn, s.dKn))}</p>
        <div class="chips">${ags.map((a) => `<span class="chip">🏛️ ${esc(L(AGENCIES[a]))}</span>`).join('')}</div>
        <p style="margin:8px 0 0">💡 ${esc(LK(iss[0].fixEn, iss[0].fixKn))}</p>
        ${this.localBodyLine(hz.x, hz.z)}
        <div class="acts"><button class="btn primary" data-fix>✅ ${t('hz.fix')}</button><button class="btn danger" data-worse>⚠️ ${t('hz.worse')}</button><button class="btn" data-pv>👁 ${t('hz.watch')}</button></div>`;
      const wb = c.querySelector('[data-where]') as HTMLElement | null;
      if (wb) wb.onclick = () => this.showWhere(wb.dataset.where!);
      (c.querySelector('[data-fix]') as HTMLElement).onclick = () => { this.ctx.fixHazard(hz); this.closeCard(); this.refreshRow(hz.slider); };
      (c.querySelector('[data-worse]') as HTMLElement).onclick = () => { this.ctx.worsenHazard(hz); this.refreshRow(hz.slider); this.fillCard(); };
      (c.querySelector('[data-pv]') as HTMLElement).onclick = () => this.ctx.flyTo(hz.x, hz.z, 55, 0.95);
    } else if (kind === 'agent') {
      const a: Agent = this.ctx.sim.agents[d.id];
      if (!a.active) { this.closeCard(); return; }
      const following = this.ctx.rig.follow === a;
      const traits = TRAIT_SLIDER.filter(([bit]) => a.traits & bit).map(([bit, sl]) => `<span class="chip">${SLIDER_BY_ID[sl].icon} ${t(traitKey(bit))}</span>`);
      let state = '';
      const crash = a.crash >= 0 ? this.ctx.sim.crashes.find((x) => x.id === a.crash) : undefined;
      if (a.state === S.CRASHED) state = `💥 ${t('v.crashed')} — ${crash?.injured && crash.arrived < 0 ? t('v.waitamb') : t('v.minor')}`;
      else if (a.state === S.BROKEN) state = `🛠️ ${t('v.broken')}`;
      else if (a.state === S.DWELL) state = `🛑 ${t('v.dwell')}`;
      const em = a.stress < 0.25 ? '😌' : a.stress < 0.5 ? '😐' : a.stress < 0.75 ? '😠' : '🤬';
      const ic = ['🛵', '🛺', '🚗', '🚌', '🚛', '🚚', '🚜', '🚑', '🚗'][a.type];
      c.innerHTML = `<div class="ch"><span class="big">${ic}</span><h3>${t(('vt.' + a.type) as Key)}<small>${esc(L(this.ctx.sim.net.links[a.link].road))}</small></h3>${close}</div>
        ${state ? `<div class="note">${state}</div>` : ''}
        <div class="kv"><span>${t('v.speed')}</span><b id="ag-sp">${(a.v * 3.6).toFixed(0)} km/h</b><span>${t('v.stress')}</span><span style="display:flex;gap:6px;align-items:center"><span id="ag-em">${em}</span><span class="stress"><b id="ag-st" style="width:${(a.stress * 100).toFixed(0)}%"></b></span></span>
        <span>${t('v.trip')}</span><b id="ag-age">${Math.round((a.age * 10) / 60)} min</b></div>
        <div class="chips">${traits.length ? traits.join('') : `<span class="chip">${t('v.fine')}</span>`}</div>
        <div class="acts">
          ${following ? `<button class="btn" data-unf>⏹ ${t('v.unfollow')}</button><button class="btn" data-street>👀 ${t('cam.street')}</button><button class="btn" data-seat>🪑 ${t('cam.cockpit')}</button><button class="btn" data-next>🔁 ${t('v.next')}</button>` : `<button class="btn primary" data-follow>🎥 ${t('v.follow')}</button>`}
          ${traits.length && !a.fixed ? `<button class="btn primary" data-fixd>😇 ${t('v.fix')}</button>` : ''}
          ${a.state === S.BROKEN ? `<button class="btn primary" data-tow>🛻 ${t('v.tow')}</button>` : ''}
          ${a.state === S.CRASHED && crash ? `<button class="btn primary" data-clear>🚑 ${t('v.clear')}</button>` : ''}
        </div>`;
      const on = (sel: string, fn: () => void) => { const e = c.querySelector(sel) as HTMLElement | null; if (e) e.onclick = fn; };
      on('[data-follow]', () => { this.ctx.follow(a.id, 'follow'); this.fillCard(); });
      on('[data-unf]', () => { this.ctx.follow(null); this.fillCard(); });
      on('[data-street]', () => { this.ctx.follow(a.id, this.ctx.rig.mode === 'street' ? 'follow' : 'street'); });
      on('[data-next]', () => { this.ctx.randomCar(); });
      on('[data-seat]', () => { this.ctx.follow(a.id, 'cockpit'); });
      on('[data-fixd]', () => { this.ctx.fixAgent(a); this.fillCard(); });
      on('[data-tow]', () => { this.ctx.towAgent(a); this.closeCard(); });
      on('[data-clear]', () => { if (crash) this.ctx.clearCrash(crash); this.closeCard(); });
    } else if (kind === 'rider') {
      const r = this.ctx.sim.riders.find((x) => x.id === d.id);
      if (!r) { this.closeCard(); return; }
      const s = SLIDER_BY_ID.wrongWay;
      c.innerHTML = `<div class="ch"><span class="big">⛔</span><h3>${t('rider.title')}<small>${esc(L(this.ctx.sim.net.links[r.link].road))}</small></h3>${close}</div>
        <p>${t('rider.desc')}</p><p style="margin:4px 0">💡 ${esc(LK(ISSUES[22].fixEn, ISSUES[22].fixKn))}</p>
        <div class="acts"><button class="btn primary" data-fix>👮 ${t('rider.fix')}</button><button class="btn danger" data-worse>⚠️ ${t('rider.worse')}</button><button class="btn" data-pv>👁 ${t('preview')} ${s.icon}</button></div>`;
      (c.querySelector('[data-fix]') as HTMLElement).onclick = () => { this.ctx.removeRider(r.id); this.closeCard(); };
      (c.querySelector('[data-worse]') as HTMLElement).onclick = () => { this.ctx.moreRiders(r); };
      (c.querySelector('[data-pv]') as HTMLElement).onclick = () => this.preview('wrongWay');
    } else if (kind === 'where') {
      c.innerHTML = this.whereHTML(d.area);
    } else if (kind === 'ped') {
      const p: Ped | undefined = this.ctx.sim.peds.find((x) => x.id === d.id);
      if (!p) { this.closeCard(); return; }
      const sl = p.kind === 3 ? 'animals' : p.kind === 1 ? 'footpaths' : 'crossings';
      const s = SLIDER_BY_ID[sl];
      const title = p.kind === 3 ? t('cow.title') : p.kind === 1 ? t('walker.title') : t('ped.title');
      c.innerHTML = `<div class="ch"><span class="big">${p.kind === 3 ? '🐄' : '🚶'}</span><h3>${title}<small>${esc(L(this.ctx.sim.net.links[p.link].road))}</small></h3>${close}</div>
        <p>${p.kind === 0 ? t('ped.desc') : esc(LK(s.dEn, s.dKn))}</p>
        <div class="acts"><button class="btn primary" data-fix>✅ ${t('ped.fix')}</button><button class="btn" data-pv>👁 ${t('preview')} ${s.icon}</button></div>`;
      (c.querySelector('[data-fix]') as HTMLElement).onclick = () => { this.ctx.removePed(p); this.closeCard(); };
      (c.querySelector('[data-pv]') as HTMLElement).onclick = () => this.preview(sl);
    }
    const cl = c.querySelector('[data-close]') as HTMLElement | null;
    if (cl) cl.onclick = () => { if (this.cardKind === 'agent' && this.ctx.rig.follow) this.ctx.follow(null); this.closeCard(); };
  }

  // ───────────────────────────── accountability
  private whereArea = '';
  /** Nearest named area to a point (for "who's in charge here"). */
  areaAt(x: number, z: number) {
    let best = AREAS[0], bd = 1e9;
    for (const a of AREAS) { const d = Math.hypot(a.x - x, a.z - z) / a.r; if (d < bd) { bd = d; best = a; } }
    return best;
  }
  setWhere(x: number, z: number, camDist: number) {
    const el = document.getElementById('where');
    if (!el) return;
    if (camDist > 1000) { el.classList.add('hidden'); return; }
    const a = this.areaAt(x, z);
    el.classList.remove('hidden');
    if (a.id === this.whereArea && el.innerHTML) return;
    this.whereArea = a.id;
    const corp = CORPS[AREA_CORP[a.id] ?? 'outside'];
    el.innerHTML = `📍 <b>${esc(L(a))}</b> <span>· ${esc(L(corp).replace('City Corporation', '').replace('ನಗರ ಪಾಲಿಕೆ', ''))} · ${t('where.who')}</span>`;
  }
  private localBodyLine(x: number, z: number) {
    const a = this.areaAt(x, z);
    const corp = CORPS[AREA_CORP[a.id] ?? 'outside'];
    return `<p style="margin:6px 0 0">🏛️ ${esc(L(a))}: <b style="color:var(--text)">${esc(L(corp))}</b>${corp.head ? ` — ${esc(corp.head.name)}` : ''} <button class="mini eye" data-where="${a.id}">📞 ${t('where.who')}</button></p>`;
  }
  private whereHTML(areaId: string) {
    const a = AREAS.find((x) => x.id === areaId) ?? AREAS[0];
    const corp = CORPS[AREA_CORP[a.id] ?? 'outside'];
    const head = corp.head ? `<div class="kv"><span>${LK(corp.head.roleEn, corp.head.roleKn)}</span><b>${esc(corp.head.name)}</b>
        <span>${t('where.asof')}</span><span>${corp.head.asOf} · <a href="${corp.head.source}" target="_blank" rel="noopener">${t('where.source')}</a></span></div>` : '';
    return `<div class="ch"><span class="big">🏛️</span><h3>${esc(L(a))}<small>${esc(L(corp))}</small></h3><button class="mini" data-close>✕</button></div>
      ${head}
      ${corp.noteEn ? `<p>${esc(LK(corp.noteEn, corp.noteKn!))}</p>` : ''}
      <p style="margin:6px 0 4px"><b style="color:var(--text)">${t('where.contacts')}</b></p>
      <div class="contacts">${CONTACTS.map((c) => `<a class="chip" href="${c.href}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${c.icon} ${esc(LK(c.en, c.kn))}: <b>${c.value}</b></a>`).join('')}</div>
      <div class="note">ℹ️ ${t('where.caveat')}</div>`;
  }
  showWhere(areaId: string) { this.closeCard(); if (IS_MOBILE) this.sheet = 'peek'; this.openCard('where', { area: areaId }); }

  showHazard(hz: Hazard) { this.closeCard(); if (IS_MOBILE) this.sheet = 'peek'; this.openCard('hazard', { h: hz }); }
  showAgent(id: number) { this.closeCard(); if (IS_MOBILE) this.sheet = 'peek'; this.openCard('agent', { id }); }
  showRider(id: number) { this.closeCard(); this.openCard('rider', { id }); }
  showPed(id: number) { this.closeCard(); this.openCard('ped', { id }); }
  refreshAgentCard() { if (this.cardKind === 'agent') this.fillCard(); }

  // ───────────────────────────── preview
  /** Same issue, somewhere else on the map. */
  anotherSpot() {
    const pv = this.pv; if (!pv) return;
    const sim = this.ctx.sim, s = SLIDER_BY_ID[pv.id];
    if (pv.prev === 0) { sim.haz.clearGhosts(); sim.haz.addGhost(pv.id, sim.t, true); if (pv.id === 'footpaths') sim.haz.addGhost('footpathsLinks', sim.t, true); }
    const r = sim.randomSpot(pv.id);
    const l = sim.net.links[r.link];
    const p = sim.net.pose(l, r.s, l.halfW * 0.5);
    sim.demo(pv.id, r.link, r.s);
    pv.x = p.x; pv.z = p.z;
    this.ctx.flyTo(p.x, p.z, s.zoom && s.zoom > 150 ? s.zoom : 62, s.zoom && s.zoom > 150 ? 0.8 : 0.98, Math.atan2(-p.dx, -p.dz) + 0.65);
    sim.onLevels?.();
    this.fillCard();
  }
  /** Preview the next (or previous) issue in the list. */
  nextIssue(dir: number) {
    const cur = this.pv?.id ?? SLIDERS[0].id;
    const i = SLIDERS.findIndex((s) => s.id === cur);
    const n = SLIDERS[(i + dir + SLIDERS.length) % SLIDERS.length];
    this.closeCard();
    this.preview(n.id);
  }
  previewKey(k: string) {
    if (this.cardKind !== 'preview') return false;
    if (k === 'n' || k === 'N') { this.anotherSpot(); return true; }
    if (k === 'ArrowRight') { this.nextIssue(1); return true; }
    if (k === 'ArrowLeft') { this.nextIssue(-1); return true; }
    return false;
  }

  preview(id: string) {
    const s = SLIDER_BY_ID[id];
    this.closeCard();
    const sim = this.ctx.sim;
    const sp = this.ctx.spot(id);
    const pv: NonNullable<UI['pv']> = { id, prev: (sim.levels[id] ?? 0) as Level, ghost: false, on: true, x: sp?.x ?? 60, z: sp?.z ?? 40 };
    if (s.night && sim.dark < 0.5) { pv.clock = sim.clockMin; sim.setClock(21 * 60 + 15); }
    if (s.rain && !sim.env.rain) { pv.rain = false; this.ctx.setRain(true); }
    if (pv.prev === 0) {
      if (sim.haz.addGhost(id, sim.t) || (id === 'footpaths' && sim.haz.addGhost('footpathsLinks', sim.t))) pv.ghost = true;
      else pv.ghost = true; // behaviour demos are injected below
    }
    sim.demo(id);
    if (this.ctx.speed === 0 || this.ctx.speed > 2) this.ctx.setSpeed(1);
    if (sp) {
      const az = Math.atan2(-sp.dx, -sp.dz) + 0.65;
      this.ctx.flyTo(sp.x, sp.z, s.zoom ?? 62, s.zoom && s.zoom > 150 ? 0.8 : 0.98, az);
    }
    this.pv = pv;
    if (IS_MOBILE) this.sheet = 'peek';
    this.openCard('preview', { id });
    sim.onLevels?.();
  }
  private togglePreview(on: boolean) {
    const pv = this.pv; if (!pv) return;
    pv.on = on;
    const sim = this.ctx.sim;
    if (pv.prev > 0) this.ctx.setLevel(pv.id, on ? pv.prev : 0, true);
    else {
      if (on) { sim.haz.addGhost(pv.id, sim.t); sim.demo(pv.id); }
      else { sim.haz.clearGhosts(); if (pv.id === 'wrongWay') sim.fitRiders(); }
      sim.onLevels?.();
    }
    this.refreshRow(pv.id);
    this.fillCard();
  }
  private endPreview() {
    const pv = this.pv; if (!pv) return;
    this.pv = null;
    const sim = this.ctx.sim;
    sim.haz.clearGhosts();
    if ((sim.levels[pv.id] ?? 0) !== pv.prev) this.ctx.setLevel(pv.id, pv.prev, true);
    if (pv.prev === 0 && pv.id === 'wrongWay') sim.fitRiders();
    if (pv.clock !== undefined) sim.setClock(pv.clock);
    if (pv.rain !== undefined) this.ctx.setRain(pv.rain);
    sim.onLevels?.();
    this.refreshRow(pv.id);
  }

  // ───────────────────────────── feedback
  toast(msg: string, kind: '' | 'good' | 'bad' | 'gold' = '', onClick?: () => void) {
    const el = h('div', 'toast ' + kind + (onClick ? ' clickable' : ''), esc(msg) + (onClick ? ' <b class="go">📍 ' + t('toast.go') + '</b>' : ''));
    if (onClick) el.onclick = () => { onClick(); el.remove(); };
    this.els.toasts.append(el);
    setTimeout(() => el.remove(), onClick ? 6500 : 3300);
    while (this.els.toasts.children.length > 3) this.els.toasts.firstElementChild?.remove();
  }
  confetti() {
    const cols = ['#ffd400', '#22c55e', '#ef4444', '#38bdf8', '#a855f7', '#f97316'];
    for (let i = 0; i < 90; i++) {
      const c = h('div', 'confetti');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = 2 + Math.random() * 2 + 's';
      c.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.append(c);
      setTimeout(() => c.remove(), 4800);
    }
  }
  delta(d: number) {
    const el = document.getElementById('sdelta');
    if (!el || Math.abs(d) < 0.5) return;
    el.textContent = (d > 0 ? '▲ +' : '▼ ') + Math.round(d);
    el.className = 'delta show ' + (d > 0 ? 'up' : 'down');
    clearTimeout((el as any)._t);
    (el as any)._t = setTimeout(() => (el.className = 'delta'), 2400);
    if (d >= 3) this.toast(t('toast.up', { n: Math.round(d) }), 'good');
    else if (d <= -3) this.toast(t('toast.down', { n: Math.round(-d) }), 'bad');
  }
  flyout(txt: string, color = '#ff6b6b') {
    const target = document.getElementById('m-acc');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const f = h('div', 'flyout', txt);
    f.style.left = r.left + 'px'; f.style.top = r.top - 6 + 'px'; f.style.color = color;
    document.body.append(f);
    setTimeout(() => f.remove(), 1300);
  }

  help() {
    const bg = h('div', 'modal-bg');
    const m = h('div', 'modal glass');
    m.innerHTML = `<h2>🛺 ${t('help.title')}</h2><p>${t('help.body')}</p>
      <ul><li>🖱️ ${t('help.t1')}</li><li>${t('help.t2')}</li><li>👆 ${t('help.t3')}</li><li>🛠️ ${t('help.t4')}</li></ul>
      <div class="row2"><div style="display:flex;gap:6px;align-items:center"><span style="color:var(--muted);font-size:13px">${t('help.lang')}:</span><button class="btn ${getLang() === 'en' ? 'on' : ''}" data-l="en">English</button><button class="btn ${getLang() === 'kn' ? 'on' : ''}" data-l="kn">ಕನ್ನಡ</button></div>
      <button class="btn primary" data-go>🚀 ${t('help.go')}</button></div>`;
    bg.append(m);
    document.body.append(bg);
    const close = () => { bg.remove(); try { localStorage.setItem('nr.seen', '1'); } catch { /* ignore */ } };
    bg.onclick = (e) => { if (e.target === bg) close(); };
    (m.querySelector('[data-go]') as HTMLElement).onclick = close;
    m.querySelectorAll('[data-l]').forEach((b) => ((b as HTMLElement).onclick = () => { setLang((b as HTMLElement).dataset.l as any); close(); this.help(); }));
  }

  // ───────────────────────────── per-frame
  tick(dt: number) {
    this.tickT += dt; this.liveT += dt;
    const rose = document.getElementById('rose');
    if (rose) rose.style.transform = `rotate(${(this.ctx.azimuth() * 180) / Math.PI}deg)`;
    this.updateScore(false, dt);
    if (this.tickT > 0.5) {
      this.tickT = 0;
      this.updateMetrics();
      const clk = document.getElementById('clk'), clkd = document.getElementById('clkd');
      if (clk) clk.innerHTML = fmtClock(this.ctx.sim.clockMin);
      if (clkd) clkd.textContent = (this.ctx.sim.dark > 0.5 ? '🌙 ' + t('night') : '☀️ ' + t('day')) + (this.ctx.sim.env.rain ? ' · 🌧️' : '');
      const rg = this.els.range as HTMLInputElement | undefined;
      if (rg && document.activeElement !== rg) rg.value = String(Math.round(this.ctx.sim.clockMin));
    }
    if (this.liveT > 0.6 && this.card) {
      this.liveT = 0;
      if (this.cardKind === 'preview' && this.pv) {
        const st = this.ctx.sim.localStats(this.pv.x, this.pv.z, 45);
        const e = document.getElementById('pv-kmh');
        if (e) e.textContent = `🚗 ${st.kmh.toFixed(0)} km/h`;
      } else if (this.cardKind === 'agent') {
        const a = this.ctx.sim.agents[this.cardData.id];
        if (!a.active) { this.closeCard(); return; }
        const sp = document.getElementById('ag-sp'), st = document.getElementById('ag-st'), em = document.getElementById('ag-em'), ag = document.getElementById('ag-age');
        if (sp) sp.textContent = (a.v * 3.6).toFixed(0) + ' km/h';
        if (st) st.style.width = (a.stress * 100).toFixed(0) + '%';
        if (em) em.textContent = a.stress < 0.25 ? '😌' : a.stress < 0.5 ? '😐' : a.stress < 0.75 ? '😠' : '🤬';
        if (ag) ag.textContent = Math.round((a.age * 10) / 60) + ' min';
      }
    }
  }

  private updateScore(force: boolean, dt = 0.016) {
    const sc = this.ctx.score().final;
    const target = sc.total;
    this.shown += (target - this.shown) * (force ? 1 : Math.min(1, dt * 3));
    const v = Math.max(0, Math.min(100, this.shown));
    const num = document.getElementById('snum');
    if (!num) return;
    num.textContent = String(Math.round(v));
    document.getElementById('garc')?.setAttribute('stroke-dasharray', `${v} 100`);
    const needle = document.getElementById('gneedle');
    if (needle) needle.style.transform = `rotate(${-90 + v * 1.8}deg)`;
    const g = grade(v);
    const ge = document.getElementById('sgrade'), em = document.getElementById('semo');
    if (ge) ge.textContent = t(g.key as Key);
    if (em) em.textContent = g.emoji;
    const parts = { flow: sc.flow, safety: sc.safety, comfort: sc.comfort, ped: sc.ped };
    for (const [k, val] of Object.entries(parts)) {
      const b = document.getElementById('sp-' + k);
      if (b) { b.style.width = Math.round(val) + '%'; b.style.background = val > 70 ? '#22c55e' : val > 45 ? '#facc15' : val > 25 ? '#f97316' : '#ef4444'; }
    }
    // milestones
    for (const [mark, key] of [[50, 'toast.m50'], [70, 'toast.m70'], [85, 'toast.m85']] as const) {
      if (v >= mark && this.lastMilestone < mark && !force) { this.lastMilestone = mark; this.toast(t(key), 'gold'); this.confetti(); }
    }
    if (v < this.lastMilestone - 8) this.lastMilestone = [0, 50, 70, 85].filter((x) => x <= v).pop() ?? 0;
  }

  private updateMetrics() {
    const m = this.ctx.sim.m;
    const set = (id: string, v: string, cls = '') => { const e = document.getElementById('m-' + id); if (e) { e.textContent = v; e.parentElement!.className = 'metric glass ' + cls + (e.parentElement!.classList.contains('opt') ? ' opt' : ''); } };
    set('kmh', m.kmh.toFixed(0), m.kmh > 22 ? 'good' : m.kmh < 13 ? 'bad' : '');
    set('acc', m.accPerHr.toFixed(0), m.accPerHr > 10 ? 'bad' : m.accPerHr < 3 ? 'good' : '');
    set('inj', m.injPerHr.toFixed(0), m.injPerHr > 4 ? 'bad' : '');
    set('honk', Math.round(m.honkPerMin).toLocaleString(), m.honkPerMin > 800 ? 'bad' : m.honkPerMin < 150 ? 'good' : '');
    set('stress', Math.round(m.stress * 100) + '%', m.stress > 0.55 ? 'bad' : m.stress < 0.35 ? 'good' : '');
    set('ped', m.pedPerHr.toFixed(0), m.pedPerHr > 80 ? 'bad' : '');
    set('resp', m.respMin ? m.respMin.toFixed(0) : '–', m.respMin > 12 ? 'bad' : '');
    if (this.tab === 'stats' && this.els.pane && Math.random() < 0.3) { this.els.pane.innerHTML = ''; this.statsPane(this.els.pane); }
  }
}

function traitKey(bit: number): Key {
  const map: Record<number, Key> = {
    [T.JUMP]: 'tr.jump', [T.PHONE]: 'tr.phone', [T.WEAVE]: 'tr.weave', [T.TAIL]: 'tr.tail', [T.SUDDEN]: 'tr.sudden', [T.HONKER]: 'tr.honker',
    [T.FPRIDE]: 'tr.fpride', [T.STOPPER]: 'tr.stopper', [T.SPEEDER]: 'tr.speeder', [T.DRUNK]: 'tr.drunk', [T.NOLIGHT]: 'tr.nolight', [T.GLARE]: 'tr.glare',
    [T.NOHELMET]: 'tr.nohelmet', [T.NOBELT]: 'tr.nobelt', [T.CARGO]: 'tr.cargo',
  };
  return map[bit];
}
export { VT };
