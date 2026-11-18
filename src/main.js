import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { mountSignups, getStats } from './signup.js';
import { mountLeads } from './leads.js';

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);

const body = document.body;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The 3D stage loads after the page is usable; until then `world` is null.
let world = null;
let joinedOnLoad = false;

/* ---------- Waitlist ---------- */
mountSignups({
  onJoined: (opts) => {
    if (world) world.join(opts);
    else joinedOnLoad = true;
  },
});

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -90 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------- Floating nav tightens into a pill after the hero starts ---------- */
const nav = document.querySelector('.nav');
// Plain scroll check (a ScrollTrigger ending at 'max' switched the pill off at the very bottom of the page).
const syncNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 60);
window.addEventListener('scroll', syncNav, { passive: true });
syncNav();

/* ---------- Hero entrance (the one page-load moment) ---------- */
if (!reduced) {
  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero-chip', { opacity: 0, y: 16, duration: 0.9 })
    .from('.hero-title .line', { opacity: 0, yPercent: 40, duration: 1.3, stagger: 0.12 }, 0.1)
    .from(['.hero-sub', '.signup--hero', '.agent-chips'], { opacity: 0, y: 20, duration: 1, stagger: 0.08 }, 0.45)
    .from('.stage', { opacity: 0, y: 60, scale: 0.97, duration: 1.4 }, 0.6);
}

/* ---------- Feed: one working day of finished tasks, by agent ---------- */
const AGENTS = { mkt: 'Marketing AI', sales: 'Sales AI', ops: 'Operations AI' };
const head = (agent, time) =>
  `<div class="work-head"><span class="agent-badge"><i></i>${AGENTS[agent]}</span><time>${time}</time></div>`;
const done = (label) =>
  `<span class="work-label"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3 5 8.6l4.6-5.2"/></svg>${label}</span>`;
const task = (agent, time, label, inner) =>
  `<div class="work" data-agent="${agent}">${head(agent, time)}<div class="mock">${inner}</div>${done(label)}</div>`;
const photo = (agent, time, label, src, title, sub) =>
  `<div class="work work--photo" data-agent="${agent}"><img src="${src}" alt="" loading="lazy" /><div class="photo-note">${head(
    agent,
    time,
  )}<b>${title}</b><small>${sub}</small></div>${done(label)}</div>`;

