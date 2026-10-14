// Dev helper: headless screenshots via the locally installed Chrome.
// usage: node scripts/screenshot.mjs <url> <outDir> [mobile]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [url = 'http://localhost:5173/', out = 'shots', mode = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36');
const mobile = mode === 'mobile';
await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('nr.seen', '1'); } catch {} });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));
const steps = JSON.parse(process.env.STEPS || '[]');
let i = 0;
await page.screenshot({ path: `${out}/${mobile ? 'm' : 'd'}-00-start.png` });
for (const st of steps) {
  i++;
  if (st.js) await page.evaluate("{" + st.js + "}");
  if (st.clickjs) { const xy = await page.evaluate(st.clickjs); if (xy) await page.mouse.click(xy[0], xy[1]); else logs.push('[clickjs-null]'); }
  if (st.keys) for (const k of st.keys) { if (k.startsWith('+')) await page.keyboard.down(k.slice(1)); else if (k.startsWith('-')) await page.keyboard.up(k.slice(1)); else await page.keyboard.press(k); await new Promise((r) => setTimeout(r, 150)); }
  if (st.click) await page.click(st.click).catch((e) => logs.push('[click-fail] ' + st.click));
  await new Promise((r) => setTimeout(r, st.wait ?? 2000));
  await page.screenshot({ path: `${out}/${mobile ? 'm' : 'd'}-${String(i).padStart(2, '0')}-${st.name}.png` });
}
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
logs.push('[fps] ' + fps);
fs.writeFileSync(`${out}/${mobile ? 'm' : 'd'}-console.txt`, logs.join('\n'));
console.log(logs.slice(-30).join('\n'));
await browser.close();
