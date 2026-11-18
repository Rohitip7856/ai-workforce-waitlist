/*
 * Waitlist form.
 * With VITE_SUPABASE_URL and VITE_SUPABASE_KEY (publishable key) set, signups are saved in Supabase
 * through the join_waitlist / waitlist_stats / set_waitlist_segment functions
 * (supabase/migrations/20261118_waitlist.sql), and visitors see their real place in line.
 * Without them, the form still works but only remembers the signup in this browser.
 */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEGMENTS = ['Manufacturing', 'Services', 'Retail', 'Other'];
const JUMP = 25; // places gained per referral (matches the database function)

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* storage blocked — ignore */
  }
}

async function rpc(name, args) {
  const headers = { 'content-type': 'application/json', apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`; // legacy anon key
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body.includes('invalid_email') ? 'invalid_email' : String(res.status));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Live numbers for the page (total signups). Resolves to null without a backend. */
export async function getStats(code = null) {
  if (!HAS_BACKEND) return null;
  try {
    return await rpc('waitlist_stats', { p_code: code });
  } catch {
    return null;
  }
}

const ARROW =
  '<svg class="btn-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BTN_LABEL = `Join the waitlist ${ARROW}`;
const WA_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z"/></svg>';

let uid = 0;
function template() {
  const id = `email-${++uid}`;
  const chips = SEGMENTS.map(
    (s) => `<button type="button" class="chip" data-value="${s}" aria-pressed="false">${s}</button>`,
  ).join('');
  return `
    <form class="signup-form" novalidate>
      <label class="sr-only" for="${id}">Work email</label>
      <div class="field">
        <input id="${id}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com" required />
        <button type="submit">${BTN_LABEL}</button>
      </div>
      <p class="error" role="alert" hidden></p>
      <p class="fine">Launch news only. <a href="#privacy">Privacy</a></p>
    </form>
    <div class="joined" hidden>
      <p class="joined-title" tabindex="-1">You're on the list.</p>
      <div class="rank" hidden>
        <span class="rank-num" data-rank></span>
        <span class="rank-copy"><b>your place in line</b><small data-rank-sub></small></span>
      </div>
      <div class="rank-bar" hidden><i data-rank-bar></i></div>
      <div class="share-row">
        <a class="share-wa" data-wa target="_blank" rel="noopener">${WA_ICON}Invite on WhatsApp</a>
        <button type="button" class="copy">Copy invite link</button>
      </div>
      <p class="joined-sub">What do you sell?</p>
      <div class="chips" role="group" aria-label="What do you sell?">${chips}</div>
    </div>`;
}

export function mountSignups({ onJoined } = {}) {
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) {
    ['wf_joined', 'wf_code', 'wf_segment'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
  }
  const ref = params.get('ref');
  let code = read('wf_code');

  const hosts = [...document.querySelectorAll('[data-signup]')];
  hosts.forEach((h) => (h.innerHTML = template()));

  const inviteLink = () => `${location.origin}${location.pathname}?ref=${code || ''}`;
  const syncChips = (value) =>
    hosts.forEach((h) =>
      h.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === value))),
    );

  function renderRank(stats) {
    hosts.forEach((h) => {
      const wa = h.querySelector('[data-wa]');
      const text = `I just joined the AI Workforce waitlist — an AI team that runs sales, marketing and operations for your business. Get early access: ${inviteLink()}`;
      wa.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
      const rank = h.querySelector('.rank');
      const bar = h.querySelector('.rank-bar');
      if (!stats || !stats.position) {
        rank.hidden = true;
        bar.hidden = true;
        return;
      }
      const refs = stats.referrals || 0;
      const goal = 3;
      rank.hidden = false;
      bar.hidden = false;
      h.querySelector('[data-rank]').textContent = `#${stats.position}`;
      h.querySelector('[data-rank-sub]').textContent =
        refs >= goal
          ? `${refs} businesses joined through you — you've jumped ${refs * JUMP} places.`
          : `Invite ${goal - refs} more ${goal - refs === 1 ? 'business' : 'businesses'} to jump ${(goal - refs) * JUMP} places.`;
      h.querySelector('[data-rank-bar]').style.width = `${Math.min(100, (refs / goal) * 100)}%`;
    });
  }

  function showJoined(stats) {
    hosts.forEach((h) => {
      h.querySelector('form').hidden = true;
      h.querySelector('.joined').hidden = false;
    });
    renderRank(stats);
    document.body.classList.add('is-member');
    document.dispatchEvent(new CustomEvent('waitlist:joined', { detail: stats }));
  }

  if (read('wf_joined') === '1') {
    showJoined(null);
    syncChips(read('wf_segment'));
    onJoined?.({ instant: true });
    if (code) getStats(code).then((s) => s && renderRank(s));
  }

  hosts.forEach((h) => {
    const form = h.querySelector('form');
    const input = form.querySelector('input');
    const err = form.querySelector('.error');
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!EMAIL_RE.test(email)) {
        err.textContent = 'Enter an email like name@company.com.';
        err.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      err.hidden = true;
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      btn.textContent = 'Joining…';
      try {
        let stats = null;
        if (HAS_BACKEND) {
          stats = await rpc('join_waitlist', { p_email: email, p_ref: ref });
          code = stats.code;
        } else {
          await new Promise((r) => setTimeout(r, 500));
          code = code || Math.random().toString(36).slice(2, 10);
        }
        write('wf_code', code);
        write('wf_joined', '1');
        showJoined(stats);
        h.querySelector('.joined-title').focus({ preventScroll: true });
        onJoined?.({ instant: false });
      } catch (ex) {
        err.textContent =
          ex.message === 'invalid_email'
            ? 'Enter an email like name@company.com.'
            : "Couldn't join right now. Check your connection and try again.";
        err.hidden = false;
      } finally {
        btn.disabled = false;
        btn.innerHTML = BTN_LABEL;
      }
    });

    h.querySelectorAll('.chip').forEach((c) =>
      c.addEventListener('click', () => {
        syncChips(c.dataset.value);
        write('wf_segment', c.dataset.value);
        if (HAS_BACKEND && code) rpc('set_waitlist_segment', { p_code: code, p_segment: c.dataset.value }).catch(() => {});
      }),
    );

    const copy = h.querySelector('.copy');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(inviteLink());
        copy.textContent = 'Invite link copied';
      } catch {
        copy.textContent = inviteLink();
      }
      setTimeout(() => (copy.textContent = 'Copy invite link'), 2400);
    });
  });
}