// Two independent paths to an order — Marketing AI (inbound) and Sales AI (outbound). Both report to the
// Business AI Manager, which assigns work to the company's team; Operations AI helps that team finish it.
const LANES = {
  mkt: [
    task(
      'mkt',
      '10:30 AM',
      'Campaign planned',
      `<div class="mock-card"><small>This week</small><b>Heat sinks for 5G routers</b>
       <div class="tags" style="margin-top:8px"><span class="tag">3 posts</span><span class="tag">1 reel</span><span class="tag">Ads</span></div></div>
       <div class="mock-card"><div class="mock-top"><b>Approved by you</b><span class="tag tag--green">Live</span></div></div>`,
    ),
    photo('mkt', '11:00 AM', 'Reel and ad live', '/img/photo-content.webp', 'Factory reel is live', 'Instagram, LinkedIn and a ₹2,000 ad'),
    task(
      'mkt',
      '12:30 PM',
      'Comments answered',
      `<div class="mock-card"><small>Comments and DMs today</small><b class="big-time">46</b>
       <small>All answered · average reply in 4 min</small></div>
       <div class="mock-card"><small>New enquiry · Northwave Telecom</small><b>“Do you make custom heat sinks?”</b>
       <div class="mock-top" style="margin-top:6px"><small>Marketing AI replied</small><span class="tag tag--green">Handling it</span></div></div>`,
    ),
    photo('mkt', '1:15 PM', 'Enquiry closed', '/img/lane-insta.webp', 'Northwave confirmed 200 units', '₹1,36,000 · reported to Business AI Manager'),
  ],
  sales: [
    task(
      'sales',
      '9:30 AM',
      'Leads found',
      `<div class="mock-card"><div class="mock-top"><div><small>Found by its own research</small><b>Voltline Power Systems</b></div><span class="ring" style="--v:92">92</span></div></div>
       <div class="mock-card"><small>Why it fits</small><b>Makes inverters that need heat sinks</b><small>Pune · 200–500 staff</small></div>`,
    ),
    photo('sales', '11:40 AM', 'Call made', '/img/photo-call.webp', 'Interested — wants 500 units', 'Cold call · summary saved in your CRM'),
    task(
      'sales',
      '3:00 PM',
      'Email and quote sent',
      `<div class="mock-card"><small>Follow-up email · Quotation Q-0418</small><b>Voltline Power Systems</b>
       <div class="lines"><span style="width:90%"></span><span style="width:70%"></span></div>
       <div class="mock-top"><small>500 × HS-40</small><b>₹3,40,000</b></div></div>
       <div class="mock-card"><div class="mock-top"><b>You approved it</b><span class="tag tag--green">Sent</span></div></div>`,
    ),
    photo('sales', '6:05 PM', 'Order won', '/img/lane-signing.webp', 'Purchase order signed', '₹3,40,000 · reported to Business AI Manager'),
  ],
  ops: [
    task(
      'ops',
      '6:10 PM',
      'Tasks prepared',
      `<div class="mock-card"><small>From Business AI Manager</small><b>2 orders · 700 × HS-40</b></div>
       <div class="mock-card"><small>Ready for your team</small><b>Job card for production · material list for stores</b></div>`,
    ),
    task(
      'ops',
      '6:12 PM',
      'Stock checked',
      `<div class="mock-card"><small>Aluminium 6063 sheet</small><b>Enough for both orders</b>
       <div class="meter meter--ops"><i style="--w:40%"></i></div><small>40% left after these orders</small></div>
       <div class="mock-card"><div class="mock-top"><b>Reorder drafted</b><span class="tag">Next week</span></div></div>`,
    ),
    photo('ops', 'Mon 9:00 AM', 'In production', '/img/photo-cnc.webp', '700 heat sinks on the line', 'Production team · ready by Thursday'),
    photo('ops', 'Thu 4:00 PM', 'Delivered', '/img/lane-van.webp', 'Both orders dispatched', 'Dispatch team · 2 invoices sent by Operations AI'),
  ],
};
document.querySelectorAll('[data-lane-track]').forEach((grid) => {
  grid.innerHTML = LANES[grid.dataset.laneTrack].join('');
});

// Suspense: the last two Operations steps stay locked until the visitor joins.
const LOCK_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" /><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" /></svg>';
[...document.querySelectorAll('[data-lane-track="ops"] .work')].slice(2).forEach((card) => {
  card.classList.add('is-locked');
  card.insertAdjacentHTML(
    'beforeend',
    `<a class="lock-veil" href="#join">${LOCK_SVG}<b>Members only</b><small>Join to see how your team delivers</small></a>`,
  );
});

/* ---------- Leads teaser ---------- */
mountLeads();

/* ---------- Founding 100: real spots left, shown once at least 20 businesses have joined ----------
   Until then the line keeps its default text ("for the first 100 businesses"), so an early
   visitor never sees "100 of 100 spots left" (which would say nobody has joined yet). */
const SHOW_COUNT_FROM = 20;
getStats().then((s) => {
  const el = document.querySelector('[data-founder-left]');
  if (!el || !s || typeof s.total !== 'number' || s.total < SHOW_COUNT_FROM) return;
  const left = Math.max(0, 100 - s.total);
  el.textContent = left > 0 ? ` — ${left} of 100 spots left` : ' — all 100 founder spots are taken';
});

/* ---------- While you sleep: notes arrive one by one ---------- */
if (!reduced) {
  gsap.from('.note-card', {
    opacity: 0,
    y: 24,
    scale: 0.96,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.35,
    scrollTrigger: { trigger: '.night-grid', start: 'top 70%' },
  });
  gsap.from('.morning-card', {
    opacity: 0,
    y: 24,
    duration: 1,
    ease: 'expo.out',
    delay: 1.1,
    scrollTrigger: { trigger: '.night-grid', start: 'top 70%' },
  });
}

