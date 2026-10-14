# 🛺 Namma Roads — Bengaluru traffic simulator

An interactive, animated 3D (three.js) simulator of Bengaluru's road and traffic problems, built to make
drivers, pedestrians and authorities **see** how each issue hurts the city — and how fixes help.

- **Stylized Bengaluru**: ORR, Sarjapur Rd, MG Rd, Hosur Rd, Bellary Rd, Old Airport Rd … with Silk Board,
  Hebbal, Majestic, Chinnaswamy, Cubbon Park, Vidhana Soudha, Lalbagh, Bellandur Lake (with froth), Namma Metro
  lines and areas from Malleswaram to Electronic City.
- **~1,500 simulated road users** (two-wheelers, autos, cars, BMTC buses, trucks, tankers, tractors), pedestrians,
  stray cattle, wrong-way riders and ambulances, all driving on the **left**.
- **31 issue sliders** (None / Low / Med / High) covering all 85 issues from the tracker. Defaults come from
  the sheet's severity × frequency. Each has a **👁 Preview** that flies to a spot where the issue is hurting traffic,
  with a live *Issue ON / OFF* switch.
- **Click anything**: issue markers (fix it / make it worse), vehicles (follow, see their bad habits, "fix this driver",
  tow), wrong-way riders, jaywalkers, cattle.
- **Fixes tab**: one-tap programmes (buses + metro feeders, pothole drive, adaptive signals, cameras + auto-challan …).
- **Scenarios**: Bengaluru Today, Dream Bengaluru, Monsoon Evening, Match Day at Chinnaswamy, Friday ORR Rush, Late Night.
- **City score 0–100** = 35% flow + 35% safety + 15% calm + 15% walkability. It blends an instant estimate from the
  sliders with what the simulation actually measures (speeds, crashes, injuries, near-misses, honks, stress).
- Congestion colours on roads, honk bubbles (+ optional synthesized horns), crash bursts and pulsing crash rings,
  ambulances that do or don't get a green corridor, day/night with lit windows and headlights, rain and haze.
- **👁 Show on map**: switch buildings, trees, landmarks, metro, vehicles, people, honks, habit/crash bubbles, issue markers (by category) and each kind of label on or off; remembered per browser.
- **Rotate the map**: right-drag, Shift/⌘ + drag, two fingers, Q / E, the ⟲ ⟳ buttons, or drag the compass (click it for north up).
- **English / ಕನ್ನಡ** toggle and a mobile layout (bottom sheet, touch pan / pinch / rotate).

- **Who's in charge here?** A location pill follows the camera and opens the local body (one of GBA's five city
  corporations, or "outside GBA"), its commissioner as reported in Sept 2025 (with source link), and official helplines
  (1533, 112, BTP, BESCOM 1912, BWSSB 1916, 108). Officers change often, so always check the source. No photos are shown.
- **Search** (🔍 or `/`): places, roads, junctions, landmarks and exit roads, plus businesses and buildings via
  OpenStreetMap Nominatim (your query is sent to nominatim.openstreetmap.org; results are placed approximately on the
  stylized map using `src/data/geo.ts`).
- **Simulated drive**: pick 🟢 start and 🏁 destination from search results and drive a red Wagon R with black roof
  through the live traffic: time, distance, average speed, stress, stops, waiting, honks at you, near misses and time
  lost versus empty roads.
- **Self-drive** (🕹️ in search or on the trip card): lane-based — ↑ accelerate, ↓ brake, ← → change lane or pick the
  turn near a junction, `C` cycles Follow / Street / 🪑 Driver seat, Esc hands back to autopilot. On-screen pedals on touch devices.
- **Driver-seat camera** for any vehicle (right-hand drive), with dashboard, speedometer and stress gauge.
- **Namma Metro from OpenStreetMap** (© OpenStreetMap contributors, ODbL): Purple, Green and Yellow lines open; Pink and
  Blue (airport) under construction, drawn as smooth splines with stations. Refresh with `node scripts/fetch-metro.mjs`
  (needs a responsive Overpass server; the committed `src/data/metro.json` was built 2026-10-14, with underground sections
  in the city core approximated).
- **Traffic volume** slider (30–180%) in the World panel.
- Bilingual NH-style highway signs on every exit road (Hosur, Hoskote, Mysuru, Tumakuru, Kanakapura, Magadi, airport…).
- Real CC0 horn recordings per vehicle type that fade as you zoom out (credits in `public/sounds/CREDITS.md`).

> Kannada text was written by the developer — please have a native speaker review `src/i18n/i18n.ts`,
> `src/data/issues.ts`, `src/data/sliders.ts` and `src/data/presets.ts`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # score / data integrity / headless simulation calibration
npm run build      # static site in dist/
npm run preview
```

## Deploy

`dist/` is a plain static site (relative paths), so it works on any static host.

- **GitHub Pages**: push to `main`; `.github/workflows/deploy.yml` tests, builds and publishes.
  In the repo settings set *Pages → Source* to *GitHub Actions*.
- **Cloudflare Pages / Netlify**: build command `npm run build`, output directory `dist`.

## Project map

| Path | What |
|---|---|
| `src/data/issues.ts` | All 85 issues (sheet rows 1–77, Environment 78–80, new 81–85), category, owner, agencies, fixes, en + kn |
| `src/data/sliders.ts` | 31 simulator controls: linked issues, defaults, score weights, preview hotspot |
| `src/data/city.ts` | Stylized map: junctions, roads, areas, landmarks, metro lines |
| `src/data/presets.ts` | Scenarios and one-tap fix programmes |
| `src/sim/` | Rendering-free simulation: road network, IDM car-following + lane changes, signals, hazards, incidents, pedestrians, ambulances, metrics, score |
| `src/world/` | three.js scene: roads, buildings, landmarks, vehicles, hazards, effects, labels, camera |
| `src/ui/ui.ts` | HUD, panels, cards, toasts, mobile sheet |
| `exports/issues_updated.csv` | Updated issue list to paste back into the Google Sheet (`node --experimental-strip-types scripts/export-csv.ts`) |

## Changes to the issue list

- New category **Pedestrians & public space** (issues 5, 7, 40, 47, 64, 68).
- Issue 32 (U-turns from the wrong lane) moved to *Road & infrastructure* — the root cause is missing turn lanes.
- Every issue now also lists the **agencies** that can act (GBA/BBMP, BTP, RTO, BMTC, BESCOM, BWSSB, BMRCL, NHAI, citizens).
- Rows 78–80 (Environment) were cut off in the sheet export, so they were re-created: heavy rain, sun glare,
  festivals/matches/events. Please compare with your originals.
- New issues: metro & flyover works (81), garbage & debris piles (82), underpass flooding (83),
  tech-corridor peak surges (84), poor last-mile public transport (85).
- New owner group: *Urban & transport planning*.

Severity, frequency and the model's coefficients are informed guesses, not measured data — the simulator is meant to
show *direction and mechanism*, not to forecast.
