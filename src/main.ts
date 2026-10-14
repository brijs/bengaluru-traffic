import * as THREE from 'three';
import './styles.css';
import { SLIDERS, SLIDER_BY_ID, type Level, type Levels } from './data/sliders';
import { onLang, t, L } from './i18n/i18n';
import { Sim, MOBILE_SCALE, S, VT, type Agent } from './sim/sim';
import { estimate, measured, blend, deptScores, type Parts } from './sim/score';
import { World, IS_MOBILE } from './world/scene';
import { Roads } from './world/roads';
import { City } from './world/city';
import { Vehicles } from './world/vehicles';
import { HazardsView } from './world/hazardsView';
import { Fx } from './world/fx';
import { Labels, type LabelKind } from './world/labels';
import { CameraRig, type CamMode } from './world/camera';
import { Audio } from './audio';
import { UI, type Ctx } from './ui/ui';
import { SearchUI, type Place } from './ui/search';
import { markerTex } from './world/textures';
import { Cockpit } from './world/cockpit';
import { Metro } from './world/metro';
import { DriveUI } from './ui/drive';

const stage = document.getElementById('stage')!;
const world = new World(stage);
const sim = new Sim({ count: IS_MOBILE ? 1050 : 1700 });
const roads = new Roads(sim.net, sim);
const city = new City(sim.net, world.nightUniform);
const vehicles = new Vehicles(sim);
const hazView = new HazardsView(sim.net, sim);
const fx = new Fx(sim);
const labels = new Labels(stage, sim.net);
const rig = new CameraRig(world.camera, world.renderer.domElement);
const audio = new Audio();
const metro = new Metro();
labels.addStations(metro.stations);
world.scene.add(roads.group, city.group, metro.group, vehicles.group, hazView.group, fx.group, labels.group);

// shadows: tall things cast, the ground plane and roads receive
const castAll = (g: THREE.Object3D, receive: boolean) => g.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || (m.material as THREE.Material).transparent || (m.material as any).isMeshBasicMaterial) return;
  m.geometry.computeBoundingBox();
  const bb = m.geometry.boundingBox!;
  m.castShadow = bb.max.y - bb.min.y > 0.6;
  m.receiveShadow = receive;
});
castAll(city.group, true); castAll(vehicles.group, false); castAll(hazView.group, false);
roads.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.receiveShadow = true; m.castShadow = (m as any).isInstancedMesh; } });
const reShadowHazards = () => castAll(hazView.group, false);

// ───────────────────────────── score
let est: Parts = estimate(sim.levels, { dark: sim.dark, rain: sim.env.rain });
let meas: Parts = est, final: Parts = est;
function effLevels(): Levels {
  const lv: Record<string, number> = { ...sim.levels };
  const ratios = new Map<string, number[]>();
  for (const key of sim.haz.keys()) {
    const sid = key === 'footpathsLinks' ? 'footpaths' : key;
    const level = (sim.levels[sid] ?? 0) as Level;
    if (sid === 'waterlogging' && !sim.env.rain) continue;
    const exp = sim.haz.expected(key, level);
    if (exp <= 0) continue;
    const r = Math.min(1.7, sim.haz.activeWeight(key) / exp);
    ratios.set(sid, [...(ratios.get(sid) ?? []), r]);
  }
  for (const [sid, rs] of ratios) lv[sid] = (sim.levels[sid] ?? 0) * (rs.reduce((a, b) => a + b, 0) / rs.length);
  return lv as Levels;
}
function recomputeEst() { est = estimate(effLevels(), { dark: sim.dark, rain: sim.env.rain }); }
function recomputeAll() {
  recomputeEst();
  const noFoot = sim.net.links.filter((l) => l.noFoot).length / sim.net.links.length;
  meas = measured(sim.m, noFoot);
  final = blend(est, meas, sim.m.warm);
}
const envNow = () => ({ dark: sim.dark, rain: sim.env.rain });
const depts = () => deptScores(effLevels(), envNow());
function withDelta(fn: () => void) {
  const before = estimate(effLevels(), envNow()).total;
  const dBefore = depts();
  fn();
  recomputeAll();
  ui.delta(est.total - before);
  ui.deptChanged(dBefore, depts());
}