/* ---------- How it works: loop track follows the steps ---------- */
const track = document.querySelector('.loop-track');
if (track) {
  const L = track.getTotalLength();
  const progressPath = document.querySelector('.loop-progress');
  const robot = document.querySelector('.loop-robot');
  const lean = robot.querySelector('.robot-lean');
  let lastX = null;
  let face = 1;
  let moveTimer = null;
  const count = document.querySelector('[data-loop-count]');
  const pillsBox = document.querySelector('.loop-pills');
  const NAMES = ['Learn', 'Find leads', 'Reach out', 'Market', 'Run and report'];
  const pills = NAMES.map((name, i) => {
    const pt = track.getPointAtLength((i / NAMES.length) * L);
    const el = document.createElement('span');
    el.textContent = name;
    el.style.left = `${(pt.x / 400) * 100}%`;
    el.style.top = `${(pt.y / 300) * 100}%`;
    pillsBox.append(el);
    return el;
  });
  const setLoop = (p) => {
    const pt = track.getPointAtLength(p * L);
    // Robot rides along the inside edge of the track (clear of the labels and the nav bar),
    // faces the way it's heading and leans in while moving.
    const ahead = track.getPointAtLength(Math.min(L, p * L + 2));
    let nx = -(ahead.y - pt.y);
    let ny = ahead.x - pt.x;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    if (nx * (200 - pt.x) + ny * (150 - pt.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    robot.style.left = `${((pt.x + nx * 34) / 400) * 100}%`;
    robot.style.top = `${((pt.y + ny * 34) / 300) * 100}%`;
    if (lastX !== null && Math.abs(pt.x - lastX) > 0.3) face = pt.x < lastX ? -1 : 1;
    const moved = lastX !== null && Math.abs(pt.x - lastX) + Math.abs(p) > 0;
    lastX = pt.x;
    lean.style.setProperty('--face', face);
    if (moved) {
      robot.classList.add('is-moving');
      lean.style.setProperty('--lean', '7deg');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        robot.classList.remove('is-moving');
        lean.style.setProperty('--lean', '0deg');
      }, 260);
    }
    progressPath.style.strokeDasharray = `${p} 1`;
    const active = Math.min(NAMES.length - 1, Math.floor(p * NAMES.length + 0.15));
    pills.forEach((el, i) => el.classList.toggle('is-on', i === active));
    count.textContent = String(active + 1).padStart(2, '0');
  };
  setLoop(0);
  ScrollTrigger.create({
    trigger: '.how-steps',
    start: 'top 60%',
    end: 'bottom 60%',
    onUpdate: (st) => setLoop(st.progress * 0.999),
  });
}

/* ---------- Hero 3D stage ---------- */
const stage = document.querySelector('.stage-screen');
const canvas = document.getElementById('scene');
const tabs = [...document.querySelectorAll('[data-formation]')];
const titleEl = document.querySelector('[data-stage-title]');
const descEl = document.querySelector('[data-stage-desc]');
const FORMATIONS = [
  ['Your team', 'Three agents, one Business AI Manager'],
  ['Marketing AI', 'Ads, reels and comments — and the enquiries they bring'],
  ['Sales AI', 'Finds its own customers by call and email'],
  ['Operations AI', 'Helps your team deliver every order'],
  ['Business AI Manager', 'Your AI agents and your staff report here'],
];
let current = 0;
let autoTimer = null;
let pausedUntil = 0;

function show(i) {
  current = i;
  world?.setProgress(i);
  tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
  titleEl.textContent = FORMATIONS[i][0];
  descEl.textContent = FORMATIONS[i][1];
}
tabs.forEach((t, i) =>
  t.addEventListener('click', () => {
    pausedUntil = performance.now() + 20000;
    show(i);
  }),
);
function startAuto() {
  if (reduced || autoTimer) return;
  autoTimer = setInterval(() => {
    if (performance.now() < pausedUntil) return;
    show((current + 1) % FORMATIONS.length);
  }, 5200);
}

stage.addEventListener(
  'pointermove',
  (e) => {
    const r = stage.getBoundingClientRect();
    world?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  },
  { passive: true },
);

import('./scene.js')
  .then(({ createScene }) => {
    world = createScene(canvas, { reducedMotion: reduced, framing: 'card' });
    if (!world) throw new Error('WebGL unavailable');
    world.setProgress(current);
    world.start();
    if (joinedOnLoad) world.join({ instant: true });
    if (import.meta.env.DEV) window.__world = world;

    // Only render while the stage is on screen.
    new IntersectionObserver(([entry]) => world.setActive(entry.isIntersecting), { rootMargin: '100px' }).observe(stage);
    startAuto();
  })
  .catch((e) => {
    console.warn('3D stage unavailable', e);
    body.classList.add('no-webgl');
  });

