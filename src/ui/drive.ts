import { L, t, type Key } from '../i18n/i18n';
import type { Agent, Sim } from '../sim/sim';
import { IS_MOBILE } from '../world/scene';

/** Lane-based self-drive: keyboard + on-screen pad + small HUD. */
export class DriveUI {
  car: Agent | null = null;
  private hud: HTMLDivElement | null = null;
  private pad: HTMLDivElement | null = null;
  private warnT = 0;

  constructor(private sim: Sim, private hooks: { toast(m: string, k?: '' | 'good' | 'bad' | 'gold'): void; cycleCam(): void; autopilot(): void; beep(): void }) {
    window.addEventListener('keydown', (e) => this.key(e, true), true);
    window.addEventListener('keyup', (e) => this.key(e, false), true);
    sim.onManualEvent = (k) => {
      if (k === 'redlight') { this.warn(t('drive.red')); hooks.beep(); }
      if (k === 'blocked') this.warn(t('drive.blocked'));
    };
  }

  get active() { return !!this.car && this.car.active && this.car.manual; }

  start(a: Agent) {
    this.car = a;
    a.manual = true;
    this.sim.input.up = this.sim.input.down = false; this.sim.input.turn = 0;
    this.show();
  }
  stop() {
    if (this.car) this.car.manual = false;
    this.car = null;
    this.sim.input.up = this.sim.input.down = false;
    this.hud?.remove(); this.hud = null; this.pad?.remove(); this.pad = null;
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (!this.active) return;
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) { e.preventDefault(); e.stopPropagation(); }
    if (k === 'ArrowUp' || k === 'w') this.sim.input.up = down;
    else if (k === 'ArrowDown' || k === 's') this.sim.input.down = down;
    else if (down && (k === 'ArrowLeft' || k === 'a')) this.steer(-1);
    else if (down && (k === 'ArrowRight' || k === 'd')) this.steer(1);
    else if (down && (k === 'c' || k === 'C')) this.hooks.cycleCam();
    else if (down && k === 'Escape') { e.stopPropagation(); this.hooks.autopilot(); }
  }

  /** Mid-block: change lane. Near a junction: choose the turn (pressing again returns to straight). */
  steer(dir: number) {
    const a = this.car; if (!a) return;
    const l = this.sim.net.links[a.link];
    const nearJunction = a.state === 1 || l.len - a.s < 50 || l.nLanes === 1;
    if (nearJunction) this.sim.input.turn = this.sim.input.turn === dir ? 0 : dir;
    else this.sim.manualLane(a, dir);
    this.update();
  }

  private warn(m: string) { this.warnT = 2.5; const w = this.hud?.querySelector('.dw') as HTMLElement | null; if (w) { w.textContent = m; w.style.opacity = '1'; } }

  private show() {
    this.hud?.remove();
    const h = document.createElement('div');
    h.className = 'drive-hud glass';
    h.innerHTML = `<div class="dturn"><span data-t="-1">◀</span><span data-t="0">▲</span><span data-t="1">▶</span></div><div class="dnext"></div><div class="dw"></div>
      <div class="dhelp desk-only">${t('drive.help')}</div>`;
    document.getElementById('ui')!.append(h);
    this.hud = h;
    if (IS_MOBILE || 'ontouchstart' in window) {
      this.pad?.remove();
      const p = document.createElement('div');
      p.className = 'drive-pad';
      p.innerHTML = `<div class="dp-l"><button data-k="L">◀</button><button data-k="R">▶</button></div><div class="dp-r"><button data-k="B" class="brake">▼</button><button data-k="G" class="gas">▲</button></div>`;
      const press = (k: string, on: boolean) => {
        if (k === 'G') this.sim.input.up = on;
        if (k === 'B') this.sim.input.down = on;
        if (on && k === 'L') this.steer(-1);
        if (on && k === 'R') this.steer(1);
      };
      p.querySelectorAll('button').forEach((b) => {
        const k = (b as HTMLElement).dataset.k!;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); press(k, true); });
        for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { b.classList.remove('on'); press(k, false); });
      });
      document.getElementById('ui')!.append(p);
      this.pad = p;
    }
    this.update();
  }

  /** Call a few times a second. */
  update(dt = 0) {
    const a = this.car, h = this.hud;
    if (!a || !h) return;
    if (!a.active) { this.stop(); return; }
    h.querySelectorAll('[data-t]').forEach((s) => s.classList.toggle('on', +(s as HTMLElement).dataset.t! === this.sim.input.turn));
    const nx = h.querySelector('.dnext') as HTMLElement;
    const nl = a.next >= 0 ? this.sim.net.links[a.next] : null;
    const dirKey: Key = this.sim.input.turn < 0 ? 'drive.left' : this.sim.input.turn > 0 ? 'drive.right' : 'drive.straight';
    nx.textContent = `${t('drive.next')}: ${t(dirKey)}${nl ? ' → ' + L(nl.road) : ''}`;
    if (dt) { this.warnT -= dt; if (this.warnT <= 0) (h.querySelector('.dw') as HTMLElement).style.opacity = '0'; }
  }
}
