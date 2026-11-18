/*
 * "See your first 10 leads" teaser.
 * Turns "what you sell" + "where" into a sample preview of buyer types (no real company names).
 * 3 leads are visible; 7 stay locked until the visitor joins the waitlist (body.is-member).
 */

const PROFILES = [
  {
    match: /heat ?sink|alumin|metal|steel|cast|cnc|machin|fabricat|forg|sheet|copper|brass|component|bearing|valve|pump/i,
    buyers: [
      'Telecom equipment maker',
      'Electronics manufacturer',
      'EV and battery maker',
      'Industrial machinery OEM',
      'Power electronics firm',
      'LED lighting manufacturer',
      'Solar inverter maker',
      'Auto component supplier',
      'Defence electronics supplier',
      'Distributor and OEM trader',
    ],
    reason: (p) => `Uses ${p} in its own products`,
  },
  {
    match: /textile|garment|fabric|cloth|apparel|yarn|uniform|saree|denim|hosiery/i,
    buyers: [
      'Fashion brand',
      'Uniform supplier',
      'Export house',
      'Retail clothing chain',
      'Hotel and hospitality group',
      'Hospital group',
      'School and institution supplier',
      'D2C e-commerce brand',
      'Boutique store group',
      'Wholesale distributor',
    ],
    reason: (p) => `Buys ${p} in bulk every season`,
  },
  {
    match: /food|spice|snack|bakery|dairy|sweet|tea|coffee|rice|oil|masala|beverage|juice/i,
    buyers: [
      'Supermarket chain',
      'Restaurant and café group',
      'Hotel group',
      'Catering company',
      'Corporate canteen operator',
      'Quick-commerce dark store',
      'Export trader',
      'Gift-hamper company',
      'Regional distributor',
      'Online grocery seller',
    ],
    reason: (p) => `Restocks ${p} every week`,
  },
  {
    match: /packag|plastic|carton|box|label|bottle|pouch|corrugat/i,
    buyers: [
      'FMCG brand',
      'Pharma company',
      'E-commerce seller',
      'Food processor',
      'Cosmetics brand',
      'Electronics maker',
      'Exporter',
      'Third-party warehouse',
      'Bakery chain',
      'Packaging distributor',
    ],
    reason: (p) => `Ships products that need ${p}`,
  },
  {
    match: /software|it |app|website|marketing|agency|design|consult|service|training|account|ca |legal/i,
    buyers: [
      'Manufacturing SME',
      'Clinic and hospital group',
      'Real-estate developer',
      'Coaching centre chain',
      'Retail chain',
      'Logistics firm',
      'Hotel group',
      'CA and law firm',
      'D2C brand',
      'Funded startup',
    ],
    reason: (p) => `Growing fast and needs ${p}`,
  },
];
const GENERIC = {
  buyers: [
    'Manufacturer',
    'Distributor',
    'Retail chain',
    'Hospital group',
    'Hotel group',
    'Builder and contractor',
    'Exporter',
    'Corporate office',
    'Education group',
    'E-commerce seller',
  ],
  reason: (p) => `Likely buyer of ${p}`,
};
const SIZES = ['200–500 staff', '50–200 staff', '500+ staff', '100–250 staff', '20–50 staff'];
const SCORES = [94, 91, 89, 86, 84, 81, 79, 77, 74, 71];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tidy = (s) => s.trim().replace(/\s+/g, ' ');

function buildLeads(product, city) {
  const profile = PROFILES.find((p) => p.match.test(` ${product} `)) || GENERIC;
  const areas = [city, `Greater ${city}`, `${city} industrial area`, `Near ${city}`];
  return profile.buyers.map((buyer, i) => ({
    buyer,
    area: areas[i % areas.length],
    size: SIZES[i % SIZES.length],
    reason: profile.reason(product.toLowerCase()),
    score: SCORES[i],
  }));
}

function card(lead, i) {
  const priority = lead.score >= 80 ? 'High priority' : 'Medium priority';
  return `
    <article class="lead-card${i >= 3 ? ' is-locked' : ''}" style="--d:${i * 70}ms">
      <div class="lead-top"><span class="lead-no">${String(i + 1).padStart(2, '0')}</span><span class="ring" style="--v:${lead.score}">${lead.score}</span></div>
      <b>${esc(lead.buyer)}</b>
      <small>${esc(lead.area)} · ${lead.size}</small>
      <p>${esc(lead.reason)}</p>
      <span class="tag ${lead.score >= 80 ? 'tag--green' : ''}">${priority}</span>
      ${i >= 3 ? '<span class="lead-lock" aria-hidden="true"><svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" /><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" /></svg></span>' : ''}
    </article>`;
}

export function mountLeads() {
  const form = document.querySelector('.leads-form');
  if (!form) return;
  const out = document.querySelector('.leads-out');
  const grid = out.querySelector('.leads-grid');
  const err = document.querySelector('.leads-error');
  const lockedText = out.querySelector('[data-leads-locked]');
  const ctaText = out.querySelector('.leads-cta p');

  const refreshCta = () => {
    if (document.body.classList.contains('is-member')) {
      ctaText.innerHTML =
        '<b>All 10 unlocked.</b> At launch your Sales AI finds real ones like these — fresh every day.';
      out.querySelector('.leads-cta .pill-btn').hidden = true;
    }
  };
  document.addEventListener('waitlist:joined', refreshCta);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const product = tidy(form.product.value);
    const city = tidy(form.city.value);
    if (product.length < 3 || city.length < 2) {
      err.textContent = 'Tell us what you sell and the city or region you sell in.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    grid.innerHTML = buildLeads(product, city).map(card).join('');
    lockedText.textContent = '7 more leads are waiting.';
    out.hidden = false;
    refreshCta();
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}
