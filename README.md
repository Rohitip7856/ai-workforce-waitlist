# AI Workforce — waitlist site

A coming-soon page with a 3D "orchestrator" scene: one core and three AI agents (Sales, Marketing, Operations). The scene follows the visitor's local time: day light from 6 am to 6 pm, glowing night mode otherwise.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production files in dist/
```

Add `?reset` to the URL to clear your own test signup.

## Files

- `index.html` — all page text and sections
- `src/scene.js` — the Three.js scene (core, agents, particles, camera, day/night)
- `src/main.js` — scroll → camera wiring, day/night toggle, loads the 3D after the page is usable
- `src/signup.js` — waitlist form, "What do you sell?" chips, invite link
- `src/style.css` — layout, colours, type

## Before launch

- **Save real signups.** Create a Supabase project, run `supabase/migrations/20261118_waitlist.sql`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (the publishable key) in `.env.local` and in Vercel's environment variables. That turns on saved signups, place in line, referral jumps and the live "spots left" count. Without them, signups are only remembered in the visitor's own browser.
- **Brand name.** "AI Workforce" is a placeholder in `index.html`.
- **Privacy page.** The "Privacy" links point to `#privacy`.

## Images

- `public/img/team|sales|marketing|ops|control.webp` — stills rendered from the site's own 3D scene.
- `public/img/photo-*.webp` — free photos from Unsplash (Unsplash License: free commercial use, no attribution required). Source photo IDs:
  owner `photo-1771244688590-1e481dba1b5a`, cnc `photo-1740209475472-aa7d280f7452`, warehouse `photo-1609143739217-01b60dad1c67`,
  call `photo-1758876204260-bdb299fa4374`, night `photo-1764096534686-68091ce5ab45`, content `photo-1618228123700-a1c948bb2bd1`.
- `public/img/field-*.webp` — Unsplash photos for the "Built to run your business" cards: marketing `photo-1519389950473-47ba0277781c`, sales `photo-1758599543157-bc1a94fec33c`, ops `photo-1740914994657-f1cdffdc418e`, control `photo-1542744173-05336fcc7ad4`.
- `public/img/lane-*.webp` — Unsplash photos for the workflow lanes: insta `photo-1562147458-0c12e8d29f50`, signing `photo-1564846824194-346b7871b855`, van `photo-1620455800201-7f00aeef12ed`.
