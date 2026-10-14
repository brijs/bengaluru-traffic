// Namma Metro lines from OpenStreetMap (regenerate with `node scripts/fetch-metro.mjs`).
// Status checked against news reports, Oct 2026: Purple, Green, Yellow open; Pink and Blue under construction
// (Pink's elevated stretch was due to open around Aug–Oct 2026 — flip `status` when it does).
import raw from './metro.json';

export interface MetroLineData {
  id: string; en: string; kn: string; color: number; status: 'open' | 'construction';
  pts: [number, number, number][]; // x, z, underground(1/0)
  stations: { x: number; z: number; name: string }[];
}

const META: Record<string, { en: string; kn: string; color: number }> = {
  purple: { en: 'Purple Line', kn: 'ನೇರಳೆ ಮಾರ್ಗ', color: 0x8e44ad },
  green: { en: 'Green Line', kn: 'ಹಸಿರು ಮಾರ್ಗ', color: 0x27ae60 },
  yellow: { en: 'Yellow Line', kn: 'ಹಳದಿ ಮಾರ್ಗ', color: 0xf1c40f },
  pink: { en: 'Pink Line', kn: 'ಗುಲಾಬಿ ಮಾರ್ಗ', color: 0xe84393 },
  blue: { en: 'Blue Line (Airport)', kn: 'ನೀಲಿ ಮಾರ್ಗ (ವಿಮಾನ ನಿಲ್ದಾಣ)', color: 0x2f6fde },
};

export const METRO_SOURCE = { source: (raw as any).source as string, fetched: (raw as any).fetched as string };
export const METRO_LINES: MetroLineData[] = ((raw as any).lines as any[])
  .filter((l) => l.pts.length > 1 && META[l.id])
  .map((l) => ({ ...META[l.id], id: l.id, status: l.status, pts: l.pts, stations: l.stations }));
