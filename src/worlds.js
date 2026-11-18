import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
 * Department worlds — each one an environment built around what that team does.
 *   Marketing  (stage 1): floating campaign screens, social icons, a creative knot, rising engagement.
 *   Sales      (stage 2): a revenue skyline, a growth line, KPI dashboards and coins from converted leads.
 *   Operations (stage 3): a node network with data packets, interlocking gears and a task conveyor.
 * Everything is procedural (no model files). Textures are drawn once on small canvases.
 */

const TAU = Math.PI * 2;
const FLOOR_Y = -2.6;
const FONT = '"Inter Tight", "Geist", system-ui, sans-serif';
const DOTS = '"Doto", "Geist", monospace';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

// Sky, light and floor palette per world; scene.js blends them by world weight.
export const PALETTES = {
  space: { top: [0.002, 0.003, 0.012], bottom: [0.008, 0.01, 0.035], glow: '#6d5cff', glowAmt: 0, neb1: '#9B5CFF', neb2: '#4C7DFF', key: '#c9d6ff', rim: '#9b5cff', floor: '#8fa8ff' },
  mkt: { top: [0.008, 0.002, 0.016], bottom: [0.03, 0.004, 0.026], glow: '#ff4fa3', glowAmt: 0.05, neb1: '#ff4fa3', neb2: '#ff8a3d', key: '#ffd6ea', rim: '#ff4fa3', floor: '#ff6fb5' },
  sales: { top: [0.001, 0.003, 0.012], bottom: [0.008, 0.016, 0.055], glow: '#f5b942', glowAmt: 0.045, neb1: '#4c7dff', neb2: '#f5b942', key: '#ffe7b0', rim: '#4c7dff', floor: '#f5b942' },
  ops: { top: [0.001, 0.006, 0.007], bottom: [0.003, 0.026, 0.024], glow: '#2fd0b5', glowAmt: 0.045, neb1: '#2fd0b5', neb2: '#8ff7e2', key: '#d9fff5', rim: '#2fd0b5', floor: '#2fd0b5' },
};

