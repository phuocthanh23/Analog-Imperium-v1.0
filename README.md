# Analog Imperium v1.0

> *"For the Emperor."*

A Warhammer 40,000-themed Chrome side-panel extension. Every keystroke you make in the browser feeds a live terminal that renders Python one-liners, drives a spinning 3D sigil, pulses a DNA helix, and plots your location on a holographic globe — all rendered through a CRT phosphor aesthetic.

---

## Screenshot

```
┌─────────────────────────────────────────────────────┐
│  GEO NODE ─────────────────────────────── TERRA      │
│  [planet buttons]  [spinning globe]  [planet buttons] │
│  UTC TIME                         LAT/LON · COUNTRY  │
├────────────────────┬────────────────────────────────┤
│  GENE-SEED ────    │  SIGNUM ──────────────────────  │
│  [DNA helix]       │  [3D rotating model]            │
│  NODE · ISP        │                                 │
│  ▼ DL  --  Mbps   │         AVE·IMPERATOR           │
│  ▲ UL  --  Mbps   │                                 │
│  [ ANALYZE ]       │                                 │
├────────────────────┴────────────────────────────────┤
│  EVENT STREAM ─────────────────────────── ● LIVE    │
│  [PY]  fib=lambda n,a=0,b=1:a if n==0 else...       │
│  [PY]  clamp=lambda v,a,b:max(a,min(b,v))           │
│  >> _                                                │
│  EVT ████░░░░░░  42                                 │
├─────────────────────────────────────────────────────┤
│  + OPEN CODEX                                        │
└─────────────────────────────────────────────────────┘
```

---

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Click the Analog Imperium toolbar icon — the side panel opens automatically.

> The side panel is pinned to the browser window. It stays open as you browse.

---

## How It Works

### Architecture

| File | Role |
|---|---|
| `manifest.json` | Manifest V3 — declares permissions, side panel, content script, options page |
| `background.js` | Service worker — opens the panel on toolbar click; bridges messages from the content script to the side panel via a persistent port |
| `content.js` | Injected into every page — captures keystrokes and forwards them to the background |
| `sidepanel.js` | All UI logic — boot sequence, globe, DNA helix, 3D sigil, event stream, speed test |
| `sidepanel.html/css` | Side panel markup and CRT terminal styling |
| `options.html/js` | Settings page — custom Codex URL and Signum model picker |

**Message flow:**

```
[Active Tab — content.js]
        │  keydown → chrome.runtime.sendMessage({ type: 'keystroke', key })
        ▼
[background.js — service worker]
        │  forwards via persistent port
        ▼
[sidepanel.js — handleKeystroke()]
        │  picks Python snippet → addEventLine()
        ▼
[EVENT STREAM terminal]
```

---

## Preloader

On first open, a full-screen boot sequence plays before any module is visible:

1. **Aquila Signum** — the Imperium double-headed eagle (`aquila.svg`) fades in at the centre of the screen.
2. **INITIALIZING** label and progress bar animate beneath it.
3. Once the 3D sigil model finishes loading, the preloader fades out.
4. Modules reveal **top-to-bottom** with a staggered `> initializing...` overlay (500 ms per row) before each module's content appears:
   - `t = 0 ms` — GEO NODE
   - `t = 600 ms` — GENE-SEED + SIGNUM
   - `t = 1 200 ms` — EVENT STREAM

---

## Modules

### [01] GEO NODE

A real-time interactive holographic globe rendered on HTML Canvas.

**Features:**
- **6 selectable planets** — each with a unique colour palette derived from Warhammer 40K lore. Select via the dot buttons on either side of the globe.

  | # | Planet | Terrain | Notes |
  |---|---|---|---|
  | 0 | Terra | Earth continents | Home of the Emperor |
  | 1 | Cadia | Earth continents | Blue-green, fallen fortress world |
  | 2 | Fenris | Cratered | Ice world, Space Wolves homeworld; has orbiting moon |
  | 3 | Catachan | Alien | Jungle death world |
  | 4 | Calth | Earth continents | Ultramar civilised world, rose-pink |
  | 5 | Necromunda | Volcanic | Industrial hive world, golden-yellow |

