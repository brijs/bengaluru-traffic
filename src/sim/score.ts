import { SLIDERS, SLIDER_BY_ID, type Levels } from '../data/sliders';
import { ISSUES, AGENCIES, type AgencyId } from '../data/issues';
import type { Metrics } from './sim';

export interface Parts { flow: number; safety: number; comfort: number; ped: number; total: number }

export const WEIGHTS = { flow: 0.35, safety: 0.35, comfort: 0.15, ped: 0.15 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const total = (p: Omit<Parts, 'total'>) => WEIGHTS.flow * p.flow + WEIGHTS.safety * p.safety + WEIGHTS.comfort * p.comfort + WEIGHTS.ped * p.ped;

/** Instant estimate from slider levels — updates the moment a slider moves. */
export function estimate(levels: Levels, env: { dark: number; rain: boolean }): Parts {
  const amp = 0.55 + 0.45 * ((levels.enforcement ?? 0) / 3);
  let f = 1, s = 1, c = 1, p = 1;
  for (const d of SLIDERS) {
    let e = (levels[d.id] ?? 0) / 3;
    if (!e) continue;
    if (d.behaviour) e *= amp;
    if (d.night === 'only') e *= 0.15 + 0.85 * env.dark;
    if (d.night === 'boost') e *= 0.5 + 0.5 * env.dark;
    if (d.rain && !env.rain) e = 0;
    f *= 1 - d.w.f * e; s *= 1 - d.w.s * e; c *= 1 - d.w.c * e; p *= 1 - d.w.p * e;
  }
  if (env.rain) { f *= 0.92; s *= 0.94; }
  const parts = { flow: 100 * f, safety: 100 * s, comfort: 100 * c, ped: 100 * p };
  return { ...parts, total: total(parts) };
}

/** Score from what the simulation actually measured. */
export function measured(m: Metrics, noFootFrac: number): Parts {
  const flow = 100 * clamp01((m.speedRatio - 0.14) / (0.56 - 0.14));
  const safety = 100 * Math.exp(-(m.accPerHr * 0.025 + m.injPerHr * 0.05 + m.nearPerHr * 0.0002));
  const comfort = 100 * (1 - clamp01(m.stress)) * Math.exp(-(m.honkPerMin / Math.max(300, m.active)) * 0.15);
  const ped = 100 * Math.exp(-m.pedPerHr * 0.004) * (1 - 0.45 * noFootFrac);
  const parts = { flow, safety, comfort, ped };
  return { ...parts, total: total(parts) };
}

/** Blend: immediate estimate + honest measurement once the sim has warmed up. */
export function blend(est: Parts, meas: Parts, warm: number): Parts {
  const w = 0.45 * warm;
  const mix = (a: number, b: number) => a * (1 - w) + b * w;
  const parts = { flow: mix(est.flow, meas.flow), safety: mix(est.safety, meas.safety), comfort: mix(est.comfort, meas.comfort), ped: mix(est.ped, meas.ped) };
  return { ...parts, total: total(parts) };
}

export function grade(score: number): { key: string; emoji: string } {
  if (score >= 85) return { key: 'grade.dream', emoji: '🤩' };
  if (score >= 70) return { key: 'grade.smooth', emoji: '😊' };
  if (score >= 50) return { key: 'grade.ok', emoji: '😐' };
  if (score >= 30) return { key: 'grade.struggle', emoji: '😩' };
  return { key: 'grade.chaos', emoji: '🤯' };
}

// ───────────────────────────── department report card

export interface DeptScore { id: AgencyId; score: number; grade: string; open: { issue: number; slider: string; weight: number }[] }
const SEV_W = { H: 3, M: 2, L: 1 } as const;

/** Each agency is scored on the issues it can fix: 100 = all its issues at None. */
export function deptScores(levels: Levels, env: { dark: number; rain: boolean }): DeptScore[] {
  const amp = 0.55 + 0.45 * ((levels.enforcement ?? 0) / 3);
  const burden = new Map<AgencyId, number>(), max = new Map<AgencyId, number>();
  const open = new Map<AgencyId, DeptScore['open']>();
  for (const iss of ISSUES) {
    const d = SLIDER_BY_ID[iss.slider];
    let e = 0;
    if (d) {
      e = Math.min(1.7, (levels[d.id] ?? 0) / 3);
      if (d.behaviour) e *= amp; // strong enforcement shrinks behaviour issues
      if (d.night === 'only') e *= 0.4 + 0.6 * env.dark;
      if (d.rain && !env.rain) e *= 0.35;   // drains still matter when dry — the next storm is coming
    } else if (iss.slider === 'env:rain') e = env.rain ? 0.6 : 0;
    else continue;
    const w = SEV_W[iss.sev];
    for (const a of iss.ag) {
      burden.set(a, (burden.get(a) ?? 0) + w * e);
      max.set(a, (max.get(a) ?? 0) + w);
      if (e > 0.05 && d) { const o = open.get(a) ?? []; o.push({ issue: iss.id, slider: d.id, weight: w * e }); open.set(a, o); }
    }
  }
  return (Object.keys(AGENCIES) as AgencyId[]).filter((a) => max.has(a)).map((a) => {
    const score = Math.max(0, Math.min(100, 100 * (1 - (burden.get(a) ?? 0) / (max.get(a) || 1))));
    const seen = new Set<string>();
    const top = (open.get(a) ?? []).sort((x, y) => y.weight - x.weight).filter((o) => !seen.has(o.slider) && seen.add(o.slider)).slice(0, 3);
    return { id: a, score, grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F', open: top };
  });
}
