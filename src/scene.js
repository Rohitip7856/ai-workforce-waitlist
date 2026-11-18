import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWorlds, PALETTES } from './worlds.js';

/*
 * The Orchestrator — a particle universe around a glass energy core.
 *
 * Scroll progress (0 → 4) morphs every particle between five formations:
 *   0 Hero       — a three-armed galaxy (one arm per agent)
 *   1 Sales      — a vortex of prospects funnelling into the core; 10 bright leads come out
 *   2 Marketing  — broadcast waves rippling outward
 *   3 Operations — a perfectly ordered lattice
 *   4 Close      — one sphere: the control centre
 * The camera flies a single spline through all of it.
 */

const COL = {
  sales: new THREE.Color('#4C7DFF'),
  mkt: new THREE.Color('#9B5CFF'),
  ops: new THREE.Color('#2FD08F'),
  white: new THREE.Color('#EAF0FF'),
};
const AGENT_COLORS = [COL.sales, COL.mkt, COL.ops];
const TAU = Math.PI * 2;
const ORBIT_R = 3.9;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeBack = (x) => {
  const c = 1.7;
  const t = clamp01(x) - 1;
  return 1 + (c + 1) * t * t * t + c * t * t;
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Ashima 3D simplex noise (MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const PARTICLE_VERT = /* glsl */ `
uniform float uTime, uProgress, uIntro, uBurst, uPixelRatio, uSize, uCount, uLatN, uLeadGlow, uMouseStrength;
uniform vec3 uMouse, cSales, cMkt, cOps, cWhite, cPink, cGold;
attribute vec4 aSeed;
attribute float aIndex;
varying vec3 vColor;
varying float vAlpha;

vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 armColor(float k){ return k < 1.0 ? cSales : (k < 2.0 ? cMkt : cOps); }

vec3 galaxy(out vec3 col){
  float arm = floor(aSeed.x * 3.0);
  float r = 2.0 + pow(aSeed.y, 1.6) * 9.0;
  float spread = (aSeed.z - 0.5) * (0.55 + r * 0.09);
  float a = arm * 2.0944 + r * 0.36 + spread + uTime * 0.2 / (0.35 + r * 0.15);
  float y = (aSeed.w - 0.5) * (0.16 + r * 0.05);
  col = mix(cWhite, armColor(arm), smoothstep(1.8, 4.5, r));
  return vec3(cos(a) * r, y, sin(a) * r);
}

vec3 funnel(out vec3 col){
  if (aIndex < 10.0) {
    float a = mix(-1.05, 1.05, aIndex / 9.0);
    col = mix(cWhite, cGold, 0.55);
    return vec3(sin(a) * 3.5, -2.1 + sin(uTime * 1.6 + aIndex) * 0.07, cos(a) * 3.5);
  }
  float h = fract(aSeed.y - uTime * 0.035);
  float rad = 0.4 + pow(h, 1.8) * 5.4 + (aSeed.z - 0.5) * 0.35 * h;
  // Particles travel along 16 spiral streams so the vortex reads as a funnel.
  float stream = floor(aSeed.x * 16.0) / 16.0 * 6.2832 + (aSeed.z - 0.5) * 0.18;
  float a = stream + h * 5.0 + uTime * (0.8 / (0.25 + rad * 0.3));
  col = mix(cWhite, cSales, 0.3 + 0.7 * h);
  return vec3(cos(a) * rad, mix(1.05, 6.4, h), sin(a) * rad);
}

vec3 wave(out vec3 col, out float al){
  float rings = 11.0;
  float k = floor(aSeed.x * rings);
  float rr = fract(k / rings + uTime * 0.045);
  float radius = 1.7 + rr * 10.0 + (aSeed.z - 0.5) * 0.14;
  float a = aSeed.y * 6.2832;
  float y = sin(radius * 1.1 - uTime * 1.7) * 0.5 * (1.0 - rr) + (aSeed.w - 0.5) * 0.05;
  col = mix(cWhite, mix(cPink, cMkt, rr), smoothstep(0.0, 0.45, rr));
  al = 1.0 - smoothstep(0.65, 1.0, rr);
  return vec3(cos(a) * radius, y, sin(a) * radius);
}

vec3 lattice(out vec3 col){
  float n = uLatN;
  float x = mod(aIndex, n);
  float y = mod(floor(aIndex / n), n);
  float z = floor(aIndex / (n * n));
  vec3 g = (vec3(x, y, z) / (n - 1.0) - 0.5) * 7.2;
  float pulse = smoothstep(0.8, 1.0, sin(g.x * 0.9 + g.y * 0.5 + g.z * 0.3 - uTime * 2.2) * 0.5 + 0.5);
  g *= 1.0 + sin(uTime * 0.8) * 0.012;
  if (length(g) < 1.9) g = normalize(g + 0.001) * 1.9;
  col = mix(cOps * 0.55, cWhite, pulse);
  return rotY(g, uTime * 0.08 + 0.6);
}

vec3 shell(out vec3 col){
  float i = aIndex + 0.5;
  float phi = acos(1.0 - 2.0 * i / uCount);
  float th = 3.88322 * aIndex;
  vec3 p = vec3(cos(th) * sin(phi), cos(phi), sin(th) * sin(phi)) * 3.4;
  float seg = floor(mod(th, 6.28318) / 2.09440);
  float band = smoothstep(0.93, 1.0, sin(phi * 16.0 - uTime * 1.4) * 0.5 + 0.5);
  col = mix(mix(armColor(seg), cWhite, 0.25), cWhite, band);
  return rotY(p, uTime * 0.12);
}

vec3 formation(float i, out vec3 col, out float al){
  al = 1.0;
  if (i < 0.5) return galaxy(col);
  if (i < 1.5) return wave(col, al);   // Marketing
  if (i < 2.5) return funnel(col);     // Sales
  if (i < 3.5) return lattice(col);
  return shell(col);
}

void main(){
  float s = clamp(uProgress + (aSeed.w - 0.5) * 0.35, 0.0, 4.0);
  float i0 = min(floor(s), 3.0);
  float f = smoothstep(0.1, 0.9, s - i0);
  vec3 c0, c1; float a0, a1;
  vec3 p0 = formation(i0, c0, a0);
  vec3 p1 = formation(i0 + 1.0, c1, a1);
  vec3 p = mix(p0, p1, f);
  vec3 dir = normalize(vec3(aSeed.z - 0.5, aSeed.x - 0.3, aSeed.y - 0.5) + 0.0001);
  p += dir * sin(f * 3.14159) * (1.0 + aSeed.y * 1.6);
  vec3 col = mix(c0, c1, f);
  float alpha = mix(a0, a1, f);

  // Intro: everything bursts out of the core.
  float e = clamp(uIntro * 1.6 - aSeed.y * 0.6, 0.0, 1.0);
  e = 1.0 - pow(1.0 - e, 3.0);
  p = mix(normalize(p + 0.0001) * 0.5, p, e);

  // Signup celebration.
  p *= 1.0 + uBurst * (0.2 + aSeed.x * 0.5);

  // Pointer pushes particles aside.
  vec3 d = p - uMouse;
  float m = exp(-dot(d, d) * 0.5) * uMouseStrength;
  p += normalize(d + 0.0001) * m * 1.1;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float lead = aIndex < 10.0 ? uLeadGlow : 0.0;
  float size = uSize * (0.45 + aSeed.z * 0.9) * (1.0 + lead * 7.0) * (1.0 + m * 1.2);
  gl_PointSize = size * uPixelRatio / -mv.z;
  float tw = 0.65 + 0.35 * sin(uTime * 2.0 + aSeed.x * 40.0);
  vColor = mix(col, mix(cWhite, cGold, 0.4) * 1.8, lead);
  vAlpha = alpha * tw * e * (1.0 + lead * 1.5 + m * 0.8);
}`;

const PARTICLE_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 1.7);
  gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
}`;

const CORE_VERT = /* glsl */ `
varying vec3 vPos; varying vec3 vN; varying vec3 vView;
void main(){
  vPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const CORE_FRAG = /* glsl */ `
uniform float uTime, uPulse;
uniform vec3 cSales, cMkt, cOps, cWhite;
varying vec3 vPos; varying vec3 vN; varying vec3 vView;
${NOISE}
void main(){
  float n = snoise(vPos * 1.5 + vec3(0.0, uTime * 0.3, uTime * 0.1));
  float n2 = snoise(vPos * 3.4 - vec3(uTime * 0.35));
  float t = n * 0.5 + 0.5;
  vec3 col = mix(cSales, cMkt, smoothstep(0.25, 0.6, t));
  col = mix(col, cOps, smoothstep(0.62, 0.95, t + n2 * 0.15));
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 2.2);
  float veins = smoothstep(0.9, 1.0, 1.0 - abs(n2));
  vec3 c = col * (0.25 + 0.45 * t) + cWhite * veins * 0.8 + mix(col, cWhite, 0.4) * fres * 1.1;
  c *= 1.0 + uPulse * 1.5;
  gl_FragColor = vec4(c, 1.0);
}`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SKY_FRAG = /* glsl */ `
uniform float uTime, uGlowAmt, uNebAmt;
uniform vec3 uTop, uBottom, uGlow, uNeb1, uNeb2;
varying vec3 vDir;
${NOISE}
void main(){
  float h = vDir.y;
  vec3 c = mix(uBottom, uTop, smoothstep(-0.3, 0.8, h));
  c += uGlow * exp(-abs(h + 0.04) * 7.0) * uGlowAmt;
  float neb = snoise(vDir * 2.0 + vec3(uTime * 0.01)) * 0.5 + 0.5;
  float neb2 = snoise(vDir * 4.0 - vec3(uTime * 0.012)) * 0.5 + 0.5;
  c += (uNeb1 * pow(neb, 3.0) * 0.035 + uNeb2 * pow(neb2, 4.0) * 0.03) * uNebAmt;
  gl_FragColor = vec4(c, 1.0);
}`;

const BEAM_VERT = /* glsl */ `
attribute float aT; varying float vT;
void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const BEAM_FRAG = /* glsl */ `
uniform float uTime, uOpacity; uniform vec3 uColor; varying float vT;
void main(){
  float pulse = smoothstep(0.8, 1.0, fract(vT * 2.0 - uTime * 0.7));
  float a = (0.1 + pulse) * uOpacity * smoothstep(0.0, 0.08, vT);
  gl_FragColor = vec4(uColor * (1.0 + pulse * 2.0), a);
}`;

/* ------------------------------------------------------------------ */

export function createScene(canvas, { reducedMotion = false, framing = 'page' } = {}) {
  // framing 'card': the scene lives inside a box on the page, subject always centred.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4;
  const isSmall = () =>
    framing === 'card' ? canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.9 : window.innerWidth < 760;
  let pixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  const key = new THREE.DirectionalLight(0xc9d6ff, 1.2);
  key.position.set(5, 8, 6);
  const rim = new THREE.DirectionalLight(0x9b5cff, 1.4);
  rim.position.set(-7, 2, -6);
  scene.add(key, rim, new THREE.AmbientLight(0x404a80, 0.25));

  const time = { value: 0 };
  const colorUniforms = {
    cSales: { value: COL.sales },
    cMkt: { value: COL.mkt },
    cOps: { value: COL.ops },
    cWhite: { value: COL.white },
    cPink: { value: new THREE.Color('#ff4fa3') },
    cGold: { value: new THREE.Color('#f5b942') },
  };

  // Department palettes (sky, horizon glow, nebula, lights), blended by world weight each frame.
  const PAL = Object.fromEntries(
    Object.entries(PALETTES).map(([k, p]) => [
      k,
      {
        top: new THREE.Color().setRGB(...p.top),
        bottom: new THREE.Color().setRGB(...p.bottom),
        glow: new THREE.Color(p.glow),
        glowAmt: p.glowAmt,
        neb1: new THREE.Color(p.neb1),
        neb2: new THREE.Color(p.neb2),
        key: new THREE.Color(p.key),
        rim: new THREE.Color(p.rim),
      },
    ]),
  );
  const NEB_AMT = { space: 1, mkt: 1.5, sales: 0.8, ops: 0.6 };
  const skyUniforms = {
    uTime: time,
    uTop: { value: PAL.space.top.clone() },
    uBottom: { value: PAL.space.bottom.clone() },
    uGlow: { value: PAL.space.glow.clone() },
    uGlowAmt: { value: 0 },
    uNeb1: { value: PAL.space.neb1.clone() },
    uNeb2: { value: PAL.space.neb2.clone() },
    uNebAmt: { value: 1 },
  };

  /* ---------- Deep-space backdrop ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 48, 32),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  scene.add(sky);

  const starCount = lowPower ? 900 : 1800;
  const starPos = new Float32Array(starCount * 3);
  const sr = rng(3);
  for (let i = 0; i < starCount; i++) {
    const u = sr() * 2 - 1;
    const th = sr() * TAU;
    const r = 22 + sr() * 30;
    const q = Math.sqrt(1 - u * u);
    starPos.set([Math.cos(th) * q * r, u * r, Math.sin(th) * q * r], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: 0.09, color: 0xafc0ff, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  scene.add(stars);

  const world = new THREE.Group();
  scene.add(world);

  /* ---------- The core: energy inside glass ---------- */
  const coreUniforms = { uTime: time, uPulse: { value: 0 }, ...colorUniforms };
  const energy = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 96, 64),
    new THREE.ShaderMaterial({ vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, uniforms: coreUniforms }),
  );
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0,
    transmission: lowPower ? 0 : 1,
    thickness: 0.9,
    ior: 1.42,
    iridescence: 0.8,
    iridescenceIOR: 1.3,
    iridescenceThicknessMinimum: 150,
    iridescenceThicknessMaximum: 450,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    attenuationColor: new THREE.Color('#b7c6ff'),
    attenuationDistance: 2.5,
    transparent: lowPower,
    opacity: lowPower ? 0.25 : 1,
    envMapIntensity: 1.1,
  });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.28, 96, 64), glassMat);
  const core = new THREE.Group();
  core.add(energy, glass);
  world.add(core);

  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.2), transparent: true, opacity: 0.5 });
  const rings = [
    { r: 1.75, rx: Math.PI / 2 - 0.35, ry: -0.2, speed: 0.35, col: COL.sales },
    { r: 1.98, rx: Math.PI / 2 + 0.5, ry: 0.3, speed: -0.26, col: COL.mkt },
    { r: 2.2, rx: Math.PI / 2 + 0.1, ry: 1.1, speed: 0.2, col: COL.ops },
  ].map((cfg) => {
    const pivot = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.set(cfg.rx, cfg.ry, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, 0.008, 8, 256), ringMat);
    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 12),
      new THREE.MeshBasicMaterial({ color: cfg.col.clone().multiplyScalar(4) }),
    );
    sat.position.set(cfg.r, 0, 0);
    const spinner = new THREE.Group();
    spinner.add(sat);
    tilt.add(ring, spinner);
    pivot.add(tilt);
    pivot.userData = { speed: cfg.speed, spinner };
    world.add(pivot);
    return pivot;
  });

  /* ---------- Agents on their orbit ---------- */
  const orbit = new THREE.Group();
  orbit.rotation.set(0.16, 0, -0.06);
  world.add(orbit);

  function agentMat(color, extra = {}) {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.22,
      envMapIntensity: 1.2,
      ...extra,
    });
  }

  // Sales: a target
  const sales = new THREE.Group();
  const salesBody = new THREE.Group();
  const sm = agentMat(COL.sales);
  salesBody.add(
    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.085, 32, 96), sm),
    new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 32, 96), sm),
    new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), agentMat(COL.white, { emissiveIntensity: 1.2 })),
  );
  sales.add(salesBody);

  // Marketing: a prism with content cards circling it
  const marketing = new THREE.Group();
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.95, 3, 1), agentMat(COL.mkt, { flatShading: true }));
  marketing.add(prism);
  const cardMat = new THREE.MeshPhysicalMaterial({
    color: 0x8d93b8,
    roughness: 0.3,
    clearcoat: 1,
    emissive: COL.mkt,
    emissiveIntensity: 0.06,
  });
  const cardGeo = new RoundedBoxGeometry(0.42, 0.28, 0.025, 2, 0.03);
  const stripeMat = new THREE.MeshBasicMaterial({ color: COL.mkt.clone().multiplyScalar(2.2) });
  const stripeGeo = new THREE.PlaneGeometry(0.26, 0.035);
  const cards = Array.from({ length: 6 }, () => {
    const card = new THREE.Group();
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(-0.04, 0.06, 0.014);
    card.add(new THREE.Mesh(cardGeo, cardMat), stripe);
    marketing.add(card);
    return card;
  });

  // Operations: eight cubes that click into one block
  const ops = new THREE.Group();
  const om = agentMat(COL.ops);
  const cubeGeo = new RoundedBoxGeometry(0.3, 0.3, 0.3, 3, 0.06);
  const cr = rng(7);
  const IDENT = new THREE.Quaternion();
  const cubes = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(cubeGeo, om);
    m.userData = {
      grid: new THREE.Vector3(((i & 1) - 0.5) * 0.32, (((i >> 1) & 1) - 0.5) * 0.32, (((i >> 2) & 1) - 0.5) * 0.32),
      scatter: new THREE.Vector3(cr() - 0.5, cr() - 0.5, cr() - 0.5).normalize().multiplyScalar(0.55 + cr() * 0.35),
      rq: new THREE.Quaternion().setFromEuler(new THREE.Euler(cr() * TAU, cr() * TAU, cr() * TAU)),
      ph: cr() * TAU,
    };
    ops.add(m);
    return m;
  });

  const agents = [sales, marketing, ops];
  agents.forEach((a) => orbit.add(a));

  // Energy beams from each agent into the core
  const BEAM_PTS = 48;
  const beams = agents.map((_, i) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEAM_PTS * 3), 3));
    const at = new Float32Array(BEAM_PTS);
    for (let k = 0; k < BEAM_PTS; k++) at[k] = k / (BEAM_PTS - 1);
    geo.setAttribute('aT', new THREE.BufferAttribute(at, 1));
    const line = new THREE.Line(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms: { uTime: time, uOpacity: { value: 0 }, uColor: { value: AGENT_COLORS[i].clone().multiplyScalar(1.6) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    line.frustumCulled = false;
    world.add(line);
    return line;
  });

  /* ---------- The particle universe ---------- */
  const latN = lowPower ? 17 : 24;
  const COUNT = latN * latN * latN;
  const pGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(COUNT * 4);
  const index = new Float32Array(COUNT);
  const pr = rng(42);
  for (let i = 0; i < COUNT; i++) {
    seeds.set([pr(), pr(), pr(), pr()], i * 4);
    index[i] = i;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  pGeo.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
  const pUniforms = {
    uTime: time,
    uProgress: { value: 0 },
    uIntro: { value: reducedMotion ? 1 : 0 },
    uBurst: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uSize: { value: lowPower ? 30 : 34 },
    uCount: { value: COUNT },
    uLatN: { value: latN },
    uLeadGlow: { value: 0 },
    uMouse: { value: new THREE.Vector3(999, 999, 999) },
    uMouseStrength: { value: 0 },
    uOpacity: { value: lowPower ? 0.7 : 0.55 },
    ...colorUniforms,
  };
  const particles = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  particles.frustumCulled = false;
  world.add(particles);

  /* ---------- Department worlds (Marketing, Sales, Operations) ---------- */
  const worlds = createWorlds({ lowPower });
  world.add(worlds.root);
  const AGENT_STAGE = [2, 1, 3]; // agents array is [sales, marketing, ops]; stages: Marketing 1, Sales 2, Ops 3

  /* ---------- "You" join the orbit after signing up ---------- */
  const you = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4.5) }),
  );
  you.visible = false;
  world.add(you);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: COL.white.clone().multiplyScalar(2),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.015, 8, 200), pulseMat);
  pulseRing.rotation.x = Math.PI / 2 + 0.16;
  world.add(pulseRing);
  const youState = { active: false, t: 1, angle: 0, from: new THREE.Vector3(), burstT: 1 };
  const YOU_R = 2.55;
  const youOrbit = (a, out) => out.set(Math.cos(a) * YOU_R, Math.sin(a * 2) * 0.3 + 0.4, Math.sin(a) * YOU_R);

  /* ---------- Postprocessing: bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  const bloomBase = lowPower ? 0.5 : 0.6;
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bloomBase, 0.42, 0.42);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- Camera path ---------- */
  // One keyframe per stage: team, Marketing, Sales, Operations, control centre.
  const DESK_POS = [
    [0, 1.9, 14],
    [-5.5, 4.2, 11.5],
    [9.5, 0.2, 13.5],
    [9, 4.2, -6.5],
    [0, 0.6, 15.5],
  ];
  const DESK_TARGET = [
    [0, -0.4, 0],
    [0, 1.5, 0],
    [0, 2.0, 0],
    [0, 0, 0],
    [0, 2.9, 0],
  ];
  // Phones: copy sits at the bottom, so the subject is framed higher.
  const MOB_POS = [
    [0, 2.2, 21],
    [-7.5, 5.8, 16],
    [13, 0.4, 18.5],
    [12, 5.4, -9],
    [0, 0.6, 20],
  ];
  const MOB_TARGET = [
    [0, -1, 0],
    [0, -0.4, 0],
    [0, 0.2, 0],
    [0, -1.6, 0],
    [0, 3.6, 0],
  ];
  const SIDE_SHIFT = [0, 2.1, 2.3, 2.1, 0]; // pushes the subject right of the text on desktop
  const toVecs = (arr) => arr.map((p) => new THREE.Vector3(...p));
  const paths = {
    desk: {
      pos: new THREE.CatmullRomCurve3(toVecs(DESK_POS), false, 'centripetal'),
      target: new THREE.CatmullRomCurve3(toVecs(DESK_TARGET), false, 'centripetal'),
    },
    mob: {
      pos: new THREE.CatmullRomCurve3(toVecs(MOB_POS), false, 'centripetal'),
      target: new THREE.CatmullRomCurve3(toVecs(MOB_TARGET), false, 'centripetal'),
    },
  };
  if (framing === 'card') {
    const CARD_POS = [
      [0, 2.4, 13.5],
      [-5.5, 4.4, 12.5],
      [9.5, 0.6, 12.5],
      [9, 4.2, -7],
      [0, 1.6, 11.5],
    ];
    const CARD_TARGET = [
      [0, -0.1, 0],
      [0, 1.3, 0],
      [0, 2.1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const curve = (arr) => new THREE.CatmullRomCurve3(toVecs(arr), false, 'centripetal');
    paths.desk = { pos: curve(CARD_POS), target: curve(CARD_TARGET) };
    paths.mob = { pos: curve(CARD_POS.map((p) => p.map((v) => v * 1.35))), target: curve(CARD_TARGET) };
  }
  const INTRO_FROM = new THREE.Vector3(-7, 10, 26);

  /* ---------- State ---------- */
  const state = {
    progress: 0,
    progressTarget: 0,
    pointer: { x: 0, y: 0, lastMove: -10 },
    orbitAngle: 0.95,
    intro: reducedMotion ? 1 : 0,
    introStart: null,
    started: reducedMotion,
  };

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const agentPos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const desiredPos = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const ndc = new THREE.Vector2();
  const mouseWorld = new THREE.Vector3();
  let firstFrame = true;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 46 : 38;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  const motion = reducedMotion ? 0.3 : 1;
  const perf = { frames: 0, since: 0, checked: false };

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    time.value = t * motion;
    const small = isSmall();

    // Intro runs on real time once start() is called.
    if (state.started && state.intro < 1) {
      if (state.introStart === null) state.introStart = t;
      state.intro = Math.min(1, (t - state.introStart) / 3.2);
    }
    const intro = state.intro;
    pUniforms.uIntro.value = intro;

    state.progress = lerp(state.progress, state.progressTarget, 1 - Math.exp(-dt * 5));
    const prog = state.progress;
    pUniforms.uProgress.value = prog;
    pUniforms.uLeadGlow.value = clamp01(1 - Math.abs(prog - 2) * 2.5);

    // World weights and the blended atmosphere
    const wk = (k) => {
      const x = clamp01(1 - Math.abs(prog - k) * 1.25);
      return x * x * (3 - 2 * x);
    };
    const W = { mkt: wk(1), sales: wk(2), ops: wk(3) };
    const dept = W.mkt + W.sales + W.ops;
    const weights = { space: Math.max(0, 1 - dept), ...W };
    const norm = 1 / Math.max(1, weights.space + dept);
    const blend = (target, field) => {
      target.setRGB(0, 0, 0);
      for (const k in weights) {
        const f = weights[k] * norm;
        if (f <= 0) continue;
        target.r += PAL[k][field].r * f;
        target.g += PAL[k][field].g * f;
        target.b += PAL[k][field].b * f;
      }
    };
    blend(skyUniforms.uTop.value, 'top');
    blend(skyUniforms.uBottom.value, 'bottom');
    blend(skyUniforms.uGlow.value, 'glow');
    blend(skyUniforms.uNeb1.value, 'neb1');
    blend(skyUniforms.uNeb2.value, 'neb2');
    blend(key.color, 'key');
    blend(rim.color, 'rim');
    let glowAmt = 0;
    let nebAmt = 0;
    for (const k in weights) {
      glowAmt += PAL[k].glowAmt * weights[k] * norm;
      nebAmt += NEB_AMT[k] * weights[k] * norm;
    }
    skyUniforms.uGlowAmt.value = glowAmt;
    skyUniforms.uNebAmt.value = nebAmt;
    bloom.strength = bloomBase * (1 - 0.1 * W.mkt - 0.05 * W.sales - 0.2 * W.ops);
    stars.material.opacity = 0.75 * (1 - 0.7 * Math.min(1, dept));

    // Core
    core.scale.setScalar(lerp(0.35, 1, easeBack((intro - 0.05) / 0.45)));
    energy.rotation.y += dt * 0.15 * motion;
    const ringIn = easeOut((intro - 0.15) / 0.5);
    rings.forEach((r, i) => {
      r.rotation.y += (r.userData.speed * 0.3 + (1 - ringIn) * (i % 2 ? -3 : 3)) * dt * motion;
      r.userData.spinner.rotation.z += r.userData.speed * dt * 2.5 * motion;
      r.scale.setScalar(Math.max(0.001, lerp(0.3, 1, ringIn)));
    });
    ringMat.opacity = 0.5 * ringIn;

    // Agents: spiral out on intro, orbit, grow when it's their section.
    state.orbitAngle += dt * 0.08 * motion;
    agents.forEach((a, i) => {
      const out = easeOut((intro - 0.32 - i * 0.1) / 0.5);
      const focus = clamp01(1 - Math.abs(prog - AGENT_STAGE[i]) * 1.4);
      // All three agents in the hero and the close; only the featured one in its own scene.
      const vis = Math.max(clamp01(1 - prog / 0.6), clamp01((prog - 3.45) / 0.45), focus);
      const ang = state.orbitAngle + (i * TAU) / 3 - (1 - out) * 1.6;
      const r = ORBIT_R * lerp(0.2, 1, out);
      a.position.set(Math.cos(ang) * r, Math.sin(t * 0.8 + i * 2) * 0.14, Math.sin(ang) * r);
      a.scale.setScalar(Math.max(0.001, out * vis * (1 + focus * 0.45)));
      a.getWorldPosition(agentPos[i]);

      // Beam from agent into the core
      const beam = beams[i];
      const pos = beam.geometry.attributes.position;
      const from = agentPos[i];
      const to = tmp.copy(from).normalize().multiplyScalar(1.3);
      const ctrl = tmp2.copy(from).add(to).multiplyScalar(0.5).add(UP);
      for (let k = 0; k < BEAM_PTS; k++) {
        const u = k / (BEAM_PTS - 1);
        const v = 1 - u;
        pos.setXYZ(
          k,
          v * v * from.x + 2 * v * u * ctrl.x + u * u * to.x,
          v * v * from.y + 2 * v * u * ctrl.y + u * u * to.y,
          v * v * from.z + 2 * v * u * ctrl.z + u * u * to.z,
        );
      }
      pos.needsUpdate = true;
      beam.material.uniforms.uOpacity.value = out * vis * (0.35 + focus * 0.65);
    });

    salesBody.lookAt(camera.position);
    salesBody.rotateZ(t * 0.2 * motion);
    prism.rotation.y += dt * 0.4 * motion;
    cards.forEach((c, i) => {
      const ang = t * 0.55 * motion + (i * TAU) / cards.length;
      c.position.set(Math.cos(ang) * 0.98, Math.sin(ang * 2 + i) * 0.18, Math.sin(ang) * 0.98);
      c.rotation.set(0, -ang + Math.PI / 2, Math.sin(t + i) * 0.1);
    });
    const opsSnap = 0.15 + 0.85 * clamp01(1 - Math.abs(prog - 3) * 1.3);
    cubes.forEach((m) => {
      const { grid, scatter, rq, ph } = m.userData;
      tmp.copy(scatter).multiplyScalar(1 + Math.sin(t * 0.9 * motion + ph) * 0.12);
      m.position.lerpVectors(tmp, grid, opsSnap);
      m.quaternion.slerpQuaternions(rq, IDENT, opsSnap);
    });
    ops.rotation.y += dt * 0.25 * motion;

    // Visitor + celebration
    if (youState.active) {
      if (youState.t < 1) {
        youState.t = Math.min(1, youState.t + dt / 1.8);
        const e = easeOut(youState.t);
        youOrbit(youState.angle, tmp2);
        const ctrl = tmp.copy(youState.from).add(tmp2).multiplyScalar(0.5).add(new THREE.Vector3(0, 2.4, 0));
        const v = 1 - e;
        you.position.set(
          v * v * youState.from.x + 2 * v * e * ctrl.x + e * e * tmp2.x,
          v * v * youState.from.y + 2 * v * e * ctrl.y + e * e * tmp2.y,
          v * v * youState.from.z + 2 * v * e * ctrl.z + e * e * tmp2.z,
        );
        you.scale.setScalar(lerp(2.5, 1, e));
      } else {
        youState.angle += dt * 0.35 * motion;
        youOrbit(youState.angle, you.position);
      }
    }
    if (youState.burstT < 1) {
      youState.burstT = Math.min(1, youState.burstT + dt / 1.8);
      const b = youState.burstT;
      const env = Math.sin(Math.min(1, b * 2.2) * Math.PI) * (1 - b * 0.3);
      pUniforms.uBurst.value = env;
      coreUniforms.uPulse.value = env;
      pulseRing.scale.setScalar(lerp(1, 4.5, easeOut(b)));
      pulseMat.opacity = (1 - b) * 0.9;
    }

    stars.rotation.y += dt * 0.004;

    // Camera along the spline
    const path = small ? paths.mob : paths.desk;
    const u = clamp01(prog / 4);
    path.pos.getPoint(u, desiredPos);
    path.target.getPoint(u, desiredTarget);
    if (!small && framing !== 'card') {
      const k = Math.floor(Math.min(prog, 3.999));
      const shift = lerp(SIDE_SHIFT[k], SIDE_SHIFT[k + 1], prog - k) * (window.innerWidth < 1100 ? 0.55 : 1);
      const fwd = tmp.subVectors(desiredTarget, desiredPos).normalize();
      const right = tmp2.crossVectors(fwd, UP).normalize();
      desiredTarget.addScaledVector(right, -shift);
    }
    const introCam = easeOut(intro / 0.95);
    desiredPos.lerp(INTRO_FROM, 1 - introCam);
    desiredPos.x += Math.sin(t * 0.13) * 0.35 * motion;
    desiredPos.y += Math.sin(t * 0.17) * 0.25 * motion;
    if (!coarse) {
      desiredPos.x += state.pointer.x * 0.7;
      desiredPos.y += state.pointer.y * 0.4;
    }

    if (firstFrame) {
      camera.position.copy(desiredPos);
      camTarget.copy(desiredTarget);
      firstFrame = false;
    } else {
      const a = 1 - Math.exp(-dt * 3);
      camera.position.lerp(desiredPos, a);
      camTarget.lerp(desiredTarget, a);
    }
    camera.lookAt(camTarget);

    // Pointer in world space (on a plane through the subject, facing the camera)
    if (!coarse) {
      ndc.set(state.pointer.x, state.pointer.y);
      raycaster.setFromCamera(ndc, camera);
      camera.getWorldDirection(tmp);
      plane.setFromNormalAndCoplanarPoint(tmp, desiredTarget);
      if (raycaster.ray.intersectPlane(plane, mouseWorld)) pUniforms.uMouse.value.lerp(mouseWorld, 1 - Math.exp(-dt * 10));
      const active = t - state.pointer.lastMove < 1.2 ? 1 : 0;
      pUniforms.uMouseStrength.value = lerp(pUniforms.uMouseStrength.value, active * intro, 1 - Math.exp(-dt * 3));
    }

    worlds.update({
      dt,
      t,
      motion,
      w: W,
      camera,
      raycaster,
      pointerActive: !coarse && t - state.pointer.lastMove < 1.2,
    });

    composer.render(dt);

    // If the device struggles, render at a lower resolution.
    if (!perf.checked && intro >= 1) {
      perf.frames++;
      perf.since += dt;
      if (perf.since > 2) {
        perf.checked = true;
        if (perf.frames / perf.since < 40 && pixelRatio > 1) {
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          composer.setPixelRatio(1);
          pUniforms.uPixelRatio.value = 1;
          resize();
        }
      }
    }
  }

  let running = true;
  renderer.setAnimationLoop(tick);

  return {
    // Pause rendering while the scene is off screen.
    setActive(on) {
      if (on === running) return;
      running = on;
      if (on) clock.getDelta();
      renderer.setAnimationLoop(on ? tick : null);
    },
    // Render one still of a formation (used to make the page's images).
    capture(p, type = 'image/webp') {
      state.progress = state.progressTarget = p;
      state.intro = 1;
      state.started = true;
      firstFrame = true;
      tick();
      tick();
      return canvas.toDataURL(type, 0.9);
    },
    start() {
      state.started = true;
    },
    setProgress(p) {
      state.progressTarget = Math.min(4, Math.max(0, p));
    },
    setPointer(x, y) {
      state.pointer.x = x;
      state.pointer.y = y;
      state.pointer.lastMove = clock.elapsedTime;
    },
    join({ instant = false } = {}) {
      youState.active = true;
      you.visible = true;
      youState.angle = state.orbitAngle + 1.2;
      if (instant) {
        youState.t = 1;
        return;
      }
      youState.from.copy(camera.position).lerp(camTarget, 0.3).add(new THREE.Vector3(0, -1.5, 0));
      youState.t = 0;
      youState.burstT = 0;
    },
    _debug: () => ({ ...state, cam: camera.position.toArray(), pixelRatio }),
    _replayIntro() {
      state.intro = 0;
      state.introStart = null;
      state.started = true;
    },
  };
}