/* ---------- Department worlds: Marketing → Sales → Operations ---------- */
const worldsSection = document.querySelector('.worlds');
const worldsFrame = document.querySelector('.worlds-frame');
const worldsCanvas = document.getElementById('worlds-scene');
const chapters = [...document.querySelectorAll('.chapter')];
const deptButtons = [...document.querySelectorAll('[data-dept]')];
let worldsScene = null;
let worldsAnchors = [];
let worldsProgress = 0;

function computeWorldAnchors() {
  const vh = window.innerHeight;
  worldsAnchors = chapters.map((el) => el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2 - vh / 2);
}
function worldsRaw(y) {
  const a = worldsAnchors;
  if (!a.length || y <= a[0]) return 0;
  for (let i = 0; i < a.length - 1; i++) {
    if (y <= a[i + 1]) return i + (y - a[i]) / Math.max(1, a[i + 1] - a[i]);
  }
  return a.length - 1;
}
function onWorldsScroll() {
  computeWorldAnchors(); // cheap, and always right even after fonts/images shift the layout
  const raw = worldsRaw(window.scrollY);
  const i = Math.min(2, Math.floor(raw));
  // Each world holds still while its copy is read, then the scene flies to the next one.
  worldsProgress = i + smoothstep(0.25, 0.75, raw - i);
  worldsScene?.setProgress(worldsProgress);
  const active = Math.round(raw);
  deptButtons.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.dept) === active));
}
ScrollTrigger.create({
  trigger: worldsSection,
  start: 'top bottom',
  end: 'bottom top',
  onUpdate: onWorldsScroll,
  onRefresh: () => {
    computeWorldAnchors();
    onWorldsScroll();
  },
});
computeWorldAnchors();

deptButtons.forEach((b) =>
  b.addEventListener('click', () => {
    computeWorldAnchors();
    const y = worldsAnchors[Number(b.dataset.dept)];
    if (lenis) lenis.scrollTo(y, { duration: 1.8 });
    else window.scrollTo(0, y);
  }),
);

if (!reduced) {
  // Stepping in: the world grows from a rounded window to full screen.
  gsap.fromTo(
    worldsFrame,
    { clipPath: 'inset(6% 4% round 32px)' },
    {
      clipPath: 'inset(0% 0% round 0px)',
      ease: 'none',
      scrollTrigger: { trigger: worldsSection, start: 'top 85%', end: 'top top', scrub: true },
    },
  );
  chapters.forEach((ch) => {
    gsap.from(ch.querySelector('.chapter-card'), {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: { trigger: ch.querySelector('.chapter-card'), start: 'top 85%', end: 'bottom 15%', toggleActions: 'play reverse play reverse' },
    });
  });
}

worldsSection.addEventListener(
  'pointermove',
  (e) => {
    const r = worldsFrame.getBoundingClientRect();
    worldsScene?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  },
  { passive: true },
);

// Build the second scene only when the section is about a screen away, and render it only while visible.
let worldsStarted = false;
const worldsLoader = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting || worldsScene) return;
    worldsLoader.disconnect();
    import('./scene.js')
      .then(({ createScene }) => {
        worldsScene = createScene(worldsCanvas, { reducedMotion: reduced, framing: 'page' });
        if (!worldsScene) throw new Error('WebGL unavailable');
        onWorldsScroll();
        if (import.meta.env.DEV) window.__worlds = worldsScene;
        new IntersectionObserver(
          ([e]) => {
            worldsScene.setActive(e.isIntersecting);
            if (e.isIntersecting && !worldsStarted) {
              worldsStarted = true;
              worldsScene.start();
            }
          },
          { threshold: 0.05 },
        ).observe(worldsFrame);
      })
      .catch((e) => {
        console.warn('Department worlds unavailable', e);
        body.classList.add('no-webgl');
      });
  },
  { rootMargin: '100% 0px' },
);
worldsLoader.observe(worldsSection);
