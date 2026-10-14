import { describe, it, expect } from 'vitest';
import { estimate } from '../src/sim/score';
import { SLIDERS, defaultLevels, zeroLevels, type Level } from '../src/data/sliders';
import { ISSUES } from '../src/data/issues';

const day = { dark: 0, rain: false };

describe('score estimate', () => {
  it('Dream Bengaluru (all None) scores 100', () => {
    expect(estimate(zeroLevels(), day).total).toBeGreaterThanOrEqual(95);
  });
  it('sheet defaults land in the 20–40 band', () => {
    const t = estimate(defaultLevels(), day).total;
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(40);
  });
  it('raising any slider never improves the score', () => {
    for (const s of SLIDERS) {
      for (const env of [day, { dark: 1, rain: true }]) {
        let prev = Infinity;
        for (const lv of [0, 1, 2, 3] as Level[]) {
          const L = defaultLevels(); L[s.id] = lv;
          const t = estimate(L, env).total;
          expect(t).toBeLessThanOrEqual(prev + 1e-9);
          prev = t;
        }
      }
    }
  });
  it('night makes night-only issues matter more', () => {
    const L = zeroLevels(); L.darkRoads = 3;
    expect(estimate(L, { dark: 1, rain: false }).total).toBeLessThan(estimate(L, day).total);
  });
});

describe('data integrity', () => {
  it('every issue maps to a slider or an environment toggle', () => {
    const ids = new Set(SLIDERS.map((s) => s.id));
    for (const i of ISSUES) expect(ids.has(i.slider) || i.slider.startsWith('env:'), `issue ${i.id} → ${i.slider}`).toBe(true);
  });
  it('every slider lists issues that point back to it', () => {
    for (const s of SLIDERS) for (const id of s.issues) {
      const iss = ISSUES.find((i) => i.id === id)!;
      expect(iss, `slider ${s.id} issue ${id}`).toBeTruthy();
      expect(iss.slider).toBe(s.id);
    }
  });
  it('issue ids are unique and cover 1..85', () => {
    const ids = ISSUES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i <= 85; i++) expect(ids).toContain(i);
  });
});

import { deptScores } from '../src/sim/score';
describe('department report card', () => {
  it('every department scores 100 when all issues are at None', () => {
    for (const d of deptScores(zeroLevels(), day)) expect(d.score).toBeCloseTo(100, 5);
  });
  it('each department drops when one of its issues goes to High', () => {
    const base = Object.fromEntries(deptScores(zeroLevels(), day).map((d) => [d.id, d.score]));
    for (const s of SLIDERS) {
      const L = zeroLevels(); L[s.id] = 3; L.enforcement = 3;
      const after = deptScores(L, { dark: 1, rain: true });
      const owners = new Set(s.issues.flatMap((id) => ISSUES.find((i) => i.id === id)!.ag));
      for (const d of after) if (owners.has(d.id)) expect(d.score, `${s.id} → ${d.id}`).toBeLessThan(base[d.id]);
    }
  });
  it('defaults give a spread of grades', () => {
    const g = new Set(deptScores(defaultLevels(), day).map((d) => d.grade));
    expect(g.size).toBeGreaterThan(1);
  });
});
