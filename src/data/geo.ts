// Real lat/lon → stylized map coordinates. Same projection the map was laid out with:
// 7000 units per degree around (12.96 N, 77.60 E), outskirts beyond 400 units squeezed by 0.55.
import { WORLD } from './city';

const LAT0 = 12.96, LON0 = 77.6, K = 7000, R0 = 400, SQ = 0.55;

export function toWorld(lat: number, lon: number): { x: number; z: number; inside: boolean } {
  const rx = (lon - LON0) * K, rz = -(lat - LAT0) * K;
  const r = Math.hypot(rx, rz);
  const f = r > R0 ? (R0 + (r - R0) * SQ) / r : 1;
  const x = rx * f, z = rz * f;
  const inside = x > WORLD.minX && x < WORLD.maxX && z > WORLD.minZ && z < WORLD.maxZ;
  return { x: Math.max(WORLD.minX, Math.min(WORLD.maxX, x)), z: Math.max(WORLD.minZ, Math.min(WORLD.maxZ, z)), inside };
}

/** Bounding box used to keep OpenStreetMap searches inside greater Bengaluru. */
export const BLR_VIEWBOX = '77.33,13.27,78.0,12.70';
