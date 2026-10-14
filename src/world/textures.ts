import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}
function done(c: HTMLCanvasElement, key: string, srgb = true) {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Round marker bubble with an emoji inside (issue markers). */
export function markerTex(emoji: string, ring = '#ff3b3b'): THREE.Texture {
  const key = 'mk:' + emoji + ring;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(128, 150);
  g.beginPath(); g.moveTo(64, 148); g.lineTo(44, 110); g.lineTo(84, 110); g.closePath(); g.fillStyle = ring; g.fill();
  g.beginPath(); g.arc(64, 62, 56, 0, Math.PI * 2); g.fillStyle = ring; g.fill();
  g.beginPath(); g.arc(64, 62, 47, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
  g.font = '58px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, 64, 66);
  return done(c, key);
}

/** Plain emoji (icons above vehicles, fx). */
export function emojiTex(emoji: string): THREE.Texture {
  const key = 'em:' + emoji;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(96, 96);
  g.font = '76px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, 48, 54);
  return done(c, key);
}

/** Comic speech burst: PEEP!, POM POM! … */
export function burstTex(text: string, fill = '#ffe14d', stroke = '#d1001f'): THREE.Texture {
  const key = 'bu:' + text + fill;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 128);
  g.translate(128, 64);
  g.beginPath();
  const spikes = 14;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 ? 50 : 62;
    g.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = fill; g.fill();
  g.lineWidth = 6; g.strokeStyle = stroke; g.stroke();
  g.font = 'bold 40px "Noto Sans Kannada","Noto Sans",system-ui,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText(text, 0, 2);
  g.fillStyle = stroke; g.fillText(text, 0, 2);
  return done(c, key);
}

/** Rounded label pill (floating "Fixed!" text etc). */
export function pillTex(text: string, bg = '#12b76a', fg = '#fff'): THREE.Texture {
  const key = 'pl:' + text + bg;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(320, 96);
  g.fillStyle = bg;
  const r = 40;
  g.beginPath(); g.moveTo(r + 8, 8); g.arcTo(312, 8, 312, 88, r); g.arcTo(312, 88, 8, 88, r); g.arcTo(8, 88, 8, 8, r); g.arcTo(8, 8, 312, 8, r); g.fill();
  g.font = 'bold 44px "Noto Sans Kannada","Noto Sans",system-ui,sans-serif';
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 160, 50, 290);
  return done(c, key);
}