sim.onLevels = () => {
  roads.syncHazards();
  hazView.sync(sim.t);
  reShadowHazards();
  recomputeAll();
};

// fixes vanishing from the map get a sparkle when visible
hazView.onRemoved = (h, x, z) => {
  const d = Math.hypot(x - rig.target.x, z - rig.target.z);
  if (d < Math.max(200, rig.distance) && Math.random() < 0.7) { fx.sparkle(x, z, 0x69f0ae); if (Math.random() < 0.35) fx.text('✨ ' + t('fx.fixed'), x, z); }
};

// ───────────────────────────── Show on map layers (remembered per browser)
const layers: Record<string, boolean> = {};
try { Object.assign(layers, JSON.parse(localStorage.getItem('nr.layers') || '{}')); } catch { /* storage unavailable */ }
function applyLayer(id: string, b: boolean) {
  const [kind, sub] = id.split(':');
  if (kind === 'cat') { if (b) hazView.hiddenCats.delete(sub); else hazView.hiddenCats.add(sub); return; }
  if (kind === 'lbl') { if (b) labels.hidden.delete(sub as LabelKind); else labels.hidden.add(sub as LabelKind); return; }
  switch (id) {
    case 'buildings': city.buildings.visible = b; break;
    case 'trees': city.trees.visible = b; break;
    case 'landmarks': city.landmarks.visible = b; break;
    case 'signs': city.signs.visible = b; break;
    case 'metro': metro.group.visible = b; break;
    case 'vehicles': vehicles.show.vehicles = b; break;
    case 'people': vehicles.show.people = b; break;
    case 'habits': vehicles.show.bubbles = b; break;
    case 'honks': fx.show.honks = b; break;
    case 'pops': fx.show.pops = b; break;
    case 'rings': fx.show.rings = b; break;
    case 'overlay': overlay = b; roads.overlayOn = b; break;
    case 'markers': markers = b; hazView.markersOn = b; break;
  }
}
const layerOn = (id: string) => layers[id] ?? true;
function setLayer(id: string, b: boolean) {
  layers[id] = b; applyLayer(id, b);
  try { localStorage.setItem('nr.layers', JSON.stringify(layers)); } catch { /* ignore */ }
}

