import { describe, it, expect } from 'vitest';
import { toWorld } from '../src/data/geo';
import { NODES } from '../src/data/city';

// Real coordinates of a few junctions; the stylized map should put them within ~45 units.
const REAL: [string, number, number][] = [
  ['silk_board', 12.9172, 77.6229], ['hebbal', 13.0358, 77.597], ['majestic', 12.9767, 77.5713],
  ['marathahalli', 12.9569, 77.7011], ['kr_puram', 13.0075, 77.6954], ['jayanagar', 12.925, 77.5838],
];
describe('geo projection', () => {
  it('lands known junctions near their map nodes', () => {
    for (const [id, lat, lon] of REAL) {
      const n = NODES.find((x) => x.id === id)!;
      const p = toWorld(lat, lon);
      expect(Math.hypot(p.x - n.x, p.z - n.z), id).toBeLessThan(45);
    }
  });
});