- **Drag to rotate** — click and drag the globe. Releases with momentum decay.
- **Auto-rotation** — slow continuous spin when idle.
- **Terrain types** — procedurally rendered continents, craters, volcanic crack networks, and alien landmasses; polar ice caps; latitude/longitude grid; CRT scanlines overlay.
- **Settlement glows** — pulsing population hotspots per planet with lore-accurate positions (e.g. Europe, Asia, Americas on Terra; The Fang on Fenris; Hive Primus on Necromunda).
- **Equatorial rings** — rendered for certain planets.
- **Moon** — Fenris has an orbiting moon rendered in the globe canvas.
- **Info bar** — shows live UTC time (left) and your GPS coordinates + country name (right), resolved via the browser Geolocation API and reverse-geocoded through OpenStreetMap Nominatim.
- **Location pin (Terra only)** — a gold pulsing dot with two concentric rings marks your real-world position on the globe when geolocation is granted.

---

### [02] GENE-SEED

A Three.js 3D double-helix DNA strand that reacts to your typing speed.

**Features:**
- **48-step double helix** with backbone tubes, strand spheres, and base-pair connectors — all rendered in phosphor green.
- **Rotation speed** scales with typing intensity — faster typing → faster spin.
- **Emissive breathing pulse** — material emissive intensity oscillates continuously.
- **Network speed panel** — displays your active ISP node name, download speed (Mbps), and upload speed (Mbps).
- **ANALYZE button** — triggers a live network speed test:
  1. Queries `ip-api.com` for your IP, ISP name, and coordinates.
  2. Finds the nearest Speedtest.net server via haversine distance.
  3. Measures download speed by timing a large binary fetch.
  4. Estimates upload speed.
  5. Results populate the DL / UL readouts.

---

### [03] SIGNUM

A Three.js 3D hologram module rendering a rotating Warhammer 40K model.

**Features:**
- **4 selectable models** (configured in the Options page):

  | Key | Model | Label |
  |---|---|---|
  | `imperium` | Imperium Aquila | AVE·IMPERATOR |
  | `bolter` | Astartes Bolter | BOLT·GUN·PRIME |
  | `templars` | Black Templars Cross | DEUS·VULT |
  | `inquisitor` | Inquisitor | ORDO·MALLEUS |

- **Auto-fit & centering** — each model is normalised to ~5 units and centred at world origin regardless of the GLB's embedded transforms or pivot offsets.
- **Green Imperium lighting** — ambient + two point lights in phosphor green (`#00ff44` / `#00ff66`).
- **Hologram material** — MeshStandardMaterial with emissive glow, dual additive back-face glow layers (inner + outer halo), and a continuous emissive breathing pulse.
- **Rotation speed** driven by the same typing intensity as the DNA helix.
- **Label** below the canvas shows the model name (e.g. `AVE·IMPERATOR`).

---

### [04] EVENT STREAM

A live terminal that logs every keystroke as a Python code snippet.

**Features:**
- **Auto-commit on keypress** — every printable key typed anywhere in the browser instantly appends a random Python one-liner to the terminal. No Enter required.
- **Python pool** — 30 compact one-liners (fibonacci, primes, clamping, chunking, Caesar cipher, Hamming distance, etc.). A new snippet is chosen randomly on each keypress.
- **Auto-flush every 100 keys** — the entire line buffer is wiped at every 100th keypress to keep memory usage flat and the terminal clean.
- **Intensity meter** — the `EVT` status bar and counter track cumulative event volume; intensity decays over time when typing stops.
- **Boot sequence** — on startup the terminal prints a styled boot log:
  ```
  ANALOG IMPERIUM v1.0 // SECTOR-9
  ────────────────────────────────
  BOOT: kernel        [OK]
  BOOT: net.stack     [OK]
  BOOT: cipher.mod    [OK]
  BOOT: side_panel    [OK]
  BOOT: event.tap     [OK]
  BOOT: signum.3d     [OK]
  BOOT: <ISO timestamp>
  ────────────────────────────────
  FOR THE EMPEROR // awaiting events...
  ```
