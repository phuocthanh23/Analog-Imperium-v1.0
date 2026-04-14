# Session Log — Analog Imperium v1.0

**Date:** 2026-04-14
**Project:** Analog Imperium — Chrome Extension (Side Panel)
**Working Directory:** `Analog-Imperium-v1.0/`
**Git Branch:** `main`
**Last Commits:**
- `c08a8d8` First version
- `2c6a293` Initial commit

---

## Session Changes — Part 2 (2026-04-14)

### Speed Test — Network Error Fixes (commit `8c1fbcd`)
- **`ip-api.com` 403** — free tier blocks HTTPS; switched to `http://ip-api.com/json` in code and manifest
- **`ERR_CERT_COMMON_NAME_INVALID`** on Ookla servers (e.g. `speedtest.viettel.vn`) — removed forced `http→https` conversion; Ookla servers use HTTP natively
- **`ERR_CONNECTION_RESET`** — same root cause as above; fixed by same change
- Dropped `&https_functional=true` filter to restore full 10-server candidate pool

### Open Codex — Settings Page + Behaviour Change
- **Moved custom URL out of the side panel UI** — removed input field; clean button-only UI restored
- **Added extension Options page** (`options.html` + `options.js`):
  - Access via right-click extension icon → **Options**
  - Cyberpunk-themed settings panel (dark green, amber accents)
  - URL input with `SAVE SETTINGS` button; Enter key also saves
  - `COGITATOR UPDATED` confirmation flash on save (2 s fade)
- **`manifest.json`** — added `"storage"` permission + `"options_page": "options.html"`
- **`sidepanel.js`** — button reads URL from `chrome.storage.sync` at click time
- **Behaviour changed** — `+ OPEN CODEX` now opens a new tab in the current window (`chrome.tabs.create`) instead of a new incognito window; URL from settings is applied if set, otherwise opens a blank new tab

### Current File List
| File | Role |
|------|------|
| `manifest.json` | MV3 config — permissions: sidePanel, geolocation, tabs, storage |
| `background.js` | Service worker; bridges content → side panel |
| `content.js` | Keystroke capture (printable, Backspace, Enter) |
| `sidepanel.html` | 4 modules + Open Codex button |
| `sidepanel.css` | Full cyberpunk theme |
| `sidepanel.js` | All side panel logic |
| `options.html` | Extension settings page |
| `options.js` | Settings load/save logic |
| `three.min.js` | Bundled THREE.js |
| `GLTFLoader.js` | GLB loader |
| `logo.glb` | Imperium sigil 3D mesh |

---

## Session Changes — Part 1 (2026-04-14)

### Bug Fix
- **`sidepanel.js`** — `wpmTimestamps` was used but never declared, causing a `ReferenceError` in strict mode on every keystroke. Fixed by adding `let wpmTimestamps = [];` to the state block. This was the root cause of typing not being reflected in the extension.

### UI / Layout Changes
- **Removed bezel header** — the `cp-bezel-top` bar (colored dots + "ANALOG IMPERIUM // SECTOR-9" title) was removed from `sidepanel.html` and its boot animation removed from CSS, freeing vertical space.
- **Module heights adjusted:**
  - `[01] GEO NODE`: `40vh → 30vh`
  - `[02/03] GENE-SEED + SIGNUM·3D row`: `20vh` (restored after intermediate reduction to 15vh)
  - `[04] EVENT STREAM`: `50% panel → 40vh`
  - `[05] OPEN CODEX button`: `5vh` standalone (replaces Codex Status module)
- **GEO NODE info bar** — time font enlarged (`15px → 24px`, `line-height: 1`) to match combined height of coords + country. Coords and country text right-aligned (`align-items: flex-end`, `text-align: right`). Row uses `align-items: flex-start`.

### Module Renames
- `GENOME SEQ → GENE-SEED`
- `BROWSER STAT → CODEX STATUS → removed` (replaced by standalone button)
- Button `+ INCOGNITO → + OPEN CODEX`
- Button `APOTHECARY ASSAY → ANALYZE`