/** Diagonal hazard stripes (barricades, medians). */
export function stripeTex(a = '#111', b = '#f5c400', n = 6): THREE.Texture {
  const key = 'st:' + a + b + n;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(128, 32);
  g.fillStyle = a; g.fillRect(0, 0, 128, 32);
  g.fillStyle = b;
  const w = 128 / n;
  for (let i = -1; i < n + 1; i++) { g.beginPath(); g.moveTo(i * w, 32); g.lineTo(i * w + w / 2, 32); g.lineTo(i * w + w, 0); g.lineTo(i * w + w / 2, 0); g.fill(); }
  const t = done(c, key);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft radial glow (headlights, lamp pools, crash pulses). */
export function glowTex(inner = 'rgba(255,240,200,1)', outer = 'rgba(255,200,120,0)'): THREE.Texture {
  const key = 'gl:' + inner + outer;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return done(c, key);
}

/** Ground texture with subtle noise so the plane doesn't look flat. */
export function groundTex(): THREE.Texture {
  const key = 'ground';
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#c9c2a4'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 3 + 0.5;
    const v = Math.random();
    g.fillStyle = v < 0.5 ? 'rgba(120,140,80,0.10)' : v < 0.8 ? 'rgba(170,150,110,0.12)' : 'rgba(255,255,255,0.06)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = done(c, key);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  return t;
}

/** Zebra crossing / paver patterns. */
export function zebraTex(): THREE.Texture {
  const key = 'zebra';
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(64, 64);
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = '#f4f4f4';
  for (let i = 0; i < 4; i++) g.fillRect(0, i * 16 + 2, 64, 10);
  const t = done(c, key);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function rand(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function tiled(key: string, size: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true) {
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(size, size);
  draw(g, rand(key.length * 977 + size));
  const t = done(c, key, srgb);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  return t;
}

/** Asphalt: light-grey base (tinted by vertex colour), aggregate speckle, repair patches, cracks, oil stains. */
export function asphaltTex(): THREE.Texture {
  return tiled('asphalt', 512, (g, r) => {
    g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 34000; i++) {
      const v = r() < 0.5 ? 95 + Math.floor(r() * 50) : 200 + Math.floor(r() * 55);
      g.fillStyle = `rgba(${v},${v},${v},${0.35 + r() * 0.4})`;
      g.fillRect(r() * 512, r() * 512, 1 + r() * 1.8, 1 + r() * 1.8);
    }
    for (let i = 0; i < 7; i++) { // tar repair patches
      g.fillStyle = `rgba(60,60,62,${0.3 + r() * 0.25})`;
      const x = r() * 512, y = r() * 512, w = 30 + r() * 90, h = 20 + r() * 60;
      g.fillRect(x, y, w, h);
    }
    for (let i = 0; i < 10; i++) { // oil / wear stains
      const x = r() * 512, y = r() * 512, rr = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(30,30,30,0.35)'); gr.addColorStop(1, 'rgba(40,40,40,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    g.strokeStyle = 'rgba(40,40,40,0.6)'; g.lineWidth = 1.6;
    for (let i = 0; i < 14; i++) { // hairline cracks
      let x = r() * 512, y = r() * 512;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
  });
}

/** Interlocking concrete pavers (very common on Bengaluru footpaths). */
export function paverTex(): THREE.Texture {
  return tiled('paver', 256, (g, r) => {
    g.fillStyle = '#9c958c'; g.fillRect(0, 0, 256, 256);
    const s = 32;
    for (let y = 0; y < 256; y += s) for (let x = 0; x < 256; x += s / 2) {
      const off = (y / s) % 2 ? s / 4 : 0;
      const v = 175 + Math.floor(r() * 50);
      const tint = r() < 0.15 ? [v, v * 0.82, v * 0.75] : [v, v * 0.97, v * 0.93];
      g.fillStyle = `rgb(${tint.map((q) => Math.floor(q)).join(',')})`;
      g.fillRect(((x + off) % 256) + 1, y + 1, s / 2 - 2, s - 2);
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  });
}

/** Packed earth / gravel shoulder. */
export function dirtTex(): THREE.Texture {
  return tiled('dirt', 256, (g, r) => {
    g.fillStyle = '#a07e58'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(90,62,38,${r() * 0.4})` : `rgba(210,180,140,${r() * 0.35})`;
      g.beginPath(); g.arc(r() * 256, r() * 256, 0.6 + r() * 2.2, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Ground: mix of dry grass, red earth and green patches. */
export function richGroundTex(): THREE.Texture {
  return tiled('ground2', 1024, (g, r) => {
    g.fillStyle = '#b9b38e'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      const x = r() * 1024, y = r() * 1024, rr = 30 + r() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      const c = r() < 0.55 ? '120,150,80' : r() < 0.7 ? '170,110,70' : '200,190,150';
      gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 40000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? 'rgba(90,120,60,0.18)' : v < 0.8 ? 'rgba(150,120,80,0.15)' : 'rgba(255,255,240,0.08)';
      g.fillRect(r() * 1024, r() * 1024, 1 + r() * 2, 1 + r() * 2);
    }
  });
}

/** Replace a geometry's UVs with world XZ / scale so textures tile evenly regardless of mesh shape. */
export function worldUV(geo: THREE.BufferGeometry, scale: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / scale; uv[i * 2 + 1] = p.getZ(i) / scale; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