- **Max 200 lines** in memory at any time (trimmed from the top).

---

## Open Codex Button

The `+ OPEN CODEX` button at the bottom of the panel opens a tab or window.

- **Default** — opens a plain incognito-style tab.
- **Custom URL** — set any URL in the Options page (see below); that URL will open instead.

---

## Options Page

Access via `chrome://extensions` → *Analog Imperium* → **Details** → **Extension options**, or right-click the toolbar icon → **Options**.

### Open Codex — Target URL

Paste any URL into the text field. When the `+ OPEN CODEX` button is pressed in the side panel, this URL opens in a new tab. Leave blank to open a plain new tab.

```
https://your-preferred-url.com
```

Press **SAVE SETTINGS** or hit `Enter` to save.

### Signum — 3D Object

Choose which 3D model rotates in the SIGNUM module:

- **Imperium Aquila Signum** — the default double-headed eagle (`logo.glb`)
- **Astartes Bolter** — bolt gun
- **Black Templars Cross** — crusader cross
- **Inquisitor — Ordo Malleus** — Inquisitor figure (scaled to 85%)

After saving, the side panel **reloads automatically** — no need to close and reopen it.

---

## CRT Visual Effects

All UI is rendered through a layered CRT effect stack:

| Effect | Implementation |
|---|---|
| **Scanlines** | CSS repeating-linear-gradient overlay at reduced opacity |
| **Vignette** | Radial gradient darkening at screen edges |
| **Phosphor flicker** | CSS keyframe animation on opacity |
| **Chromatic aberration** | SVG `feColorMatrix` + `feOffset` filter splitting R/G/B channels by ±0.7px horizontally |
| **Phosphor flash** | One-shot bright flash on panel open simulating CRT power-on |

---

## File Structure

```
Analog-Imperium-v1.0/
├── manifest.json           — Extension manifest (MV3)
├── background.js           — Service worker / message bridge
├── content.js              — Keystroke capture (injected into all pages)
├── sidepanel.html          — Side panel markup
├── sidepanel.css           — CRT terminal styles + module layouts
├── sidepanel.js            — All UI logic (globe, DNA, 3D sigil, terminal)
├── options.html            — Settings page markup + styles
├── options.js              — Settings page logic (chrome.storage.sync)
├── aquila.svg              — Preloader Imperium Aquila symbol
├── logo.glb                — Default Signum model (Aquila)
├── three.min.js            — Three.js r148 (bundled)
├── GLTFLoader.js           — Three.js GLTF loader (bundled)
├── icon48.png              — Extension icon
├── icon128.png             — Extension icon (large)
├── fonts/
│   ├── OTF/MonoBlaze.otf
│   ├── TTF/MonoBlaze.ttf
│   └── WEB/MonoBlaze.woff2 / .woff
└── 3d_objects/
    ├── 40k_bolter.glb
    ├── black_templars_cross.glb
    └── Inquisitor.glb
```

---

## Permissions

| Permission | Purpose |
|---|---|
| `sidePanel` | Render the UI as a Chrome side panel |
| `geolocation` | Show your location pin on the Terra globe |
| `tabs` | Open the Codex tab from the panel |
| `storage` | Persist settings (Codex URL, Signum model) via `chrome.storage.sync` |
| `https://nominatim.openstreetmap.org/*` | Reverse-geocode coordinates to country name |
| `http://ip-api.com/*` | Resolve ISP name and coordinates for speed test server selection |
| `<all_urls>` | Content script keystroke capture; speed test binary download |

---

## Tech Stack

- **Vanilla JS** (ES5-compatible IIFE, no build step)
- **Three.js r148** — 3D DNA helix and Signum model rendering
- **HTML Canvas 2D** — globe rendering (no WebGL)
- **Chrome Extensions Manifest V3** — service worker, side panel API, content scripts
- **chrome.storage.sync** — settings persistence across devices
- **MonoBlaze** — custom monospace font

---

*AVE IMPERATOR*