// ───────────────────────────── ctx for UI
let speed = 1, overlay = true, markers = true, sound = false;
const tmpV = new THREE.Vector3();
const ctx: Ctx = {
  sim, rig,
  score: () => ({ est, meas, final }),
  setLevel(id, lv, quiet) { withDelta(() => sim.setLevel(id, lv)); if (!quiet) ui.refreshRow(id); },
  setLevels(lv) { withDelta(() => sim.setLevels(lv)); ui.refreshRows(); },
  get speed() { return speed; }, setSpeed(n) { speed = n; },
  get overlay() { return overlay; }, setOverlay(b) { setLayer('overlay', b); },
  get markers() { return markers; }, setMarkers(b) { setLayer('markers', b); },
  layer: layerOn, setLayer,
  get sound() { return sound; }, setSound(b) { sound = b; audio.enable(b); },
  setRain(b) { withDelta(() => sim.setRain(b)); ui.refreshRow('waterlogging'); },
  setEvent(b) { sim.env.event = b; },
  fixHazard(h) {
    fx.sparkle(h.x, h.z, 0x69f0ae); fx.text('✅ ' + t('hz.fixed'), h.x, h.z);
    withDelta(() => sim.fixHazard(h));
  },
  worsenHazard(h) {
    fx.text('⚠️ ' + t('hz.worsened'), h.x, h.z, '#dc2626'); fx.sparkle(h.x, h.z, 0xff5252);
    withDelta(() => sim.worsenHazard(h));
  },
  fixAgent(a) { sim.fixAgent(a); fx.emoji('😇', a.x, a.z, 6, 1.6); fx.sparkle(a.x, a.z, 0xfff59d); },
  towAgent(a) { fx.text('🛻 ' + t('fx.towed'), a.x, a.z, '#475569'); a.stateT = 1e9; },
  clearCrash(c) { sim.clearCrash(c); fx.text('✅ ' + t('hz.fixed'), c.x, c.z); },
  removeRider(id) { const r = sim.riders.find((x) => x.id === id); if (r) { fx.emoji('👮', r.x, r.z, 6, 1.5); fx.sparkle(r.x, r.z); } sim.removeRider(id); },
  moreRiders(r) { sim.spawnRider(r.link); sim.spawnRider(r.link); fx.text('⚠️ ' + t('hz.worsened'), r.x, r.z, '#dc2626'); },
  removePed(p) { fx.sparkle(p.x, p.z, 0x80deea); fx.emoji('🙏', p.x, p.z, 5, 1.4); sim.removePed(p.id); },
  follow(id, mode = 'follow') {
    if (id === null) { rig.follow = null; vehicles.followId = -1; rig.setMode('tilt'); ui.camChanged('tilt'); return; }
    vehicles.followId = id;
    rig.followAgent(sim.agents[id], mode);
    ui.camChanged(mode);
  },
  randomCar() {
    const tgt = rig.target;
    let best: Agent | null = null, bd = 1e9;
    for (const a of sim.agents) {
      if (!a.active || a.state !== S.DRIVE || a.type === VT.AMBULANCE) continue;
      const d = Math.hypot(a.x - tgt.x, a.z - tgt.z) * (a.traits ? 0.7 : 1) * (0.6 + Math.random() * 0.8);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) { ctx.follow(best.id, rig.mode === 'street' ? 'street' : 'follow'); ui.showAgent(best.id); }
  },
  flyTo(x, z, dist, polar = 0.9, az) {
    if (rig.mode === 'follow' || rig.mode === 'street') { rig.follow = null; vehicles.followId = -1; rig.setMode('tilt', true); ui.camChanged('tilt'); }
    rig.flyTo(tmpV.set(x, 0, z), dist, polar, 1.4, az);
  },
  resetView() { ctx.flyTo(60, 40, IS_MOBILE ? 1500 : 1150, 0.72, 0.2); },
  setCam(m: CamMode) {
    if ((m === 'follow' || m === 'street') && !rig.follow) { ctx.randomCar(); if (m === 'street') rig.setMode('street'); }
    else rig.setMode(m);
    if (m === 'top' || m === 'tilt') { rig.follow = null; vehicles.followId = -1; }
    ui.camChanged(m);
  },
  spot(id) {
    const sp = SLIDER_BY_ID[id]?.spot;
    if (!sp) return null;
    const l = sim.net.linkBetween(sp.a, sp.b);
    if (!l) return null;
    const p = sim.net.pose(l, sp.t * l.len, l.halfW * 0.5);
    return { x: p.x, z: p.z, dx: p.dx, dz: p.dz };
  },
  isCustom: (id) => sim.haz.isCustom(id),
  reset() {
    speed = 1;
    rig.follow = null; vehicles.followId = -1;
    sim.reset();
    roads.syncHazards(); hazView.sync(sim.t); recomputeAll();
    ui.resetState();
    rig.setMode('tilt', true); ui.camChanged('tilt');
    ctx.resetView();
  },
  rotate(dir) { rig.rotateBy(dir * Math.PI / 4); },
  northUp() { rig.northUp(); },
  spin(d) { rig.spin(d); },
  azimuth: () => rig.azimuth(),
  depts,
  openSearch() { search.toggle(true); },
  get volume() { return sim.env.volume; },
  setVolume(v) { withDelta(() => { sim.env.volume = v; }); },
  get quality() { return world.quality; },
  setQuality(q) { world.setQuality(q); },
  celebrate(x, z, txt) { fx.sparkle(x, z, 0x69f0ae); fx.text('🎉 ' + txt, x, z); ui.confetti(); },
  sparkleSlider(id) {
    let n = 0;
    for (const h of sim.haz.list) {
      if (h.slider !== id || n > 14) continue;
      if (Math.hypot(h.x - rig.target.x, h.z - rig.target.z) > Math.max(250, rig.distance * 1.2)) continue;
      n++;
      setTimeout(() => { fx.sparkle(h.x, h.z, 0x69f0ae); if (n < 5) fx.text('✨ ' + t('fx.fixed'), h.x, h.z); }, n * 40);
    }
  },
};
for (const id of Object.keys(layers)) applyLayer(id, layers[id]);
const ui = new UI(ctx);