### GENE-SEED Module — Full Redesign
- **2D canvas DNA animation replaced** with a procedural THREE.js 3D double helix:
  - 48-step double helix, 2.5 turns, radius 1.1, height 5.5 units
  - Two backbone strands with sphere nodes + cylinder tubes
  - Base-pair cross-connectors every 4 steps
  - Green emissive materials with breathing pulse
  - `setSpeed()` still driven by typing intensity
- **Layout changed to row:** DNA container (38% width left) + speed panel (right)
- **Speed panel layout** (matches screenshot):
  - `NODE · UNKNOWN` label at top (cyan, updates to nearest Cloudflare PoP on test)
  - `▼ DL` label above large value (`28px`) + `Mbps` unit
  - `▲ UL` label above large value + `Mbps` unit
  - `ANALYZE` button full-width at bottom, amber/gold color (`#ffb300`)
  - Panel uses `justify-content: space-between` for even vertical distribution

### Internet Speed Test
- **`manifest.json`** — added `"tabs"` permission and `https://speed.cloudflare.com/*` host permission
- **Speed test flow (`runGeneTest()`):**
  1. `DETECTING NODE...` → fetches `/meta` from Cloudflare to identify nearest PoP (e.g. `NODE·SIN`)
  2. `GENE-SCREENING...` → streams 10 MB from `/__down`, updates DL speed live
  3. `GENE-TITHE UPLINK...` → POSTs 3 MB to `/__up` for upload measurement
  4. Returns to `ANALYZE` on completion; shows `ERR` / `SIGNAL LOST` on failure

### Codex Status Module — Added then Removed
- Added `[05] CODEX STATUS` module with live tab count + Open Codex button
- Removed in favour of a leaner standalone `+ OPEN CODEX` button (`5vh`, full width, amber style) below Event Stream
- Tab-count JS and `chrome.tabs` event listeners cleaned up; `incognito` button wired directly

### Current Module Heights
| Module | Height |
|--------|--------|
| `[01] GEO NODE` | `30vh` |
| `[02] GENE-SEED + [03] SIGNUM·3D` | `20vh` |
| `[04] EVENT STREAM` | `40vh` |
| `+ OPEN CODEX` button | `5vh` |
| Panel padding + gaps | `~40px` |

---

## Project Overview

**Analog Imperium** is a Chrome Extension that opens a cyberpunk-themed side panel with live typing analytics and a Warhammer 40K Imperium of Man 3D sigil. The UI is styled as an analog terminal with CRT scan-line effects, phosphor glow, and color-coded event streaming.

---

## File Inventory

### `manifest.json`
- Manifest Version: 3
- Permissions: `sidePanel`, `geolocation`
- Host permissions: `https://nominatim.openstreetmap.org/*` (reverse geocoding)
- Background service worker: `background.js`
- Side panel entry: `sidepanel.html`
- Content scripts: `content.js` injected on all URLs at `document_idle`
- Web-accessible resource: `logo.glb` (the 3D Imperium sigil)
- Icons: `icon48.png`, `icon128.png`

---

### `background.js`
- Sets side panel to open on extension action click via `chrome.sidePanel.setPanelBehavior`
- Maintains a persistent `sidePanelPort` connection (long-lived port named `'sidepanel'`)
- Bridges messages from content scripts → side panel by forwarding any `chrome.runtime.onMessage` to the port

---

### `content.js`
- Injected into all pages; captures keyboard input only (no mouse events)
- Filters out: modifier keys (Shift, Control, Alt, Meta, CapsLock, Tab), modifier combos (CMD+, CTRL+)
- Sends to background:
  - `{ type: 'pageEvent', eventType: 'KEY', detail: 'Enter' }` — on Enter key
  - `{ type: 'keystroke', key: 'Backspace' }` — on Backspace
  - `{ type: 'keystroke', key: <char> }` — on any single printable character

---

### `sidepanel.html`
Four UI modules rendered in a vertical flex layout:

