import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { richGroundTex } from './textures';

export const IS_MOBILE = typeof window !== 'undefined' && (window.matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent));

export type Quality = 'low' | 'med' | 'high';

/** RenderPass renders with autoClear=false, which in this scene stops shadow maps from showing.
 *  Render the scene with the renderer's normal clearing instead. */
class ShadowSafeRenderPass extends RenderPass {
  render(renderer: THREE.WebGLRenderer, _w: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    const ac = renderer.autoClear;
    renderer.autoClear = true;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = ac;
  }
}

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fog: THREE.Fog;
  rain: THREE.LineSegments;
  private rainPos: Float32Array;
  nightUniform = { value: 0 };
  ground: THREE.Mesh;
  sky: Sky;
  stars: THREE.Points;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  quality: Quality = IS_MOBILE ? 'low' : 'high';
  private sunDir = new THREE.Vector3(-0.5, 0.8, 0.3).normalize();
  private shadowSize = 0;

  constructor(container: HTMLElement) {
    try { const q = localStorage.getItem('nr.quality'); if (q === 'low' || q === 'med' || q === 'high') this.quality = q; } catch { /* ignore */ }
    this.renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 2, 9000);
    this.camera.position.set(80, 1100, 700);

    this.fog = new THREE.Fog(0xcfe3f2, 900, 3600);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0xbfe0f5);

    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x6f7f52, 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sun.position.set(-600, 900, 400);
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 4000;
    this.scene.add(this.sun, this.sun.target);

    // physical sky (day / dusk)
    this.sky = new Sky();
    this.sky.scale.setScalar(80000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.85;
    this.scene.add(this.sky);

    // stars (night)
    const sp = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.1);
      sp.set([Math.sin(ph) * Math.cos(th) * 5000, Math.cos(ph) * 5000, Math.sin(ph) * Math.sin(th) * 5000], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // soft studio reflections for glassy towers
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (this.scene as any).environmentIntensity = 0.6;

    const g = new THREE.PlaneGeometry(5200, 4600);
    g.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: richGroundTex(), color: 0xffffff }));
    this.ground.position.set(80, -0.05, 40);
    (this.ground.material as THREE.MeshLambertMaterial).map!.repeat.set(14, 12);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // rain streaks (follow camera target)
    const N = IS_MOBILE ? 1500 : 4000;
    this.rainPos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 700, y = Math.random() * 300, z = (Math.random() - 0.5) * 700;
      this.rainPos.set([x, y, z, x + 0.6, y - 5, z + 0.3], i * 6);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaac8e8, transparent: true, opacity: 0.55, fog: false }));
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

    // post-processing: bloom (glowing lights at night) + gentle vignette
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new ShadowSafeRenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.25, 0.5, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    const vig = new ShaderPass(VignetteShader);
    vig.uniforms.offset.value = 0.95; vig.uniforms.darkness.value = 1.05;
    this.composer.addPass(vig);

    this.setQuality(this.quality);
    window.addEventListener('resize', () => this.resize(container));
  }

  setQuality(q: Quality) {
    this.quality = q;
    try { localStorage.setItem('nr.quality', q); } catch { /* ignore */ }
    const shadows = q === 'high';
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true)); });
    }
    this.sun.castShadow = shadows;
    this.bloom.enabled = q !== 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === 'low' ? 1 : IS_MOBILE ? 1.5 : 2));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
  }

  render() {
    // Shadows only survive direct rendering here; bloom only matters after dark, when sun shadows are gone.
    if (this.quality === 'low' || this.nightUniform.value < 0.3) this.renderer.render(this.scene, this.camera);
    else this.composer.render();
  }

  resize(container: HTMLElement) {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.composer.setSize(container.clientWidth, container.clientHeight);
  }

  /** Keep a crisp shadow frustum centred on what the camera is looking at. */
  updateShadow(target: THREE.Vector3, camDist: number) {
    if (!this.sun.castShadow) return;
    const size = Math.min(750, Math.max(70, camDist * 0.75));
    this.sun.position.copy(target).addScaledVector(this.sunDir, 1500);
    this.sun.target.position.copy(target);
    if (Math.abs(size - this.shadowSize) / size > 0.08) {
      this.shadowSize = size;
      const c = this.sun.shadow.camera;
      c.left = -size; c.right = size; c.top = size; c.bottom = -size;
      c.updateProjectionMatrix();
    }
  }

  private cDay = new THREE.Color(0xbfe0f5); private cDusk = new THREE.Color(0xf2b27a); private cNight = new THREE.Color(0x0b1430);
  private cRain = new THREE.Color(0x8d9aa8); private tmp = new THREE.Color();

  /** dark: 0 day → 1 night */
  setLighting(dark: number, clockMin: number, rain: boolean, haze: number) {
    const h = clockMin / 60;
    const dusk = Math.max(0, 1 - Math.abs(h - 18.6) / 1.1) + Math.max(0, 1 - Math.abs(h - 6.2) / 0.9);
    const c = this.tmp.copy(this.cDay).lerp(this.cDusk, Math.min(1, dusk) * (1 - dark * 0.6)).lerp(this.cNight, dark);
    if (rain) c.lerp(this.cRain, 0.45 * (1 - dark * 0.7));
    if (haze > 0) c.lerp(new THREE.Color(0xc9b99a), haze * 0.35 * (1 - dark * 0.7));
    (this.scene.background as THREE.Color).copy(c);
    this.fog.color.copy(c);
    this.fog.near = Math.max(80, 1100 - haze * 800 - (rain ? 350 : 0));
    this.fog.far = Math.max(600, 4200 - haze * 2800 - (rain ? 1600 : 0) - dark * 700);
    // sun path: rises in the east (+x) around 6:00, sets in the west around 18:30
    const dayT = (h - 6.1) / 12.5;
    const elev = Math.sin(Math.min(1, Math.max(0, dayT)) * Math.PI);
    const az = Math.PI * Math.min(1, Math.max(0, dayT));
    this.sunDir.set(Math.cos(az), 0.12 + elev * 0.8, 0.4).normalize();
    const su = this.sky.material.uniforms;
    su.sunPosition.value.copy(this.sunDir);
    su.turbidity.value = rain ? 14 : 4 + haze * 10;
    su.rayleigh.value = rain ? 0.6 : 1.4 + dusk;
    this.sky.visible = dark < 0.62 && !rain;
    this.stars.visible = dark > 0.4;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, (dark - 0.4) * 1.6) * (rain ? 0.2 : 1) * (1 - haze * 0.6);
    const shadowOn = this.sun.castShadow;
    this.hemi.intensity = 0.3 + (shadowOn ? 0.32 : 1.15) * (1 - dark) * (rain ? 0.8 : 1);
    this.hemi.color.setHex(dark > 0.5 ? 0x6d84c4 : 0xdff1ff);
    this.sun.intensity = 0.12 + (shadowOn ? 3.4 : 2.3) * (1 - dark) * (rain ? 0.4 : 1);
    this.sun.color.setHex(dusk > 0.3 && dark < 0.8 ? 0xffb370 : dark > 0.5 ? 0x9fb4ff : 0xfff1d6);
    this.renderer.toneMappingExposure = 1.05 - dark * 0.12;
    this.bloom.strength = 0.15 + dark * 0.32;
    this.bloom.threshold = 0.9 - dark * 0.12;
    this.bloom.radius = 0.35;
    this.nightUniform.value = dark;
    (this.ground.material as THREE.MeshLambertMaterial).color.setHex(rain ? 0xb8b8a8 : 0xffffff);
    this.rain.visible = rain;
  }

  updateRain(dt: number, target: THREE.Vector3) {
    if (!this.rain.visible) return;
    const p = this.rainPos;
    for (let i = 0; i < p.length; i += 6) {
      p[i + 1] -= dt * 220; p[i + 4] -= dt * 220;
      if (p[i + 4] < 0) { const y = 260 + Math.random() * 60; p[i + 1] = y; p[i + 4] = y - 5; }
    }
    this.rain.position.set(target.x, 0, target.z);
    (this.rain.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