/* ---------------- canvas helpers ---------------- */
function makeTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function txt(g, s, x, y, size, color = '#fff', weight = 600, font = FONT, align = 'left') {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}
function heart(g, cx, cy, s, color) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.35);
  g.bezierCurveTo(cx - s * 0.05, cy + s * 0.3, cx - s * 0.5, cy + s * 0.05, cx - s * 0.5, cy - s * 0.2);
  g.bezierCurveTo(cx - s * 0.5, cy - s * 0.45, cx - s * 0.22, cy - s * 0.55, cx, cy - s * 0.32);
  g.bezierCurveTo(cx + s * 0.22, cy - s * 0.55, cx + s * 0.5, cy - s * 0.45, cx + s * 0.5, cy - s * 0.2);
  g.bezierCurveTo(cx + s * 0.5, cy + s * 0.05, cx + s * 0.05, cy + s * 0.3, cx, cy + s * 0.35);
  g.fillStyle = color;
  g.fill();
}
function bars(g, x, y, w, rows, color = '#e6e8f0') {
  rows.forEach((f, i) => {
    rrect(g, x, y + i * 22, w * f, 10, 5);
    g.fillStyle = color;
    g.fill();
  });
}
function card(g, w, h, fill, stroke) {
  rrect(g, 3, 3, w - 6, h - 6, 34);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = 3;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

/* ---------------- Marketing screens ---------------- */
const MKT_SCREENS = [
  {
    w: 1.15,
    h: 1.7,
    draw: (g, w, h) => {
      card(g, w, h, '#ffffff');
      const av = lin(g, 30, 30, 70, 70, [[0, '#ff4fa3'], [1, '#ff8a3d']]);
      g.beginPath();
      g.arc(52, 52, 22, 0, TAU);
      g.fillStyle = av;
      g.fill();
      txt(g, '@yourbrand', 86, 60, 24, '#14121f', 650);
      rrect(g, 20, 92, w - 40, 300, 22);
      g.fillStyle = lin(g, 20, 92, w - 20, 392, [[0, '#ff4fa3'], [0.55, '#9b5cff'], [1, '#ff8a3d']]);
      g.fill();
      g.beginPath();
      g.arc(w * 0.7, 170, 70, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fill();
      rrect(g, w * 0.3, 210, w * 0.4, 130, 18);
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fill();
      txt(g, 'NEW', w * 0.5, 290, 40, '#9b5cff', 800, FONT, 'center');
      heart(g, 46, 432, 36, '#ff3b6b');
      txt(g, '2,481 likes', 80, 442, 24, '#14121f', 650);
      bars(g, 24, 470, w - 48, [0.95, 0.7, 0.5]);
    },
  },
  {
    w: 1.15,
    h: 1.7,
    draw: (g, w, h) => {
      card(g, w, h, '#150b24');
      rrect(g, 3, 3, w - 6, h - 6, 34);
      g.fillStyle = lin(g, 0, 0, w, h, [[0, 'rgba(255,79,163,0.55)'], [1, 'rgba(155,92,255,0.15)']]);
      g.fill();
      g.beginPath();
      g.arc(w / 2, h * 0.42, 62, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fill();
      g.beginPath();
      g.moveTo(w / 2 - 18, h * 0.42 - 28);
      g.lineTo(w / 2 + 30, h * 0.42);
      g.lineTo(w / 2 - 18, h * 0.42 + 28);
      g.closePath();
      g.fillStyle = '#ff4fa3';
      g.fill();
      txt(g, 'Reel', 30, h - 110, 30, '#fff', 700);
      txt(g, '48.2k views', 30, h - 72, 24, 'rgba(255,255,255,0.75)', 500);
      rrect(g, 30, h - 44, w - 60, 8, 4);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fill();
      rrect(g, 30, h - 44, (w - 60) * 0.62, 8, 4);
      g.fillStyle = '#ff4fa3';
      g.fill();
    },
  },
  {
    w: 1.9,
    h: 1.15,
    draw: (g, w, h) => {
      card(g, w, h, lin(g, 0, 0, w, h, [[0, '#7b3cff'], [1, '#ff4fa3']]));
      g.beginPath();
      g.arc(w - 90, 80, 120, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fill();
      txt(g, 'Festive sale', 44, 120, 64, '#fff', 750);
      txt(g, '20% off bulk orders', 46, 170, 30, 'rgba(255,255,255,0.85)', 500);
      rrect(g, 44, h - 120, 210, 70, 35);
      g.fillStyle = '#fff';
      g.fill();
      txt(g, 'Shop now', 149, h - 74, 28, '#c2185b', 700, FONT, 'center');
      txt(g, 'Sponsored', w - 44, h - 50, 22, 'rgba(255,255,255,0.7)', 500, FONT, 'right');
    },
  },
  {
    w: 1.9,
    h: 1.15,
    draw: (g, w, h) => {
      card(g, w, h, '#ffffff');
      txt(g, 'Reach this month', 40, 70, 26, '#6b7083', 500);
      txt(g, '+182%', 40, 160, 82, '#ff2f8e', 750);
      g.beginPath();
      const pts = [0.1, 0.18, 0.15, 0.3, 0.28, 0.45, 0.52, 0.7, 0.92];
      pts.forEach((v, i) => {
        const x = 40 + (i / (pts.length - 1)) * (w - 80);
        const y = h - 40 - v * 170;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.lineWidth = 7;
      g.lineJoin = 'round';
      g.strokeStyle = '#ff4fa3';
      g.stroke();
      g.lineTo(w - 40, h - 40);
      g.lineTo(40, h - 40);
      g.closePath();
      g.fillStyle = lin(g, 0, h - 220, 0, h - 40, [[0, 'rgba(255,79,163,0.3)'], [1, 'rgba(255,79,163,0)']]);
      g.fill();
    },
  },
  {
    w: 1.9,
    h: 1.15,
    draw: (g, w, h) => {
      card(g, w, h, '#ffffff');
      txt(g, 'Content calendar', 40, 68, 30, '#14121f', 700);
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const colW = (w - 80) / 7;
      const cols = ['#ffd0e6', '#e6d9ff', '#ffe1c7'];
      const txc = ['#c2185b', '#6431c9', '#c2410c'];
      const kinds = ['Post', 'Reel', 'Blog'];
      days.forEach((d, i) => {
        txt(g, d, 40 + colW * i + colW / 2, 116, 22, '#9aa0b2', 600, FONT, 'center');
        const n = 1 + ((i * 7) % 3 === 0 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const kind = (i + k) % 3;
          rrect(g, 44 + colW * i, 136 + k * 74, colW - 8, 64, 12);
          g.fillStyle = cols[kind];
          g.fill();
          txt(g, kinds[kind], 44 + colW * i + (colW - 8) / 2, 176 + k * 74, 18, txc[kind], 700, FONT, 'center');
        }
      });
    },
  },
  {
    w: 1.9,
    h: 1.15,
    draw: (g, w, h) => {
      card(g, w, h, '#17102b', 'rgba(255,255,255,0.12)');
      txt(g, 'Brand kit', 40, 70, 30, '#fff', 700);
      ['#ff4fa3', '#9b5cff', '#ff8a3d', '#ffffff', '#14121f'].forEach((c, i) => {
        g.beginPath();
        g.arc(70 + i * 76, 150, 30, 0, TAU);
        g.fillStyle = c;
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = 'rgba(255,255,255,0.3)';
        g.stroke();
      });
      txt(g, 'Aa', 40, h - 50, 120, '#fff', 700);
      txt(g, 'Voice: warm, expert', w - 40, h - 64, 24, 'rgba(255,255,255,0.7)', 500, FONT, 'right');
    },
  },
  {
    w: 1.15,
    h: 1.7,
    draw: (g, w, h) => {
      card(g, w, h, lin(g, 0, 0, 0, h, [[0, '#ff8a3d'], [1, '#ff2f8e']]));
      rrect(g, 40, 110, w - 80, 90, 20);
      g.fillStyle = '#fff';
      g.fill();
      txt(g, 'New launch', w / 2, 168, 34, '#ff2f8e', 800, FONT, 'center');
      g.beginPath();
      g.arc(w / 2, h * 0.58, 90, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fill();
      txt(g, 'Story', 36, h - 80, 30, '#fff', 700);
      txt(g, '12.4k reached', 36, h - 44, 24, 'rgba(255,255,255,0.85)', 500);
    },
  },
];

const POP_TEXT = ['+2.4k reach', '+186 likes', '+38 leads', '+1.2k views', '+64 shares', '+12% followers'];

/* ---------------- Sales dashboards ---------------- */
const glass = (g, w, h, accent) => card(g, w, h, 'rgba(9,14,38,0.86)', accent);
const SALES_CARDS = [
  (g, w, h) => {
    glass(g, w, h, 'rgba(245,185,66,0.55)');
    txt(g, 'Revenue this quarter', 40, 70, 26, '#9aa8d6', 500);
    txt(g, '₹42.6L', 40, 170, 92, '#ffffff', 750);
    txt(g, '▲ 38%', 40, 230, 34, '#f5b942', 700);
    g.beginPath();
    [0.2, 0.25, 0.22, 0.38, 0.35, 0.55, 0.62, 0.85].forEach((v, i, a) => {
      const x = w * 0.45 + (i / (a.length - 1)) * (w * 0.5);
      const y = h - 50 - v * 180;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.lineWidth = 7;
    g.strokeStyle = '#f5b942';
    g.stroke();
  },
  (g, w, h) => {
    glass(g, w, h, 'rgba(76,125,255,0.6)');
    txt(g, 'Win rate', 40, 70, 26, '#9aa8d6', 500);
    g.lineWidth = 22;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(w - 150, h / 2 + 10, 90, 0, TAU);
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.stroke();
    g.beginPath();
    g.arc(w - 150, h / 2 + 10, 90, -Math.PI / 2, -Math.PI / 2 + TAU * 0.27);
    g.strokeStyle = '#f5b942';
    g.stroke();
    txt(g, '27%', 40, 190, 100, '#fff', 750);
    txt(g, 'up from 19%', 40, 240, 28, '#7fe0b0', 600);
  },
  (g, w, h) => {
    glass(g, w, h, 'rgba(245,185,66,0.55)');
    txt(g, 'Best match', 40, 70, 26, '#9aa8d6', 500);
    txt(g, '92/100', 40, 175, 96, '#fff', 800, DOTS);
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.arc(52 + i * 52, 240, 16, 0, TAU);
      g.fillStyle = '#f5b942';
      g.fill();
    }
  },
  (g, w, h) => {
    glass(g, w, h, 'rgba(47,208,143,0.6)');
    g.beginPath();
    g.arc(78, 92, 36, 0, TAU);
    g.fillStyle = '#2fd08f';
    g.fill();
    g.beginPath();
    g.moveTo(62, 92);
    g.lineTo(74, 106);
    g.lineTo(96, 78);
    g.lineWidth = 7;
    g.strokeStyle = '#fff';
    g.stroke();
    txt(g, 'Deal won', 134, 104, 36, '#fff', 700);
    txt(g, 'Voltline Power', 40, 196, 34, '#cfd6f2', 500);
    txt(g, '₹3,40,000', 40, 262, 64, '#f5b942', 750);
  },
];

/* ---------------- Operations panels ---------------- */
const opsCard = (g, w, h) => card(g, w, h, 'rgba(236,255,250,0.95)', 'rgba(47,208,181,0.8)');
const OPS_CARDS = [
  (g, w, h) => {
    opsCard(g, w, h);
    txt(g, 'Workflow · Order #2291', 40, 66, 28, '#0b3b34', 700);
    const steps = ['Enquiry', 'Stock', 'Quote', 'Invoice'];
    const y = 170;
    g.lineWidth = 6;
    g.strokeStyle = '#2fd0b5';
    g.beginPath();
    g.moveTo(80, y);
    g.lineTo(w - 80, y);
    g.stroke();
    steps.forEach((s, i) => {
      const x = 80 + (i * (w - 160)) / 3;
      g.beginPath();
      g.arc(x, y, 28, 0, TAU);
      g.fillStyle = i < 3 ? '#2fd0b5' : '#ffffff';
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = '#2fd0b5';
      g.stroke();
      if (i < 3) {
        g.beginPath();
        g.moveTo(x - 11, y);
        g.lineTo(x - 3, y + 9);
        g.lineTo(x + 12, y - 9);
        g.strokeStyle = '#fff';
        g.stroke();
      }
      txt(g, s, x, y + 70, 24, '#0b3b34', 600, FONT, 'center');
    });
  },
  (g, w, h) => {
    opsCard(g, w, h);
    txt(g, "Today's tasks", 40, 66, 28, '#0b3b34', 700);
    ['Order #2291 dispatched', 'Invoice INV-142 sent', 'Stock reorder drafted'].forEach((s, i) => {
      const y = 130 + i * 62;
      g.beginPath();
      g.arc(58, y - 8, 15, 0, TAU);
      g.fillStyle = '#2fd0b5';
      g.fill();
      txt(g, s, 90, y, 28, '#12312c', 500);
    });
  },
  (g, w, h) => {
    opsCard(g, w, h);
    txt(g, 'Automations running', 40, 66, 28, '#0b3b34', 700);
    txt(g, '24', 40, 200, 120, '#0fa38b', 800, DOTS);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = w * 0.42 + (i / 40) * w * 0.5;
      const y = 160 + Math.sin(i * 0.9) * (i % 9 === 4 ? 60 : 10);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.lineWidth = 5;
    g.strokeStyle = '#2fd0b5';
    g.stroke();
  },
];

/* ---------------- geometry helpers ---------------- */
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.35);
  s.bezierCurveTo(-0.05, -0.3, -0.5, -0.05, -0.5, 0.2);
  s.bezierCurveTo(-0.5, 0.45, -0.22, 0.55, 0, 0.32);
  s.bezierCurveTo(0.22, 0.55, 0.5, 0.45, 0.5, 0.2);
  s.bezierCurveTo(0.5, -0.05, 0.05, -0.3, 0, -0.35);
  return s;
}
function starShape(points = 5, ro = 0.5, ri = 0.22) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (i / (points * 2)) * TAU + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
function playShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.28, -0.36);
  s.lineTo(0.42, 0);
  s.lineTo(-0.28, 0.36);
  s.closePath();
  return s;
}
function bubbleShape() {
  const s = new THREE.Shape();
  const w = 0.55;
  const h = 0.38;
  const r = 0.16;
  s.moveTo(-w + r, -h);
  s.lineTo(-0.1, -h);
  s.lineTo(-0.28, -h - 0.2);
  s.lineTo(-0.3, -h);
  s.lineTo(-w + r, -h);
  s.quadraticCurveTo(-w, -h, -w, -h + r);
  s.lineTo(-w, h - r);
  s.quadraticCurveTo(-w, h, -w + r, h);
  s.lineTo(w - r, h);
  s.quadraticCurveTo(w, h, w, h - r);
  s.lineTo(w, -h + r);
  s.quadraticCurveTo(w, -h, w - r, -h);
  s.lineTo(-0.1, -h);
  return s;
}
function gearShape(teeth, rOuter, rRoot, hole) {
  const s = new THREE.Shape();
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rRoot, a],
      [rOuter, a + step * 0.15],
      [rOuter, a + step * 0.45],
      [rRoot, a + step * 0.6],
    ];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      i === 0 && k === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    });
  }
  s.closePath();
  s.holes.push(new THREE.Path().absarc(0, 0, hole, 0, TAU, true));
  return s;
}
const extrude = (shape, depth = 0.22) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geo.center();
  return geo;
};
const glossy = (color, emissive = 0.3, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    emissive: color,
    emissiveIntensity: emissive,
    ...extra,
  });
