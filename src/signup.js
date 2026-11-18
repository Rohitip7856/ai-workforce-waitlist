/*
 * Waitlist form.
 * Set VITE_WAITLIST_ENDPOINT (e.g. a Supabase Edge Function URL) to save real signups.
 * Without it, the prototype only remembers the signup in this browser.
 */
const ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEGMENTS = ['Manufacturing', 'Services', 'Retail', 'Other'];

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

async function send(payload) {
  if (!ENDPOINT) {
    await new Promise((r) => setTimeout(r, 650));
    return { ok: true };
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json().catch(() => ({ ok: true }));
}

const ARROW = '<svg class="btn-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BTN_LABEL = `Join the waitlist ${ARROW}`;

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
      <p class="joined-sub">What do you sell?</p>
      <div class="chips" role="group" aria-label="What do you sell?">${chips}</div>
      <button type="button" class="copy">Copy invite link</button>
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

  const syncChips = (value) =>
    hosts.forEach((h) =>
      h.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === value))),
    );

  function showJoined() {
    hosts.forEach((h) => {
      h.querySelector('form').hidden = true;
      h.querySelector('.joined').hidden = false;
    });
  }

  if (read('wf_joined') === '1') {
    showJoined();
    syncChips(read('wf_segment'));
    onJoined?.({ instant: true });
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
        if (!code) {
          code = Math.random().toString(36).slice(2, 8);
          write('wf_code', code);
        }
        await send({ email, ref, code });
        write('wf_joined', '1');
        showJoined();
        h.querySelector('.joined-title').focus({ preventScroll: true });
        onJoined?.({ instant: false });
      } catch {
        err.textContent = "Couldn't join right now. Check your connection and try again.";
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
        if (ENDPOINT) send({ code, segment: c.dataset.value }).catch(() => {});
      }),
    );

    const copy = h.querySelector('.copy');
    copy.addEventListener('click', async () => {
      const link = `${location.origin}${location.pathname}?ref=${code || ''}`;
      try {
        await navigator.clipboard.writeText(link);
        copy.textContent = 'Invite link copied';
      } catch {
        copy.textContent = link;
      }
      setTimeout(() => (copy.textContent = 'Copy invite link'), 2400);
    });
  });
}
