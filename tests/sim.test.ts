import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';
import { defaultLevels, zeroLevels } from '../src/data/sliders';
import { estimate, measured, blend } from '../src/sim/score';

function run(levels: any, secs: number, opts: { rain?: boolean; clock?: number } = {}) {
  const sim = new Sim({ count: 1700 });
  sim.setLevels(levels);
  if (opts.rain) sim.setRain(true);
  sim.setClock(opts.clock ?? 9 * 60);
  const t0 = performance.now();
  for (let i = 0; i < secs * 10; i++) sim.step(0.1);
  const ms = performance.now() - t0;
  const noFoot = sim.net.links.filter((l) => l.noFoot).length / sim.net.links.length;
  const est = estimate(sim.levels, { dark: sim.dark, rain: sim.env.rain });
  const meas = measured(sim.m, noFoot);
  return { sim, est, meas, final: blend(est, meas, 1), ms };
}

describe('simulation calibration', () => {
  it('runs headless and produces sane metrics', () => {
    for (const [name, lv] of [['today', defaultLevels()], ['dream', zeroLevels()]] as const) {
      const r = run(lv, 300);
      const m = r.sim.m;
      console.log(name, JSON.stringify({ ms: Math.round(r.ms), active: m.active, kmh: m.kmh.toFixed(1), ratio: m.speedRatio.toFixed(2), acc: m.accPerHr.toFixed(1), inj: m.injPerHr.toFixed(1), near: m.nearPerHr.toFixed(0), ped: m.pedPerHr.toFixed(0), honk: m.honkPerMin.toFixed(0), stress: m.stress.toFixed(2), stuck: m.stuck, resp: m.respMin.toFixed(1), trips: m.tripsPerHr.toFixed(0) }));
      console.log('  dbg', JSON.stringify(r.sim.dbg));
      console.log('  est', fmt(r.est), ' meas', fmt(r.meas), ' final', fmt(r.final));
      expect(m.active).toBeGreaterThan(300);
    }
  }, 120000);
});
const fmt = (p: any) => `${p.total.toFixed(0)} [f${p.flow.toFixed(0)} s${p.safety.toFixed(0)} c${p.comfort.toFixed(0)} p${p.ped.toFixed(0)}]`;

describe('reset', () => {
  it('returns to defaults with a clean map', () => {
    const sim = new Sim({ count: 600 });
    sim.setLevel('potholes', 0);
    const h = sim.haz.list.find((x) => x.kind === 'parked')!;
    sim.fixHazard(h);
    sim.setRain(true); sim.setClock(20 * 60);
    for (let i = 0; i < 600; i++) sim.step(0.1);
    sim.reset();
    expect(sim.levels).toEqual(defaultLevels());
    expect(sim.haz.isCustom('parking')).toBe(false);
    expect(sim.env.rain).toBe(false);
    expect(Math.round(sim.clockMin)).toBeGreaterThanOrEqual(9 * 60);
    expect(sim.m.totalAcc).toBe(sim.crashes.length); // only crashes from the post-reset warm-up
    expect(sim.agents.filter((a) => a.active).length).toBeGreaterThan(100);
  });
});

describe('traffic volume and player drive', () => {
  it('volume scales the number of vehicles', () => {
    const lo = new Sim({ count: 1200 }); lo.env.volume = 0.5;
    const hi = new Sim({ count: 1200 }); hi.env.volume = 1.6;
    for (let i = 0; i < 1200; i++) { lo.step(0.1); hi.step(0.1); }
    expect(hi.m.active).toBeGreaterThan(lo.m.active * 2.2);
  });
  it('a player drive starts and accumulates distance', () => {
    const sim = new Sim({ count: 600 });
    const a = sim.startTrip(-196, -119, 165, 300)!;
    expect(a.player).toBe(true);
    for (let i = 0; i < 1500 && !a.trip!.done; i++) { sim.step(0.1); if (a.active) sim.tickTrip(a, 0.1); }
    expect(a.trip!.dist).toBeGreaterThan(50);
  });
  it('self-drive left/right match the driver\'s left/right', () => {
    const sim = new Sim({ count: 0 });
    // lane change: ← moves to the left of travel (positive lateral offset), → to the right
    const l = sim.net.links.find((x) => x.nLanes >= 3 && x.len > 120)!;
    const a = { state: 0, latT: 1, link: l.id, lane: 1, s: 40, len: 4, lat: sim.net.laneLat(l, 1) } as any;
    l.lanes[1].agents.push(a);
    expect(sim.manualLane(a, -1)).toBe(true);
    expect(a.latTo).toBeGreaterThan(a.latFrom);
    a.latT = 1; a.lat = a.latTo;
    expect(sim.manualLane(a, 1)).toBe(true);
    expect(a.latTo).toBeLessThan(a.latFrom);
    // junction turn: ← picks an exit to the driver's left, → to the right
    let checked = 0;
    for (const il of sim.net.links) {
      const nd = sim.net.nodes[il.to];
      if (nd.outs.filter((o) => o !== il.rev).length < 3) continue;
      const d = sim.net.pose(il, il.len, 0);
      const side = (o: number) => { const p = sim.net.pose(sim.net.links[o], 2, 0); return d.dx * p.dz - d.dz * p.dx; }; // < 0 = left
      const m = { manual: true, link: il.id } as any;
      sim.input.turn = -1; const L = (sim as any).chooseNext(m);
      sim.input.turn = 1; const R = (sim as any).chooseNext(m);
      expect(side(L)).toBeLessThan(0);
      expect(side(R)).toBeGreaterThan(0);
      if (++checked > 10) break;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

describe('no interpenetration', () => {
  it('vehicles in the same lane never overlap', () => {
    const sim = new Sim({ count: 1700 });
    let worst = 0, samples = 0;
    for (let i = 0; i < 3000; i++) {
      sim.step(0.1);
      if (i > 300 && i % 10 === 0) {
        for (const l of sim.net.links) for (const L of l.lanes) {
          const arr = [...L.agents].sort((a, b) => a.s - b.s);
          for (let k = 0; k + 1 < arr.length; k++) {
            const a = arr[k], b = arr[k + 1];
            if (a.type === 7 || b.type === 7) continue; // ambulance passes yielding cars side by side
            worst = Math.max(worst, a.s - (b.s - b.len));
          }
        }
        samples++;
      }
    }
    expect(samples).toBeGreaterThan(200);
    expect(worst).toBeLessThan(0.3);
  }, 120000);
});