| Module | ID | Description |
|--------|-----|-------------|
| `[01] GEO NODE` | `#mod-globe` | Full-width top (40vh), animated planet + geo info bar |
| `[02] GENOME SEQ` | `#mod-dna` | Canvas-based animated DNA double helix |
| `[03] SIGNUM·3D` | `#mod-logo` | THREE.js 3D GLB model of the Imperium sigil |
| `[04] EVENT STREAM` | `#mod-terminal` | Live scrolling terminal log of typing/events |

Other notable HTML elements:
- `#ai-loading` — preload screen with animated progress bar; fades out when GLB loads
- SVG `#crt-convergence` filter — RGB channel offset simulating CRT chromatic aberration
- CRT overlay divs: `.cp-crt-scanlines`, `.cp-crt-vignette`, `.cp-crt-flicker`
- `.cp-phosphor-flash` — one-shot startup green phosphor flash
- `.cp-bezel-top` — title bar with colored status dots (`ANALOG IMPERIUM // SECTOR-9`)
- Planet selector buttons (6 total, left + right of globe canvas)

Script loading order: `three.min.js` → `GLTFLoader.js` → `sidepanel.js`

---

### `sidepanel.css`
- Full dark theme: `background: #050e05` (near-black green-tinted)
- Root gradient: `#1a1a2e → #0d0d1a → #050e05`
- CRT filter applied to `#cp-root` via SVG filter reference
- Module borders: `rgba(0,255,65,0.25)` green with inset box-shadow glow
- Terminal font: `'Courier New', monospace` throughout
- Event type color coding via `data-etype` attribute and CSS custom properties (`--et-color`):
  - `CLICK/DBLCLICK` → `#00ff41` bright green
  - `KEY` → `#39ff7a`
  - `PY` → `#00e5ff` cyan (Python snippets)
  - `SCROLL/WHEEL/BLUR` → dimmed `rgba(0,180,40,0.6)`
- Key animations: `crt-flicker`, `live-pulse`, `cp-dot-pulse`, `cp-blink`, `panel-boot`, `phosphor-flash`, `ai-loadprogress`
- Module layout: `[01]` = `40vh`, middle row = `20vh`, `[04]` terminal = `50%` of remaining height

---

### `sidepanel.js`

#### Constants & State
- `MAX_LINES = 200` — terminal log cap
- `EVENT_DECAY_INTERVAL = 200ms` — intensity decay tick rate
- State: `typingBuffer`, `currentSnippet`, `totalEvents`, `eventIntensity`, `lines[]`, `logo3d`, `dna`

#### Python Code Pool (`PYTHON_POOL`)
- 22 pre-written Python one-liners/snippets (fibonacci, prime check, quicksort, BFS, Caesar cipher, etc.)
- `randomPython()` picks one at random; displayed in the active input line as a "ghost" snippet while the user types

#### Event Configuration (`EVENT_CFG`)
- Maps 18 event types to display prefix labels and CSS class suffixes

#### Keystroke Handling
- `handleKeystroke(key)` — maintains `typingBuffer`; Backspace removes last char; any printable char appends and bumps intensity
- `handlePageEvent(type, detail)` — on Enter: commits current snippet as a `[PY]` log line, clears buffer

#### Intensity System
- `bumpIntensity()` — increments `eventIntensity` (max 10) on each keystroke
- Decay loop (every 200ms): reduces intensity by 0.3, updates status bar fill width, drives 3D logo rotation speed and DNA animation speed (range 0.6–2.1)

#### `initLogo3D()`
- Creates THREE.js `WebGLRenderer` inside `#logo-container`
- Loads `logo.glb` via `THREE.GLTFLoader`
- Fits model to 5.04 units (scaled up 68%)
- Applies `MeshStandardMaterial` with green emissive (`0x00aa44`) + two additive glow mesh layers
- Animation: continuous Y-axis rotation + emissive breathing pulse (sine wave)
- `setSpeed(s)` maps intensity range → `rotSpeed = 0.003 + s * 0.006`
- Dismisses `#ai-loading` prescreen on load success

#### `initDNA()`
- Canvas 2D double sine-wave helix with cross-strand connectors and endpoint dots
- Green glow (`#00ff41`) with shadow blur
- `setSpeed(s)` adjusts `offset += speed * 0.025` per frame