// ───────────────────────────── search & simulated drive
const pins: Record<'from' | 'to', THREE.Sprite> = {
  from: new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex('🟢', '#16a34a'), depthTest: false, sizeAttenuation: false })),
  to: new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex('🏁', '#111111'), depthTest: false, sizeAttenuation: false })),
};
for (const p of Object.values(pins)) { p.scale.set(0.05, 0.058, 1); p.center.set(0.5, 0); p.visible = false; p.renderOrder = 30; world.scene.add(p); }
let playerCar: Agent | null = null;
const search = new SearchUI({
  net: sim.net,
  flyTo: (x, z, d) => ctx.flyTo(x, z, d, d > 300 ? 0.8 : 0.95),
  setPin(which, p: Place | null) { const s = pins[which]; s.visible = !!p; if (p) s.position.set(p.x, 3, p.z); },
  startDrive(from, to) {
    const a = sim.startTrip(from.x, from.z, to?.x, to?.z);
    if (!a) return null;
    playerCar = a;
    if (speed === 0) speed = 1;
    ctx.follow(a.id, 'follow');
    return a;
  },
  stopDrive() { drive.stop(); sim.stopTrip(); },
  takeWheel: (a) => takeWheel(a),
  autopilot: (a) => autopilot(a),
  clockMin: () => sim.clockMin,
});
function takeWheel(a: Agent) { drive.start(a); ctx.follow(a.id, 'cockpit'); if (!IS_MOBILE) ui.toast('🕹️ ' + t('drive.help')); }
function autopilot(a: Agent) { drive.stop(); a.manual = false; a.next = -1; ctx.follow(a.id, 'follow'); }
world.scene.add(world.camera);
const cockpit = new Cockpit(world.camera);
const drive = new DriveUI(sim, {
  toast: (m, k) => ui.toast(m, k ?? ''),
  cycleCam: () => { const order: CamMode[] = ['follow', 'street', 'cockpit']; const i = order.indexOf(rig.mode); const m = order[(i + 1) % 3]; if (rig.follow) ctx.follow(rig.follow.id, m); },
  autopilot: () => { if (drive.car) autopilot(drive.car); search.update(); },
  beep: () => { if (sound) audio.honk(0.5, 0, 'car'); },
});
sim.onTripEnd = (a) => {
  drive.stop();
  search.update();
  const tr = a.trip!;
  if (tr.outcome === 'arrived') { fx.sparkle(a.x, a.z, 0x69f0ae); ui.confetti(); ui.toast('🏁 ' + t('trip.arrived'), 'good'); }
  else if (tr.outcome === 'crashed') ui.toast('💥 ' + t('trip.crashed'), 'bad');
  if (rig.follow === a) { rig.follow = null; vehicles.followId = -1; rig.setMode('tilt', true); ui.camChanged('tilt'); ctx.flyTo(a.x, a.z, 90, 0.9); }
  playerCar = null;
};
rig.onModeChange = (m) => ui.camChanged(m);
onLang(() => { labels.refresh(); fx.refreshWords(); });

