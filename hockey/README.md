# IceQ — POC v0.1: The House

A hockey IQ app for 10U players. Learn where to be when you don't have the puck.

**v0.1 ships one scenario** — **The House** (identify the dangerous area in the defensive zone). More scenarios come in v0.2+ (Defensive Side of the Puck, Backcheck Lanes, etc.).

## Run locally

Because the PWA uses a service worker, you need to serve over HTTP (not `file://`).

### Option 1 — Python (simplest)
```
cd Personal/Hockey/app
py -m http.server 8000
```
Open `http://localhost:8000` in Chrome, Safari, or Firefox.

### Option 2 — Node
```
npx serve Personal/Hockey/app
```

### On your phone (same Wi-Fi)
1. On desktop, find your local IP: `ipconfig` (Windows) — look for IPv4 address, e.g., `192.168.1.47`
2. On phone, open `http://192.168.1.47:8000` in Chrome (Android) or Safari (iOS)
3. To "install" as an app:
   - **iOS Safari**: Share → Add to Home Screen
   - **Android Chrome**: ⋮ menu → Add to Home Screen / Install App

After installing, the app works offline.

## What to test

### The mechanic
- [ ] Rink renders clearly in portrait orientation
- [ ] Tapping a grid cell toggles it (red = selected, faint blue = not)
- [ ] Check button: correct cells turn green, wrong cells turn red, missed cells turn amber
- [ ] Show Me button: canonical house polygon fades in with labels
- [ ] Reset button: all cells return to idle; overlay clears

### The pedagogy (watch the kid's face)
- [ ] Does the kid understand the task without reading help?
- [ ] Do they tap the term pills at the bottom to see definitions?
- [ ] Does the feedback phrasing feel natural (not condescending, not scolding)?
- [ ] Do they want to try again after feedback?

### The car-ride fit
- [ ] Loads on spotty highway signal after first visit (service worker works)
- [ ] Portrait orientation is comfortable one-handed
- [ ] No motion sickness — the only animations are gentle fade-ins

## What's deliberately NOT in v0.1
- Other scenarios (Defensive Side of the Puck, Backcheck, etc.) — come in v0.2
- Profile / kid name / team color picker — v0.2 bolts on
- Audio / haptics
- Pre-rink vs. post-rink framing
- Parent/coach view
- Any multi-age content (10U only)

## Directory map
```
app/
├── index.html         # entry point
├── manifest.json      # PWA manifest
├── service-worker.js  # offline cache
├── css/app.css        # styles (CSS vars for easy palette swap)
├── js/
│   ├── vocab.js       # kid-English term definitions
│   ├── rink.js        # Konva half-rink renderer
│   ├── house.js       # The House scenario (grid, polygon, scoring, feedback)
│   └── main.js        # app entry + button wiring + vocab popups
├── assets/icon.svg    # placeholder icon (PNG versions TBD)
└── README.md
```

## Known POC gaps (intentional)
- PNG app icons aren't generated yet — only the SVG. iOS ignores SVG icons on home screen.
- Spartans palette uses placeholder hex codes (`#B31B1B` crimson). Swap real colors in `css/app.css` `:root` block.
- No resize handling mid-session — rotating the phone triggers a reload.
- Single scenario hard-coded to the initial view — no scenario picker yet.

## Research grounding (quick)
- **No Glossary button** — definitions reveal silently on tap (Ryan & Pintrich; Marchand & Skinner on help-avoidance in 9-10 year olds)
- **Process praise**, not person praise ("you mapped the whole house" vs. "you're smart") — Dweck
- **No leaderboard, no comparison between kids** — Toda et al. on gamification's
  dark side for kids. Progress is local to the device and is never shared.
- **Soft timing, never a fail state** — the rush meter rewards a fast read and
  costs nothing when it runs out. Built this way after a 10U playtester said a
  real countdown would make him guess instead of read, and then quit.
- **The daily streak can be turned off** — on by default, one tap to kill from
  the home screen, and turning it off does not erase the count. Added after a
  parent panel split on it: streaks break on tournament weekends, which punishes
  the kids doing the most hockey.
- **Constraint-based, not prescriptive** — Newell's Constraints-Led Approach
- See `quality_reports/plans/2026-04-21_hockey_without_puck_spec.md` for full design rationale.
