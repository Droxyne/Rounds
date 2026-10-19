# BLACKLINE — Tactical Operations

An original, touch-first, procedural Babylon.js tactical FPS. Built with Vite and ES modules; no backend, external model downloads, audio files, CDN scripts, or API keys are required.

**Play:** select **Tactical Deployment** or **Training Facility**, then deploy. Open **Field Manual** for controls and economy rules. Headphones recommended.

## Run

```sh
npm ci
npm run dev
```

Vite listens on `0.0.0.0:5173`, including proxied preview hosts.

```sh
npm test           # data, persistence, ballistics, navigation and all 20 models
npm run build     # production output in dist/
npm run preview   # serve the production build
```

Node.js 22 or newer is recommended. The lockfile pins all dependencies. `dist/`, test screenshots, browser binaries and dependencies are not committed.

## What is implemented

- **Live 3D operations menu** behind a touch-safe interface; the boot screen waits for `scene.executeWhenReady()`.
- **Two procedural maps:** a five-lane ballistics range with moving/resetting scoring targets and passive operators, and a connected three-sector industrial CQB facility with physical cover, pillars, pipes, storage containers, crates, drains and puddles.
- **20 playable weapon platforms / six categories.** Parametric construction includes chamfered receivers, M-LOK slots, Picatinny rails, bolts, trigger guards, magazine ribs, stocks, sights, suppressors and gloved hands. Components are merged by material to reduce draw calls.
- **Six attachments:** holographic sight, 2× optic, suppressor, compensator, laser and tactical light. Sights change ADS; muzzle devices affect sound/flash or recoil; laser improves hip-fire and projects a dot; the light has a working toggle. Conflicting optics/muzzle attachments are mutually exclusive. Removed purchased attachments are refunded.
- **Ballistics:** hitscan with independent free-aim direction, rate of fire, range falloff, head/body damage, shotgun pellets, magazine/reserve accounting, recoil, reloading, brass with floor bounces, impact marks, tracers and muzzle illumination. Grenades have a fuse, gravity, bounces and cover-aware damage.
- **Tactical AI:** patrol, ray-tested line of sight, awareness, last-known-position search, A* routes, lateral flanking destinations, cover seeking under fire, animated locomotion, return fire and persistent corpses until the next wave.
- **Economy and progression:** $150 kills, +$100 headshots, escalating wave rewards and a 60% accuracy bonus. Cash, purchases, loadout, attachments, best wave and settings are saved locally. Training makes every platform and attachment free without granting permanent unlocks or money.
- **Bodycam rendering:** Babylon `DefaultRenderingPipeline`, ACES exposure/contrast, bloom, FXAA and custom radial lens distortion, edge chromatic separation, animated grain, desaturation and vignette. Exposure adapts to nearby illumination. Procedural PBR albedo, normal and roughness textures and a locally generated environment cube provide all surface appearance.
- **Dynamic light and shadows:** moving weapon-mounted spotlight, shadow caster list, scalable 512/1024/2048 shadow maps and disabled shadow work when the light is off. Nearby industrial lights are selected for a bounded lighting budget.
- **Camera/weapon motion:** free-aim deadzone, separate weapon lag, recoil, ADS, crouch height, sprint bob, strafe roll, lean with wall clearance, injury vignette and cracked visor.
- **Procedural Web Audio:** layered gunshot punch/noise/mechanics, generated convolution reverb, suppressed profiles, indoor/outdoor acoustic capability, multi-stage reloads, individual shotgun-shell foley, footsteps, brass, hits, grenades and spatial enemy fire. Audio starts only after a user gesture.
- **Real multi-touch input:** independent pointer-ID tracking/capture for movement, looking and fire. ADS, reload, crouch, both leans, flashlight, grenade, swap and armory are available on the touch HUD. Input is cleared on cancellation, focus loss or pause. All UI button activation uses `pointerdown`, not click-cancel-sensitive Babylon GUI handlers.
- **Live settings:** Saver/Balanced/Ultra render resolution, dynamic shadows, post-processing, FOV, touch sensitivity and audio volume.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows | Left joystick |
| Look | Mouse (pointer lock) | Drag open screen area |
| Fire | Left mouse | Either fire button; right fire also supports drag-to-aim |
| Aim down sights | Hold right mouse | Tap ADS to toggle |
| Sprint | Left Shift | Full joystick movement (walk) |
| Reload | R | Reload button |
| Crouch | C / left Ctrl | Crouch toggle |
| Lean | Q / E | Hold left/right lean |
| Flashlight | F | Light button |
| Grenade | G | Grenade button |
| Swap sidearm / primary | X / 1 | Swap button |
| Armory | Tab | Armory button |
| Pause | Escape | Pause button |