#### `initGlobe()` — Hologram Planet System
- 6 selectable planets with distinct color palettes, terrain types, and orbital mechanics:

| # | Name | Terrain | Moon | Primary Color |
|---|------|---------|------|---------------|
| 0 | TERRA | Earth continents | No | Orange `#ff9900` |
| 1 | VERDANIA | Alien continents | No | Green `#00ff64` |
| 2 | ROSEA | Gas-giant bands | Yes | Pink `#ff50a0` |
| 3 | VIOLUM | Craters | Yes | Purple `#b400ff` |
| 4 | IGNIS | Volcanic lava cracks | No | Red-orange `#ff5000` |
| 5 | LUMINA | Crystal hexagons | No | Magenta `#dc3cff` |

- 3D sphere projection via Y-axis rotation (`rot += 0.005` per frame)
- Features per draw frame: atmosphere halo, sphere gradient, terrain, lat/lon grid, polar ice caps, equatorial rings, scan line sweep, rim glow, projector beam from bottom
- Moon orbits for ROSEA and VIOLUM: elliptical orbit, depth-sorted front/back pass, craters on surface
- User location pin: pulsing yellow dot on TERRA at actual GPS coordinates
- Geolocation: `navigator.geolocation.getCurrentPosition` → reverse geocode via Nominatim API → displays coords + country name
- Live clock: updates `cp-globe-time` every second via `setInterval`

#### Boot Sequence
- Displays 11 boot-log lines sequentially (100ms each) in terminal:
  - `ANALOG IMPERIUM v1.0 // SECTOR-9`
  - Kernel/net/cipher/side-panel/event-tap/signum.3d boot status lines with `[OK]`
  - ISO timestamp
  - `FOR THE EMPEROR // awaiting events...`
- After boot: initializes `logo3d`, `dna`, and globe
- Guard: `booted` flag prevents double-boot

#### Chrome Port Connection
- `connectPort()` — connects persistent port named `'sidepanel'` to background service worker
- Auto-reconnects on disconnect (100ms timeout) to survive service worker termination

---

### `three.min.js`
- Bundled minified THREE.js library (r3D renderer, scene graph, lighting, camera)
- Used by `initLogo3D()` for the 3D sigil render

### `GLTFLoader.js`
- THREE.js GLTF/GLB file loader extension
- Attached to `THREE.GLTFLoader` for loading `logo.glb`

### `logo.glb`
- Binary GLB file containing the Imperium of Man Aquila/sigil 3D mesh
- Loaded at runtime via `chrome.runtime.getURL('logo.glb')`
- Declared as a web-accessible resource in `manifest.json`

### `icon48.png` / `icon128.png`
- Extension toolbar icons at 48×128 pixel sizes

### `README.md`
- Currently contains only the project title: `# Analog-Imperium-v1.0`

---

## Architecture Summary

```
User types in browser
        │
        ▼
  content.js (injected in all tabs)
   • keydown listener (printable chars, Backspace, Enter)
        │
        ▼ chrome.runtime.sendMessage
  background.js (service worker)
   • Forwards messages to side panel via persistent port
        │
        ▼ port.postMessage
  sidepanel.js
   • handleKeystroke / handlePageEvent
   • Updates typingBuffer, currentSnippet, eventIntensity
   • Renders terminal lines, drives 3D logo + DNA animation speed
        │
   ┌────┴─────────────────────────┐
   ▼                              ▼
initLogo3D()               initDNA()
THREE.js WebGL renderer     Canvas 2D double helix
Imperium GLB sigil          Animated sine-wave strands
        │
        ▼
  initGlobe()
  Canvas 2D planet system
  Geolocation + reverse geocoding
  6 selectable worlds
```

---

## Notes

- No external dependencies beyond THREE.js (bundled) and the Nominatim API for geocoding
- All UI is contained within the Chrome side panel — no popup or options page
- Typing analytics are purely visual/aesthetic — no data is stored or transmitted
- The extension uses Manifest V3 with a service worker (not a persistent background page)
