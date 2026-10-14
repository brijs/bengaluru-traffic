// Regenerates exports/issues_updated.csv from src/data (paste into the Google Sheet).
// run: node --experimental-strip-types scripts/export-csv.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { ISSUES, CATEGORIES, OWNERS, AGENCIES, SEV_LABEL, FREQ_LABEL } from '../src/data/issues.ts';
import { SLIDERS } from '../src/data/sliders.ts';

const q = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
const head = ['ID', 'Category', 'Issue', 'Issue (Kannada)', 'Source', 'Severity', 'Frequency', 'Who can fix', 'Agencies', 'Starter fix idea', 'Fix idea (Kannada)', 'Simulator control'];
const src = { yours: 'Your list', added: 'Added', new: 'New (simulator)' } as const;
const rows = ISSUES.map((i) => {
  const sl = SLIDERS.find((s) => s.id === i.slider);
  return [i.id, CATEGORIES[i.cat].en, i.en, i.kn, src[i.src], SEV_LABEL[i.sev].en, FREQ_LABEL[i.freq].en, OWNERS[i.owner].en,
    i.ag.map((a) => AGENCIES[a].en).join('; '), i.fixEn, i.fixKn, sl ? `${sl.icon} ${sl.en}` : i.slider.replace('env:', 'Environment toggle: ')].map((x) => q(String(x))).join(',');
});
mkdirSync('exports', { recursive: true });
writeFileSync('exports/issues_updated.csv', '﻿' + [head.map(q).join(','), ...rows].join('\n') + '\n');
console.log('wrote exports/issues_updated.csv with', rows.length, 'issues');