// ───────────────────────────── events → sound, flyouts, toasts
let lastCrashToast = -99;
const panOf = (x: number, z: number) => { tmpV.set(x, 0, z).project(world.camera); return Math.max(-1, Math.min(1, tmpV.x)); };
fx.onHonk = (x, z, id) => {
  if (!sound) return;
  const d = Math.hypot(x - rig.target.x, z - rig.target.z);
  const vol = Math.max(0, 1 - d / (rig.distance * 0.7 + 60)) * Math.min(1, 220 / Math.max(60, rig.distance));
  const a = id !== undefined ? sim.agents[id] : undefined;
  const kind = !a ? 'car' : a.type === VT.BIKE ? 'bike' : a.type === VT.AUTO ? 'auto' : a.type === VT.BUS ? 'bus' : a.type === VT.TRUCK || a.type === VT.TANKER || a.type === VT.TRACTOR ? 'truck' : 'car';
  audio.honk(vol * zoomVol(), panOf(x, z), kind);
};
fx.onCrash = (x, z) => {
  const d = Math.hypot(x - rig.target.x, z - rig.target.z);
  ui.flyout('+1 💥');
  if (sound) audio.crash(Math.max(0, 1 - d / (rig.distance + 100)) * zoomVol());
  if (performance.now() / 1000 - lastCrashToast > 12) {
    lastCrashToast = performance.now() / 1000;
    const near = sim.net.nearestLink(x, z);
    const crash = [...sim.crashes].reverse().find((c) => !c.cleared && Math.hypot(c.x - x, c.z - z) < 3);
    if (near) ui.toast('💥 ' + t('toast.crash', { road: L(near.link.road) }), 'bad', () => {
      ctx.flyTo(x, z, 45, 0.95);
      if (crash && crash.agents.length) setTimeout(() => ui.showAgent(crash.agents[0]), 900);
    });
  }
};
/** Overall loudness from zoom: street level = full, whole-city view ≈ silent. */
function zoomVol() { return Math.max(0, Math.min(1, (900 - rig.distance) / 760)) ** 1.5; }

// ───────────────────────────── picking
const ray = new THREE.Raycaster();
ray.params.Points = { threshold: 1 };
const ndc = new THREE.Vector2();
let downX = 0, downY = 0, downT = 0;
const canvas = world.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7 || performance.now() - downT > 600) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, world.camera);
  const mk = ray.intersectObjects(hazView.markers(), false);
  if (mk.length) {
    const h = sim.haz.byId(mk[0].object.userData.hid);
    if (h) { ui.showHazard(h); return; }
  }
  const hit = vehicles.pick(ray);
  if (hit) {
    if (hit.kind === 'agent') ui.showAgent(hit.id);
    else if (hit.kind === 'rider') ui.showRider(hit.id);
    else if (hit.kind === 'ped') ui.showPed(hit.id);
    else if (hit.kind === 'cow') {
      if (hit.id >= 1000000) { const h = sim.haz.byId(hit.id - 1000000); if (h) ui.showHazard(h); }
      else ui.showPed(-hit.id);
    }
    return;
  }
});
// hover cursor over markers (desktop)
if (!IS_MOBILE) {
  let hoverT = 0;
  canvas.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - hoverT < 120 || e.buttons) return;
    hoverT = now;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, world.camera);
    canvas.style.cursor = ray.intersectObjects(hazView.markers(), false).length ? 'pointer' : '';
  });
}
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (e.key === ' ') { speed = speed === 0 ? 1 : 0; e.preventDefault(); }
  if (e.key === 'Escape') ui.closeCard();
  if ((e.key === 'c' || e.key === 'C') && rig.follow) { const order: CamMode[] = ['follow', 'street', 'cockpit']; const i = order.indexOf(rig.mode); ctx.follow(rig.follow.id, order[(i + 1) % 3]); return; }
  if (e.key === '/') { e.preventDefault(); search.toggle(true); return; }
  if (ui.previewKey(e.key)) { e.preventDefault(); return; }
  if (e.key === 'q' || e.key === 'Q') ctx.rotate(-1);
  if (e.key === 'e' || e.key === 'E') ctx.rotate(1);
});