Magnified ADS uses a clear live-world aperture with a center-aligned reticle: the AWP has a native 4× optic, DMRs use 2×, and an installed 2× optic overrides native magnification. The first-person exterior model is hidden only during scoped ADS so its capped geometry cannot block the view. Releasing ADS, reloading, pausing or swapping restores the normal weapon view.

Both touch fire buttons support independent pointer ownership. You can keep one held while releasing the other; the left button is fire-only so thumb drift does not move your aim.

The initial loadout is an M4A1, a G19 sidearm and $1,200. Training has unlimited reserve ammo and free platforms. Clear deployment waves to restore some health, ammunition and a grenade. Death retains earned money. Leaving an active deployment is an extraction to the operations menu, not a separate extraction-objective mode.

## GitHub Pages

`vite.config.js` sets **`base: './'`**. All code, fonts, shaders and favicon assets are bundled using relative paths. The production app has been browser-tested beneath **`/Rounds/`**, not just at the domain root.

The included `.github/workflows/deploy.yml` builds, unit-tests and publishes `dist/` using official Pages actions. It triggers on pushes to `main` or this session's `arena/1a3e9b05-rounds` branch, and manually via `workflow_dispatch`.

1. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
2. Push the changes or run the deployment workflow.
3. Use the Pages URL reported by the deployment job.

The repository must have Pages enabled and permit the workflow's `pages: write` and `id-token: write` permissions. This implementation supplies the workflow; it does not silently change repository settings or claim that a remote deployment has already occurred.

## Browser verification

With the development server running:

```sh
npm run test:browser   # desktop menu, range, armory, movement, grenade, pause/settings
npm run test:touch     # real three-pointer CDP input, free loadout, deployment, orientations
npm run test:render    # default shadows/post, live quality changes, error checks
npm run test:optics    # scoped ADS, dual-fire multi-touch, reload/swap and responsive layouts
```

To reproduce the GitHub Pages subdirectory check, build first, then in a separate terminal:

```sh
npm run serve:production-test
# Another terminal:
TEST_URL=http://localhost:4173/Rounds/ npm run test:touch
TEST_URL=http://localhost:4173/Rounds/ npm run test:render
```

Tests write screenshots to ignored `test-results/`. On Linux the test helper extracts the npm-distributed headless Chromium and its NSS libraries; there are no separate browser downloads. On macOS/Windows, install Playwright Chromium with `npx playwright install chromium` before browser tests. `window.blackline.snapshot()` exposes read-only simulation diagnostics for testing.

**Verification performed:** unit tests pass; production build passes without warnings; Chromium tests report no application console errors, page errors or HTTP 404s, including under `/Rounds/`. Simultaneous joystick, look and fire were asserted using three real touch IDs. Saver/off-post is used for most software-rendered input tests; a separate test starts with the actual Balanced/shadows/post defaults and changes render settings live.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/game.js` | Session/state transitions, frame loop, combat, physical effects, camera |
| `src/world.js` | Maps, cover, colliders, navigation lattice, range targets |
| `src/actors.js` | Procedural operators, perception, combat director and waves |
| `src/weapons.js` / `geometry.js` | Material-batched procedural firearm geometry and chamfers |
| `src/materials.js` / `renderer.js` | PBR texture generation, environment lighting, optical pipeline |
| `src/input.js` | Pointer ownership, touch joystick, keyboard and pointer lock |
| `src/audio.js` | Audio graph, synthesis, spatialization and foley |
| `src/data.js` / `store.js` | Weapon specifications, economy and validated local persistence |
| `src/ui.js` / `style.css` | Operations UI, armory, settings and responsive combat HUD |

## Scope and limitations

This is a complete **procedural browser-game implementation**, not a claim of scanned-asset/AAA visual parity with Bodycam. Environment and character art are generated geometry, not photogrammetry. It is single-player, with no multiplayer, cloud saves, bespoke animation clips or destructible environment. Enemies use lattice navigation and state-based tactics rather than a full navmesh behavior-tree stack. Damage is hitscan; casings and grenades use lightweight kinematics.

Browser tests used software WebGL and are correctness checks, **not physical-phone FPS measurements**. Start on Balanced, use Saver or disable shadows/post on older devices, and prefer landscape on phones. High-DPI render resolution is capped and the Ultra shadow map is deliberately heavier. Sound timbre remains synthesized, not recorded firearm audio. Saves are per-browser/per-origin and can be lost when browser storage is cleared.

BLACKLINE is original and unaffiliated with Reissad Studio or Bodycam. Dependencies retain their respective licenses; the locally bundled Barlow Condensed font is distributed under the SIL Open Font License.