const glowMat = (hex, k = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) });

/* ================================================================== */

export function createWorlds({ lowPower = false } = {}) {
  const root = new THREE.Group();
  const groups = { mkt: new THREE.Group(), sales: new THREE.Group(), ops: new THREE.Group() };
  Object.values(groups).forEach((g) => root.add(g));

  const items = []; // things that animate in/out with their world
  const interactive = []; // meshes the pointer can hover
  const billboards = []; // cards that always face the camera
  const add = (world, obj, opts = {}) => {
    groups[world].add(obj);
    const it = {
      world,
      obj,
      delay: opts.delay ?? 0,
      base: obj.position.clone(),
      scale: opts.scale ?? 1,
      rise: opts.rise ?? 1.2,
      hover: 0,
      ...opts,
    };
    obj.userData.item = it;
    items.push(it);
    if (opts.hoverable) {
      obj.traverse((m) => {
        if (m.isMesh) {
          m.userData.item = it;
          interactive.push(m);
        }
      });
    }
    if (opts.billboard) billboards.push(it);
    return it;
  };
  const panelMesh = (tex, w, h, bright = 1) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide });
    mat.color.setScalar(bright);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  };

  /* ---------- shared floor (grid for Sales/Ops, dots for Marketing) ---------- */
  const floorUniforms = {
    uColor: { value: new THREE.Color('#8fa8ff') },
    uOpacity: { value: 0 },
    uScale: { value: 0.9 },
    uTime: { value: 0 },
    uScan: { value: 0 },
    uDots: { value: 0 },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.ShaderMaterial({
      uniforms: floorUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity, uScale, uTime, uScan, uDots;
        varying vec3 vW;
        void main(){
          vec2 p = vW.xz * uScale;
          vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
          float line = 1.0 - min(min(g.x, g.y), 1.0);
          float dotv = 1.0 - smoothstep(0.035, 0.075, length(fract(p) - 0.5));
          float pattern = mix(line, dotv, uDots);
          float r = length(vW.xz);
          float fade = smoothstep(17.0, 2.5, r);
          float ring = uScan * smoothstep(0.3, 0.0, abs(r - mod(uTime * 2.6, 17.0)));
          float a = (pattern * 0.5 + ring * 0.9) * fade * uOpacity;
          gl_FragColor = vec4(uColor * (1.0 + ring * 1.5), a);
        }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  root.add(floor);

  /* ================= MARKETING ================= */
  const screenCount = lowPower ? 5 : MKT_SCREENS.length;
  for (let i = 0; i < screenCount; i++) {
    const def = MKT_SCREENS[i];
    const px = def.w > def.h ? [640, 388] : [400, 592];
    const m = panelMesh(makeTex(px[0], px[1], def.draw), def.w, def.h, 0.62);
    const behind = Math.atan2(11.5, -5.5) + Math.PI; // opposite the Marketing camera
    const a = behind - 1.9 + (i / Math.max(1, screenCount - 1)) * 3.8;
    const r = 4.6 + (i % 2) * 1.5;
    m.position.set(Math.cos(a) * r, 0.1 + ((i * 2) % 3) * 1.5, Math.sin(a) * r);
    add('mkt', m, { delay: i * 0.05, hoverable: true, billboard: true, bob: 0.18, phase: i * 1.3 });
  }

  const icons = [
    { geo: extrude(heartShape(), 0.24), color: '#ff3d8b', pos: [-2.9, 2.4, -0.6], s: 0.9 },
    { geo: extrude(playShape(), 0.22), color: '#ff8a3d', pos: [3.0, 2.9, 0.4], s: 0.85 },
    { geo: extrude(starShape(), 0.2), color: '#ffc531', pos: [2.3, -1.0, 2.2], s: 0.75 },
    { geo: extrude(bubbleShape(), 0.2), color: '#4c7dff', pos: [-3.2, -0.4, -2.6], s: 0.9 },
  ];
  icons.forEach((ic, i) => {
    const m = new THREE.Mesh(ic.geo, glossy(ic.color, 0.14));
    m.position.set(...ic.pos);
    m.scale.setScalar(ic.s);
    add('mkt', m, { delay: 0.1 + i * 0.05, scale: ic.s, hoverable: true, spin: 0.5 + i * 0.1, bob: 0.25, phase: i * 2 });
  });
  // Hashtag built from four bars
  {
    const tag = new THREE.Group();
    const mat = glossy('#9b5cff', 0.15);
    const bar = new RoundedBoxGeometry(0.12, 0.95, 0.14, 2, 0.04);
    [-0.17, 0.17].forEach((x) => {
      const v = new THREE.Mesh(bar, mat);
      v.position.x = x;
      v.rotation.z = 0.22;
      tag.add(v);
      const hz = new THREE.Mesh(bar, mat);
      hz.position.y = x;
      hz.rotation.z = Math.PI / 2;
      tag.add(hz);
    });
    tag.position.set(2.4, 1.6, -3.2);
    add('mkt', tag, { delay: 0.2, hoverable: true, spin: 0.6, bob: 0.2, phase: 4 });
  }
  // Megaphone
  {
    const mega = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.14, 0.8, 40, 1, true),
      glossy('#d9d2ee', 0.05, { side: THREE.DoubleSide }),
    );
    cone.rotation.z = -Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.05, 12, 48), glossy('#ff4fa3', 0.3));
    rim.rotation.y = Math.PI / 2;
    rim.position.x = 0.4;
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.42, 0.14, 2, 0.04), glossy('#ff4fa3', 0.15));
    handle.position.set(-0.15, -0.3, 0);
    mega.add(cone, rim, handle);
    mega.position.set(-4.2, 3.4, -2.4);
    mega.rotation.z = 0.35;
    add('mkt', mega, { delay: 0.18, hoverable: true, spin: 0.25, bob: 0.22, phase: 1 });
  }
  // The creative structure: an iridescent knot above everything
  {
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.05, 0.1, lowPower ? 140 : 260, 14, 2, 5),
      new THREE.MeshPhysicalMaterial({
        color: '#8a3a9e',
        roughness: 0.18,
        metalness: 0.6,
        iridescence: 1,
        iridescenceIOR: 1.6,
        iridescenceThicknessMinimum: 200,
        iridescenceThicknessMaximum: 800,
        emissive: '#ff4fa3',
        emissiveIntensity: 0.08,
        clearcoat: 1,
      }),
    );
    knot.position.set(1.2, 4.4, -4.6);
    add('mkt', knot, { delay: 0.08, scale: 1.25, spin: 0.25, hoverable: true });
  }
  // Rising engagement: popping "+2.4k reach" tags and coloured bubbles
  const pops = POP_TEXT.slice(0, lowPower ? 4 : POP_TEXT.length).map((label, i) => {
    const tex = makeTex(360, 110, (g, w, h) => {
      rrect(g, 4, 4, w - 8, h - 8, (h - 8) / 2);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.fill();
      heart(g, 52, h / 2 + 4, 40, '#ff3d8b');
      txt(g, label, 88, h / 2 + 13, 38, '#1a1030', 750);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x9a9a9a }));
    sp.scale.set(1.5, 0.46, 1);
    groups.mkt.add(sp);
    const a = (i / 6) * TAU + 0.9;
    return { sp, a, r: 3.2 + (i % 3) * 1.1, phase: i / 6 };
  });
  const bubbleColors = ['#ff4fa3', '#9b5cff', '#ff8a3d', '#ffc531'];
  const bubbles = Array.from({ length: lowPower ? 8 : 16 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glossy(bubbleColors[i % 4], 0.25));
    groups.mkt.add(m);
    return { m, a: i * 2.39, r: 2.4 + ((i * 37) % 50) / 10, s: 0.06 + ((i * 13) % 10) / 70, speed: 0.06 + ((i * 7) % 5) / 60 };
  });

  /* ================= SALES ================= */
  // Revenue skyline: bars on an arc behind the core, rising left to right
  const barCount = lowPower ? 10 : 14;
  const barGeo = new RoundedBoxGeometry(0.55, 1, 0.55, 2, 0.08);
  const barMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.25,
    metalness: 0.35,
    clearcoat: 1,
    emissive: '#13245f',
    emissiveIntensity: 0.18,
    envMapIntensity: 0.6,
  });
  const barsMesh = new THREE.InstancedMesh(barGeo, barMat, barCount);
  const barData = [];
  const arcCenter = Math.atan2(13.5, 9.5) + Math.PI; // opposite the Sales camera
  const cBlue = new THREE.Color('#3d6bff');
  const cGold = new THREE.Color('#f5b942');
  for (let i = 0; i < barCount; i++) {
    const f = i / (barCount - 1);
    const a = arcCenter - 1.25 + f * 2.5;
    const h = 0.7 + Math.pow(f, 1.35) * 5.2 + Math.sin(i * 2.1) * 0.25;
    barData.push({ x: Math.cos(a) * 6.8, z: Math.sin(a) * 6.8, h });
    barsMesh.setColorAt(i, cBlue.clone().lerp(cGold, Math.pow(f, 1.2)));
  }
  barsMesh.instanceColor.needsUpdate = true;
  groups.sales.add(barsMesh);
  const dummy = new THREE.Object3D();

  // Growth line over the bar tops, drawn progressively
  const linePts = barData.map((b) => new THREE.Vector3(b.x * 0.97, FLOOR_Y + b.h + 0.55, b.z * 0.97));
  const growthCurve = new THREE.CatmullRomCurve3(linePts, false, 'centripetal');
  const growthGeo = new THREE.TubeGeometry(growthCurve, 160, 0.045, 8, false);
  const growth = new THREE.Mesh(growthGeo, glowMat('#f5b942', 2.4));
  groups.sales.add(growth);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 20), glowMat('#f5b942', 2.4));
  groups.sales.add(arrow);
  const growthIndexCount = growthGeo.index.count;

  // Premium pedestal rings around the core
  const pedestal = new THREE.Group();
  [2.3, 2.95, 3.6].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, i === 0 ? 0.035 : 0.015, 8, 160),
      glowMat(i === 0 ? '#f5b942' : '#7f9cff', i === 0 ? 1.8 : 1.1),
    );
    ring.rotation.x = Math.PI / 2;
    pedestal.add(ring);
  });
  pedestal.position.y = FLOOR_Y + 0.02;
  add('sales', pedestal, { delay: 0, rise: 0 });

  // KPI dashboard cards
  const salesCardPos = [
    [-5.4, 2.6, -1.2],
    [3.2, 4.1, -4.6],
    [-1.6, 4.7, -5.6],
    [4.6, 1.1, 2.6],
  ];
  SALES_CARDS.slice(0, lowPower ? 3 : 4).forEach((draw, i) => {
    const m = panelMesh(makeTex(640, 360, draw), 1.95, 1.1, 0.85);
    m.position.set(...salesCardPos[i]);
    add('sales', m, { delay: 0.15 + i * 0.07, hoverable: true, billboard: true, bob: 0.12, phase: i * 1.7 });
  });

  // Coins: converted leads turning into revenue
  const coinFace = makeTex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w / 2);
    r.addColorStop(0, '#fff3c4');
    r.addColorStop(0.55, '#f5b942');
    r.addColorStop(1, '#a8741b');
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 2, 0, TAU);
    g.fillStyle = r;
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#d99a2b';
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 22, 0, TAU);
    g.stroke();
    txt(g, '₹', w / 2, h / 2 + 46, 130, '#8a5a10', 800, FONT, 'center');
  });
  const coinMats = [
    new THREE.MeshPhysicalMaterial({ color: '#e0a73a', metalness: 0.9, roughness: 0.25, emissive: '#7a4f0a', emissiveIntensity: 0.4 }),
    new THREE.MeshBasicMaterial({ map: coinFace, color: 0xbbbbbb }),
    new THREE.MeshBasicMaterial({ map: coinFace, color: 0xbbbbbb }),
  ];
  const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40);
  const coins = Array.from({ length: lowPower ? 4 : 7 }, (_, i) => {
    const m = new THREE.Mesh(coinGeo, coinMats);
    m.rotation.x = Math.PI / 2;
    groups.sales.add(m);
    return { m, phase: i / 7, a: Math.atan2(13.5, 9.5) + (i - 3) * 0.22 };
  });

  /* ================= OPERATIONS ================= */
  // Node network on the floor with L-shaped pipes and moving data packets
  const nodeCount = lowPower ? 8 : 12;
  const nodePos = [];
  const snap = (v) => Math.round(v / 0.8) * 0.8;
  for (let i = 0; i < nodeCount; i++) {
    const a = (i / nodeCount) * TAU + 0.2;
    const r = i % 2 ? 7.6 : 5.7;
    nodePos.push(new THREE.Vector3(snap(Math.cos(a) * r), FLOOR_Y + 0.22, snap(Math.sin(a) * r)));
  }
  const nodeGeo = new RoundedBoxGeometry(0.62, 0.42, 0.62, 3, 0.08);
  const nodeMat = glossy('#e6fff9', 0.12, { metalness: 0.2 });
  const lightGeo = new THREE.SphereGeometry(0.07, 12, 8);
  const nodeLights = [];
  nodePos.forEach((p, i) => {
    const n = new THREE.Group();
    n.add(new THREE.Mesh(nodeGeo, nodeMat));
    const l = new THREE.Mesh(lightGeo, glowMat('#2fd0b5', 3));
    l.position.y = 0.3;
    n.add(l);
    nodeLights.push(l);
    n.position.copy(p);
    add('ops', n, { delay: 0.02 * i, hoverable: true, rise: 0.8 });
  });
  const pipeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2fd0b5').multiplyScalar(0.9), transparent: true, opacity: 0.6 });
  const packetGeo = new THREE.SphereGeometry(0.075, 12, 8);
  const packetMat = glowMat('#8ff7e2', 3.2);
  const pipes = [];
  const lPath = (a, b) => {
    const y = FLOOR_Y + 0.08;
    const p0 = new THREE.Vector3(a.x, y, a.z);
    const p1 = new THREE.Vector3(b.x, y, a.z);
    const p2 = new THREE.Vector3(b.x, y, b.z);
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(p0, p1));
    path.add(new THREE.LineCurve3(p1, p2));
    return path;
  };
  const link = (a, b, k) => {
    const path = lPath(a, b);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.028, 6, false), pipeMat);
    groups.ops.add(tube);
    const packet = new THREE.Mesh(packetGeo, packetMat);
    groups.ops.add(packet);
    pipes.push({ path, packet, offset: (k * 0.37) % 1, speed: 0.16 + (k % 3) * 0.05 });
  };
  nodePos.forEach((p, i) => {
    link(p, nodePos[(i + 1) % nodeCount], i);
    if (i % 3 === 0) {
      const inner = p.clone().setY(0).normalize().multiplyScalar(3.4);
      link(p, inner.setY(p.y), i + 20);
    }
  });

  // Interlocking gears behind the core (relative to the Operations camera)
  const gearMat = new THREE.MeshPhysicalMaterial({
    color: '#cfeee7',
    metalness: 0.85,
    roughness: 0.28,
    emissive: '#0d5c52',
    emissiveIntensity: 0.35,
  });
  const gearGroup = new THREE.Group();
  const gears = [
    { teeth: 14, ro: 1.1, rr: 0.92, x: 0, y: 0, dir: 1 },
    { teeth: 9, ro: 0.74, rr: 0.58, x: 1.67, y: 0.2, dir: -14 / 9 },
    { teeth: 18, ro: 1.4, rr: 1.2, x: -2.2, y: -0.75, dir: -14 / 18 },
  ].map((g) => {
    const m = new THREE.Mesh(extrude(gearShape(g.teeth, g.ro, g.rr, g.rr * 0.35), 0.24), gearMat);
    m.position.set(g.x, g.y, 0);
    m.userData.dir = g.dir;
    gearGroup.add(m);
    return m;
  });
  gearGroup.position.set(-5.4, 0.9, 3.8);
  gearGroup.lookAt(9, 0.9, -6.5);
  add('ops', gearGroup, { delay: 0.1, hoverable: true, rise: 1.6 });

  // Task conveyor looping around the core, with a scanning gate
  const rect = [];
  const hw = 4.6;
  const hd = 3.0;
  const rc = 1.0;
  for (let i = 0; i < 4; i++) {
    const cx = i === 0 || i === 3 ? hw - rc : -hw + rc;
    const cz = i < 2 ? hd - rc : -hd + rc;
    const start = [0, Math.PI / 2, Math.PI, Math.PI * 1.5][i];
    for (let k = 0; k <= 4; k++) {
      const a = start + (k / 4) * (Math.PI / 2);
      rect.push(new THREE.Vector3(cx + Math.cos(a) * rc, FLOOR_Y + 0.12, cz + Math.sin(a) * rc));
    }
  }
  const belt = new THREE.CatmullRomCurve3(rect, true, 'centripetal');
  const rail = new THREE.Mesh(
    new THREE.TubeGeometry(belt, 200, 0.05, 8, true),
    new THREE.MeshPhysicalMaterial({ color: '#d7f7ef', metalness: 0.7, roughness: 0.3, emissive: '#0d5c52', emissiveIntensity: 0.3 }),
  );
  add('ops', rail, { delay: 0.05, rise: 0.4 });
  const boxGeo = new RoundedBoxGeometry(0.38, 0.32, 0.38, 2, 0.06);
  const boxMats = [glossy('#2fd0b5', 0.35), glossy('#f2fffb', 0.1)];
  const boxes = Array.from({ length: lowPower ? 6 : 10 }, (_, i) => {
    const m = new THREE.Mesh(boxGeo, boxMats[i % 2]);
    groups.ops.add(m);
    return { m, offset: i / (lowPower ? 6 : 10) };
  });
  const gateMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2fd0b5').multiplyScalar(1.4) });
  const gate = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 10, 40, Math.PI), gateMat);
  const gateU = 0.12;
  belt.getPointAt(gateU, gate.position);
  gate.position.y = FLOOR_Y + 0.12;
  gate.lookAt(gate.position.clone().add(belt.getTangentAt(gateU)));
  add('ops', gate, { delay: 0.15, rise: 0.6 });

  // Clean holographic status panels
  const opsCardPos = [
    [-3.6, 3.8, -4.8],
    [-6.0, 1.6, -1.2],
    [-0.6, 5.6, -6.6],
  ];
  OPS_CARDS.slice(0, lowPower ? 2 : 3).forEach((draw, i) => {
    const m = panelMesh(makeTex(640, 360, draw), 1.95, 1.1, 0.5);
    m.position.set(...opsCardPos[i]);
    add('ops', m, { delay: 0.12 + i * 0.07, hoverable: true, billboard: true, bob: 0.1, phase: i * 2.1 });
  });

  /* ================= per-frame update ================= */
  const tmp = new THREE.Vector3();
  const look = new THREE.Object3D();
  const cFloor = new THREE.Color();
  const floorCols = {
    mkt: new THREE.Color(PALETTES.mkt.floor),
    sales: new THREE.Color(PALETTES.sales.floor),
    ops: new THREE.Color(PALETTES.ops.floor),
  };
  let hovered = null;

  function update({ dt, t, motion = 1, w, camera, raycaster, pointerActive }) {
    groups.mkt.visible = w.mkt > 0.001;
    groups.sales.visible = w.sales > 0.001;
    groups.ops.visible = w.ops > 0.001;

    // Floor: dots for Marketing, gold grid for Sales, bright scanning grid for Operations
    const fw = w.mkt * 0.35 + w.sales * 0.6 + w.ops * 1.0;
    floor.visible = fw > 0.001;
    floorUniforms.uOpacity.value = fw;
    floorUniforms.uTime.value = t * motion;
    floorUniforms.uScan.value = w.ops;
    floorUniforms.uDots.value = w.mkt / Math.max(0.001, w.mkt + w.sales + w.ops);
    cFloor.setRGB(0, 0, 0);
    ['mkt', 'sales', 'ops'].forEach((k) => cFloor.add(floorCols[k].clone().multiplyScalar(w[k])));
    floorUniforms.uColor.value.copy(cFloor.multiplyScalar(1 / Math.max(0.001, w.mkt + w.sales + w.ops)));

    // Hover (only when a department world is on screen)
    let hit = null;
    if (pointerActive && raycaster && w.mkt + w.sales + w.ops > 0.3) {
      const hits = raycaster.intersectObjects(interactive, false);
      if (hits.length) hit = hits[0].object.userData.item;
    }
    hovered = hit;

    // Items: rise/scale in with their world, bob, spin, hover-lift
    for (const it of items) {
      const ww = w[it.world];
      if (ww <= 0.001) continue;
      const a = easeOut((ww - it.delay) / (1 - it.delay));
      it.hover = lerp(it.hover, it === hovered ? 1 : 0, 1 - Math.exp(-dt * 10));
      const s = Math.max(0.0001, it.scale * a * (1 + it.hover * 0.14));
      it.obj.scale.setScalar(s);
      it.obj.position.copy(it.base);
      it.obj.position.y += (1 - a) * -it.rise;
      if (it.bob) it.obj.position.y += Math.sin(t * 0.9 * motion + (it.phase || 0)) * it.bob;
      it.obj.position.y += it.hover * 0.15;
      if (it.spin) it.obj.rotation.y += dt * it.spin * motion * (1 + it.hover * 3);
    }
    for (const it of billboards) {
      if (w[it.world] <= 0.001) continue;
      look.position.copy(it.obj.position);
      look.lookAt(camera.position);
      it.obj.quaternion.slerp(look.quaternion, 1 - Math.exp(-dt * 6));
    }

    // Marketing extras
    if (w.mkt > 0.001) {
      pops.forEach((p) => {
        const ph = (t * 0.11 * motion + p.phase) % 1;
        p.sp.position.set(Math.cos(p.a) * p.r, -0.6 + ph * 4.8, Math.sin(p.a) * p.r);
        p.sp.material.opacity = Math.sin(ph * Math.PI) * w.mkt;
        p.sp.scale.set(1.5, 0.46, 1).multiplyScalar(0.7 + 0.3 * w.mkt);
      });
      bubbles.forEach((b) => {
        const ph = (t * b.speed * motion + b.a) % 1;
        b.m.position.set(Math.cos(b.a) * b.r, -2.2 + ph * 8, Math.sin(b.a) * b.r);
        b.m.scale.setScalar(b.s * Math.sin(ph * Math.PI) * easeOut(w.mkt));
      });
    }

    // Sales extras
    if (w.sales > 0.001) {
      for (let i = 0; i < barCount; i++) {
        const b = barData[i];
        const grow = easeOut((w.sales - 0.05 - (i / barCount) * 0.35) / 0.6);
        const h = Math.max(0.001, b.h * grow);
        const hv = hovered === null ? 0 : 0;
        dummy.position.set(b.x, FLOOR_Y + h / 2, b.z);
        dummy.scale.set(1, h + hv, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        barsMesh.setMatrixAt(i, dummy.matrix);
      }
      barsMesh.instanceMatrix.needsUpdate = true;
      const draw = easeOut((w.sales - 0.45) / 0.55);
      growth.geometry.setDrawRange(0, Math.floor((growthIndexCount * draw) / 6) * 6);
      growth.visible = draw > 0.01;
      const end = Math.min(0.999, Math.max(0.001, draw));
      growthCurve.getPointAt(end, arrow.position);
      growthCurve.getTangentAt(end, tmp);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
      arrow.scale.setScalar(draw > 0.02 ? 1 : 0.0001);
      coins.forEach((c) => {
        const ph = (t * 0.09 * motion + c.phase) % 1;
        const r = lerp(3.5, 6.2, ph);
        c.m.position.set(Math.cos(c.a) * r, lerp(-2.1, 3.6, ph), Math.sin(c.a) * r);
        c.m.rotation.z += dt * 2.2 * motion;
        c.m.scale.setScalar(Math.sin(ph * Math.PI) * easeOut((w.sales - 0.3) / 0.7) + 0.0001);
      });
    }

    // Operations extras
    if (w.ops > 0.001) {
      gears.forEach((g) => (g.rotation.z += dt * 0.6 * g.userData.dir * motion));
      const on = easeOut((w.ops - 0.25) / 0.75);
      pipeMat.opacity = 0.6 * on;
      pipes.forEach((p) => {
        const u = (t * p.speed * motion + p.offset) % 1;
        p.path.getPointAt(u, p.packet.position);
        p.packet.position.y += 0.05;
        p.packet.scale.setScalar(on + 0.0001);
      });
      nodeLights.forEach((l, i) => l.scale.setScalar(0.7 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + i))));
      let near = 0;
      boxes.forEach((b) => {
        const u = (t * 0.035 * motion + b.offset) % 1;
        belt.getPointAt(u, b.m.position);
        b.m.position.y = FLOOR_Y + 0.3;
        belt.getTangentAt(u, tmp);
        b.m.lookAt(b.m.position.clone().add(tmp));
        b.m.scale.setScalar(on + 0.0001);
        const d = Math.abs(u - gateU);
        near = Math.max(near, 1 - Math.min(1, Math.min(d, 1 - d) * 40));
      });
      gateMat.color.setRGB(0.18 + near * 1.6, 0.8 + near * 1.6, 0.7 + near * 1.4);
    }
  }

  return { root, update, interactive };
}