// ───────────────────────────── initial state & loop
roads.syncHazards();
hazView.sync(sim.t);
for (let i = 0; i < 250; i++) sim.step(0.1); // warm the city up so it starts busy
sim.fx.length = 0;
recomputeAll();
rig.flyTo(new THREE.Vector3(60, 0, 40), IS_MOBILE ? 1500 : 1150, 0.72, 0.01, 0.2);
document.getElementById('boot')?.classList.add('gone');
setTimeout(() => document.getElementById('boot')?.remove(), 800);

let ambT = 0;
let last = performance.now(), wall = 0, lightT = 1, scoreT = 0, sirenT = 0;
let slow = 0, perfT = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now; wall += dt;
  sim.update(dt, speed);
  lightT += dt;
  if (lightT > 0.2) { lightT = 0; world.setLighting(sim.dark, sim.clockMin, sim.env.rain, sim.E('haze')); }
  rig.update(dt);
  const camDist = rig.distance;
  roads.update(dt, wall, camDist);
  vehicles.update(dt, wall, world.camera, rig.target, camDist);
  hazView.update(sim.t, camDist, wall, world.camera.position);
  fx.update(dt, rig.target, camDist, wall);
  city.update(dt, wall, sim.dark, sim.env.event);
  metro.update(dt * Math.min(speed, 3));
  world.updateRain(dt, rig.target);
  world.updateShadow(rig.target, camDist);
  world.render();
  labels.update(world.scene, world.camera, camDist);
  scoreT += dt;
  if (scoreT > 0.3) { scoreT = 0; recomputeAll(); }
  ui.tick(dt);
  drive.update(dt);
  vehicles.hideId = rig.mode === 'cockpit' && rig.follow ? rig.follow.id : -1;
  cockpit.update(rig.follow, rig.mode === 'cockpit', wall, dt);
  if (playerCar && playerCar.active) sim.tickTrip(playerCar, dt * speed);
  if (search.active && Math.floor(wall * 2) !== Math.floor((wall - dt) * 2)) search.update();
  if (Math.floor(wall * 2) !== Math.floor((wall - dt) * 2)) ui.setWhere(rig.target.x, rig.target.z, camDist);
  sirenT += dt;
  ambT += dt;
  if (sound && ambT > 0.2) {
    ambT = 0;
    const lvl = Math.min(1, 0.25 + sim.m.honkPerMin / 2500) * (0.06 + 0.94 * zoomVol());
    audio.setAmbience(lvl, rig.mode === 'street' || rig.mode === 'follow');
  }
  if (sound && sirenT > 1) {
    sirenT = 0;
    for (const a of sim.agents) if (a.active && a.type === VT.AMBULANCE) {
      const d = Math.hypot(a.x - rig.target.x, a.z - rig.target.z);
      if (d < camDist) { audio.siren((1 - d / camDist) * zoomVol(), panOf(a.x, a.z)); break; }
    }
  }
  // adaptive quality: shed load if frames are slow
  perfT += dt;
  if (dt > 0.034) slow += dt; else slow = Math.max(0, slow - dt * 0.5);
  if (perfT > 3) {
    perfT = 0;
    if (slow > 1.2) {
      if (world.quality === 'high') world.setQuality('med');
      else if (world.quality === 'med') world.setQuality('low');
      else if (MOBILE_SCALE.v > 0.55) MOBILE_SCALE.v -= 0.1;
      ui.render();
      slow = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for debugging / screenshots
(window as any).nr = { sim, rig, ui, ctx, world, SLIDERS, drive };
