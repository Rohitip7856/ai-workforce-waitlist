/*
 * "See your future customers" leads teaser.
 * Turns "what you sell" + "where" into a sample preview of buyer types (no real company names).
 * 3 leads are visible; 7 stay locked until the visitor joins the waitlist (body.is-member).
 */

// Checked in order, so the more specific industries come first. Whole-word matches only
// (e.g. "hair oil" is personal care, not food; "plastic chairs" is furniture, not packaging).
const PROFILES = [
  {
    match: /\b(hair ?oils?|shampoos?|soaps?|cosmetics?|skin ?care|creams?|ayurved\w*|herbal|perfumes?|attars?|beauty|lotions?|face ?wash|deodorants?|personal care|grooming)\b/i,
    buyers: [
      'Pharmacy chain',
      'Beauty and salon chain',
      'Supermarket chain',
      'Ayurvedic store network',
      'D2C beauty brand',
      'Hotel group',
      'Wellness and spa chain',
      'Online marketplace seller',
      'Export trader',
      'Regional distributor',
    ],
    reason: (p) => `Sells or uses ${p} every month`,
  },
  {
    match: /\b(pharma\w*|medicines?|tablets?|capsules?|surgical|medical|diagnostics?|syringes?|hospital supplies|ppe)\b/i,
    buyers: [
      'Hospital group',
      'Pharmacy chain',
      'Clinic network',
      'Diagnostic lab chain',
      'Medical distributor',
      'Nursing home',
      'Government hospital supplier',
      'Online pharmacy',
      'Veterinary clinic chain',
      'Export trader',
    ],
    reason: (p) => `Buys ${p} on a regular cycle`,
  },
  {
    match: /\b(auto ?parts?|automobile|automotive|spare ?parts?|tyres?|tires?|brakes?|engine ?oils?|lubricants?|garage)\b/i,
    buyers: [
      'Car service centre chain',
      'Fleet operator',
      'Transport company',
      'Auto dealership',
      'Spare-parts retailer',
      'Two-wheeler workshop',
      'Logistics firm',
      'Bus operator',
      'Taxi fleet owner',
      'Auto-component maker',
    ],
    reason: (p) => `Replaces ${p} across its vehicles`,
  },
  {
    match: /\b(furniture|chairs?|tables?|sofas?|wardrobes?|mattress(es)?|beds?|modular|interiors?|plywood|desks?)\b/i,
    buyers: [
      'Office fit-out contractor',
      'Hotel group',
      'Co-working operator',
      'Real-estate developer',
      'School and college group',
      'Hospital group',
      'Restaurant chain',
      'Interior design firm',
      'Corporate office',
      'Furniture retailer',
    ],
    reason: (p) => `Furnishes new spaces with ${p}`,
  },
  {
    match: /\b(cement|tiles?|bricks?|sanitary\w*|pipes?|paints?|marble|granite|tmt|steel bars?|hardware|glass|doors?|windows?|roofing|construction)\b/i,
    buyers: [
      'Real-estate developer',
      'Civil contractor',
      'Architect firm',
      'Hardware dealer',
      'Government project contractor',
      'Interior design firm',
      'Hotel builder',
      'Hospital builder',
      'Industrial park developer',
      'Building-material distributor',
    ],
    reason: (p) => `Uses ${p} on its projects`,
  },
  {
    match: /\b(heat ?sinks?|alumin\w*|metals?|steel|castings?|cnc|machin\w*|fabricat\w*|forg\w*|sheet ?metal|copper|brass|components?|bearings?|valves?|pumps?|fasteners?|bolts?)\b/i,
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
    match: /\b(wires?|cables?|switch\w*|leds?|lights?|lighting|fans?|solar|batter(y|ies)|inverters?|transformers?|electricals?|electronics?|motors?)\b/i,
    buyers: [
      'Electrical contractor',
      'Real-estate developer',
      'Solar installer',
      'Factory maintenance team',
      'Electrical wholesaler',
      'Hospital group',
      'Hotel group',
      'Government contractor',
      'Equipment maker',
      'Electrical retail store',
    ],
    reason: (p) => `Installs or resells ${p}`,
  },
  {
    match: /\b(textiles?|garments?|fabrics?|cloth\w*|apparel|yarns?|uniforms?|sarees?|denim|hosiery|kurtis?|t-?shirts?)\b/i,
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
    match: /\b(chemicals?|resins?|polymers?|dyes?|pigments?|adhesives?|solvents?|plastic granules|raw materials?)\b/i,
    buyers: [
      'Paint manufacturer',
      'Textile processor',
      'Pharma company',
      'Plastic moulder',
      'FMCG brand',
      'Water treatment firm',
      'Packaging maker',
      'Agro-chemical company',
      'Chemical trader',
      'Export house',
    ],
    reason: (p) => `Uses ${p} as a raw material`,
  },
  {
    match: /\b(seeds?|fertili[sz]ers?|pesticides?|tractors?|irrigation|drip|agri\w*|farm\w*|organic|cattle feed|poultry)\b/i,
    buyers: [
      'Farmer producer organisation',
      'Agri-input dealer',
      'Plantation company',
      'Food processor',
      'Dairy cooperative',
      'Agri e-commerce seller',
      'Nursery chain',
      'Contract farming company',
      'Export trader',
      'Agri equipment dealer',
    ],
    reason: (p) => `Buys ${p} every season`,
  },
  {
    match: /\b(jewell?ery|jewelry|handicrafts?|handmade|gifts?|gifting|decor|candles?|toys?|artificial flowers|souvenirs?|idols?)\b/i,
    buyers: [
      'Gift store chain',
      'Corporate gifting company',
      'Lifestyle retail chain',
      'Wedding planner',
      'Boutique store group',
      'Online marketplace seller',
      'Hotel gift shop',
      'Export house',
      'Festival-season distributor',
      'Souvenir and museum store',
    ],
    reason: (p) => `Stocks items like ${p}`,
  },
  {
    match: /\b(food|spices?|snacks?|bakery|dairy|milk|sweets?|tea|coffee|rice|atta|flour|masalas?|beverages?|juices?|biscuits?|namkeen|pickles?|honey|(edible|cooking|mustard|groundnut|coconut|sunflower|sesame|olive|soybean) oils?|ghee|dry ?fruits?|chocolates?)\b/i,
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
    match: /\b(packag\w*|cartons?|boxes|box|labels?|bottles?|pouch(es)?|corrugated|packets?|bags?|containers?)\b/i,
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
    match: /\b(software|saas|it services|apps?|websites?|digital marketing|marketing|agency|design|consult\w*|services?|training|accounting|ca firm|legal|hr|recruitment)\b/i,
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
  const profile = PROFILES.find((p) => p.match.test(product)) || GENERIC;
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
        '<b>All unlocked.</b> At launch your Sales AI finds real buyers like these for you.';
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
