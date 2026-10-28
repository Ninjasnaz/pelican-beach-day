# Pelican Beach Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vite + three.js site where a cartoon pelican rides a bike around a wavy raised boardwalk loop in a lively beach scene, flyable on desktop and auto-following on touch devices, deployed to Vercel from a private GitHub repo.

**Architecture:** One ES module per scene part. `main.js` builds a shared `ctx` (scene, seeded rng, terrain height, track, footprint registry, updater list) and passes it to each `create*(ctx)` function; animated parts register `update(dt, t)` callbacks. Pure math (track, IK, camera movement, idle poses, layout) lives in small functions covered by Vitest; visuals are checked by a Playwright smoke script against the production build.

**Tech Stack:** three.js (npm), Vite, Vitest, Playwright (pre-installed Chromium), Vercel Git integration.

**Spec:** `docs/superpowers/specs/2026-10-28-pelican-beach-day-design.md`. Visual reference: `docs/reference.png`.

## Global Constraints

- 1 world unit = 1 meter. Y is up. Ocean lies toward **-Z** (far), park toward **+Z** (near the opening camera). Beach runs along **X**.
- No downloaded models or textures. All geometry from three.js primitives; materials `MeshToonMaterial` or `MeshLambertMaterial` with flat, saturated colors from `src/util/palette.js`.
- One shadow-casting light (the sun). Repeated items use `InstancedMesh` or merged geometry.
- All randomness through `ctx.rng` (seeded mulberry32, seed `20261028`) so the scene is identical on every load.
- Frame budget, measured in the smoke test: `renderer.info.render.calls < 300`, `renderer.info.render.triangles < 500000`, zero console errors.
- Touch-primary device = `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches` → follow mode only, no HUD controls.
- Plain JavaScript, ES modules. No TypeScript, no React.
- Repo: private `Ninjasnaz/pelican-beach-day`. Vercel Hobby project `pelican-beach-day`, framework preset Vite, deploys on push to `main`.

## Review Focus

1. **Window resize / device rotation:** canvas and camera aspect update with no stretching. Pinned in Task 1 smoke test (resize viewport, assert canvas size matches).
2. **Tab hidden then shown:** a huge `dt` after returning must not teleport the pelican or launch the camera through the ground. Pinned in Task 4/5 tests (`dt` clamped to 0.1 s).
3. **Flying into the ground, water, or off the map:** camera clamps hold at any speed including Shift boost. Pinned in Task 5 tests.
4. **Objects spawned on the track or inside each other:** footprints reject overlaps and track proximity. Pinned in Task 2 tests.
5. **Key held while window loses focus:** movement keys stop on `blur` so the camera doesn't drift forever. Pinned in Task 5 test.

---

## File Structure

```
index.html                 canvas host, HUD markup
vite.config.js
package.json               scripts: dev, build, preview, test, smoke
README.md                  short description of the site
e2e/smoke.mjs              Playwright smoke test against `vite preview`
src/main.js                renderer, ctx, render loop, window.__pelican debug handle
src/util/rng.js            mulberry32(seed) -> () => number in [0,1)
src/util/palette.js        named colors (pelican white, beak orange, teal bike, etc.)
src/util/layout.js         footprint registry, zone(x,z)
src/world/terrain.js       heightAt(x,z), ground mesh (grass/sand coloring)
src/world/sky.js           gradient sky dome, sun disc, fog
src/world/lights.js        hemisphere + shadow-casting sun
src/world/ocean.js         animated water plane, sailboats
src/world/park.js          instanced trees, shrubs, grass tufts
src/track/trackPath.js     pure: createTrack() -> closed CatmullRom curve + helpers
src/track/boardwalk.js     plank deck mesh + support posts + rails
src/pelican/ik.js          pure: solveTwoBone()
src/pelican/bike.js        createBike() -> { group, crankPivot, pedalL, pedalR, frontWheel, rearWheel, handlebar, seat }
src/pelican/pelican.js     createPelican() -> { group, legs, wings, head }
src/pelican/rider.js       createRider(ctx) -> moves bike+pelican along track, pedals, IK
src/camera/device.js       isTouchPrimary(matchMedia)
src/camera/flyControls.js  pure stepFly(), clampCamera(); DOM input binding
src/camera/followCam.js    follow offset + orbit
src/camera/cameraManager.js mode switching (free/follow), F/Esc, easing
src/ui/hud.js              collapsible controls card + Follow button
src/buildings/index.js     createBuildings(ctx) + 8 builder files in src/buildings/
src/people/person.js       createPerson(rng, opts) -> { group, parts }
src/people/idle.js         pure: createIdle(rng, kind), idlePose(idle, t)
src/people/crowd.js        createCrowd(ctx)
src/vendors/index.js       createVendors(ctx): carts, umbrellas, vendors
src/props/index.js         createProps(ctx): beach umbrellas, towels, lifeguard flags
tests/*.test.js            Vitest unit tests
```

## Shared `ctx` interface (defined in Task 1–2, used by every later task)

```js
ctx = {
  scene,                 // THREE.Scene
  rng,                   // () => number, seeded
  heightAt(x, z),        // terrain height in meters
  zone(x, z),            // 'park' | 'sand' | 'water'
  track,                 // from createTrack(): { curve, length, pointAt(u), tangentAt(u), distanceTo(x,z) }
  reserve(x, z, radius), // true and records it if free (no overlap, >= 3 m from track centerline + half width); false otherwise
  addUpdater(fn),        // fn(dt, t) called each frame, dt clamped to <= 0.1
}
```

World layout constants (in `layout.js`): water starts at `z < -60`; sand `-60 <= z < 10`; park `z >= 10`. Playable bounds `|x| <= 250`, `|z| <= 250`. Opening camera at `(0, 1.7 + heightAt, 75)` looking toward `(0, 2, -20)`.

---

### Task 1: Scaffold, repo, and first deploy

Surfaces GitHub/Vercel access problems before any real work.

**Files:** Create `package.json`, `vite.config.js`, `index.html`, `README.md`, `.gitignore`, `src/main.js`, `src/util/rng.js`, `src/util/palette.js`, `tests/rng.test.js`, `e2e/smoke.mjs`

**Interfaces:**
- Produces: `mulberry32(seed: number) -> () => number`; `main.js` exposes `window.__pelican = { ready: boolean, renderer, mode, rider }`; `ctx.addUpdater`.

- [ ] **Step 1:** Check access. Run `gh api user --jq .login` and `gh repo list Ninjasnaz --limit 1`; via Vercel MCP `list_teams`. If repo creation fails, stop and give the owner the exact steps (create empty private repo on github.com, install Vercel GitHub app for it).
- [ ] **Step 2:** `npm create vite@latest` equivalent by hand: `npm i three`, `npm i -D vite vitest`. Scripts: `dev`, `build`, `preview`, `test: vitest run`, `smoke: node e2e/smoke.mjs`.
- [ ] **Step 3: Failing test** `tests/rng.test.js`: `mulberry32(1)` called twice with the same seed yields identical first 5 values; all values in `[0,1)`; seeds 1 and 2 differ.
- [ ] **Step 4:** Implement `src/util/rng.js`; `npm test` → PASS.
- [ ] **Step 5:** `main.js`: `WebGLRenderer` (antialias, `setPixelRatio(min(devicePixelRatio, 2))`, shadows on), perspective camera (fov 55, near 0.1, far 1500), resize handler, render loop with `dt = min(clock.getDelta(), 0.1)`, placeholder ground plane, sets `window.__pelican.ready = true` after first frame.
- [ ] **Step 6:** `e2e/smoke.mjs`: runs `vite preview --port 4173`, opens Chromium at 1280×800, waits for `__pelican.ready`, fails on any `console.error` / `pageerror`, resizes to 800×600 and asserts canvas `clientWidth === 800`, logs `renderer.info.render` and asserts budgets, saves `e2e/out/desktop.png`. `npm run build && npm run smoke` → PASS.
- [ ] **Step 7:** README (5–8 lines: what the site is, controls, `npm run dev`). `git init`, commit, `gh repo create Ninjasnaz/pelican-beach-day --private --source . --push`.
- [ ] **Step 8:** Vercel MCP `create_project` (or `create_git_project`) linked to the repo, preset Vite. Confirm a deployment reaches READY and the URL loads. Commit nothing new.

### Task 2: Track path and layout (pure logic)

**Files:** Create `src/track/trackPath.js`, `src/util/layout.js`, `tests/track.test.js`, `tests/layout.test.js`

**Interfaces:**
- Produces: `createTrack() -> { curve: THREE.CatmullRomCurve3 (closed, 'centripetal'), length: number, width: 3.2, pointAt(u), tangentAt(u), distanceTo(x, z) }`; `createLayout(track) -> { zone(x,z), reserve(x,z,r) }`; constants `WATER_Z = -60`, `PARK_Z = 10`, `BOUNDS = 250`.

- [ ] **Step 1: Failing tests** `tests/track.test.js`:
  - `pointAt(0)` within 0.01 m of `pointAt(1)` (closed).
  - `380 <= length <= 480`.
  - Sampled y (200 samples): `min >= 0.3`, `max >= 2.0`, `max <= 4.0` (raised boardwalk with peaks and valleys).
  - Max grade between consecutive samples `< 0.12`.
  - Not convex: horizontal curvature (cross product y of consecutive tangents) changes sign at least 4 times (proves bends that an oval lacks).
  - Min turning radius `>= 8` m.
  - Track has samples with `z <= -15` (beach side) and `z >= 30` (park side).
- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3:** Implement `createTrack()` from ~14 hand-placed control points: beach leg near `z ≈ -20`, park leg near `z ≈ 35`, x spanning about `-110..110`, with two S-bends and y values between 0.4 and 3.0. `distanceTo` uses 400 cached samples.
- [ ] **Step 4:** `npm test` → PASS (tweak control points until it does).
- [ ] **Step 5: Failing tests** `tests/layout.test.js`: `zone(0,-80)==='water'`, `zone(0,0)==='sand'`, `zone(0,50)==='park'`; `reserve` on a free spot returns true, a second overlapping call returns false; `reserve` at a point on the track centerline returns false; `reserve` outside `BOUNDS` returns false.
- [ ] **Step 6:** Implement `createLayout`; `npm test` → PASS. Commit `feat: track path and layout`.

### Task 3: World (terrain, sky, lights, ocean, park, boardwalk)

**Files:** Create `src/world/terrain.js`, `sky.js`, `lights.js`, `ocean.js`, `park.js`, `src/track/boardwalk.js`, `tests/terrain.test.js`; Modify `src/main.js`

**Interfaces:**
- Consumes: `ctx` (Task 1–2).
- Produces: `heightAt(x, z) -> number`; `createTerrain(ctx)`, `createSky(ctx)`, `createLights(ctx) -> { sun }`, `createOcean(ctx)`, `createPark(ctx)`, `createBoardwalk(ctx)`; `WATER_LEVEL = 0`.

- [ ] **Step 1: Failing test** `tests/terrain.test.js`: `heightAt` stays within `[-0.5, 1.2]` over the bounds grid; slopes gently below water (`heightAt(0, -70) < WATER_LEVEL`); park is above water (`heightAt(0, 50) > 0.2`).
- [ ] **Step 2:** Implement `heightAt` (smooth ramp down toward the water plus low-amplitude sine dunes); `npm test` → PASS.
- [ ] **Step 3:** Visual modules: ground mesh with vertex colors (grass green in park, sand tan, wet sand near water); gradient sky dome + large soft sun low over the ocean (peach horizon, light blue zenith, matches `docs/reference.png`); hemisphere + directional sun with one 2048 shadow map covering the track area; ocean plane with vertex-shader waves animated via updater, plus 2 drifting sailboats; park with instanced trees (≥ 40, 2–3 shapes), shrubs, grass tufts, each placed via `ctx.reserve`; boardwalk deck following `track.curve` (plank stripes via vertex colors), posts down to `heightAt`, low rails.
- [ ] **Step 4:** `npm run build && npm run smoke` → PASS; view `e2e/out/desktop.png` and confirm park in the foreground, boardwalk across the middle, ocean far. Commit `feat: world scene`.

### Task 4: Pelican, bike, IK, rider

**Files:** Create `src/pelican/ik.js`, `bike.js`, `pelican.js`, `rider.js`, `tests/ik.test.js`, `tests/rider.test.js`; Modify `src/main.js`

**Interfaces:**
- Consumes: `ctx.track`, `ctx.addUpdater`.
- Produces: `solveTwoBone(hip: Vector3, target: Vector3, l1: number, l2: number, bendHint: Vector3) -> { knee: Vector3, foot: Vector3 }`; `createRider(ctx) -> { group, u: number, speed: number, getPosition(): Vector3, getForward(): Vector3, step(dt) }`. Rider speed 5 m/s; crank turns `speed / wheelCircumference * gearRatio(2.2) * 2π` rad/s.

- [ ] **Step 1: Failing tests** `tests/ik.test.js`:
  - Reachable target: `|knee - hip| ≈ l1`, `|knee - foot| ≈ l2` (1e-4), `foot ≈ target`.
  - Knee lies on the `bendHint` side of the hip→target line (dot product > 0).
  - Unreachable target (distance > l1 + l2): no NaN, leg fully straight toward target, `foot` at distance `l1 + l2` from hip.
  - Target at the hip: no NaN.
- [ ] **Step 2:** Implement `solveTwoBone` (law of cosines); `npm test` → PASS.
- [ ] **Step 3: Failing tests** `tests/rider.test.js` (uses `createTrack()` and a stub ctx): after `step(1)`, `u` advanced by `5 / length` (±1%); `step(10)` with dt clamping inside rider limited to advancing ≤ `0.1 * 5` m per call; `u` wraps to stay in `[0,1)`.
- [ ] **Step 4:** Implement bike (teal frame, wicker basket, headlight, chain, wheels spinning with travel), pelican (white body, orange-pink beak and pouch, blue cap, red polka-dot bandana, orange legs, wings gripping handlebars, blue fish with headphones in the basket), rider (position on curve, yaw from tangent, pitch from grade, roll into turns proportional to curvature, max 12°; each frame rotate crank, solve both legs to pedal positions with bendHint = bike forward + up). Match `docs/reference.png`.
- [ ] **Step 5:** `npm test` → PASS. Add to smoke: a close-up screenshot `e2e/out/pelican.png` with the camera placed 4 m beside the rider. Inspect against the reference: knees bend forward, feet stay on pedals, nothing clips the frame. Commit `feat: pelican rides bike`.

### Task 5: Camera, controls, device mode, HUD

**Files:** Create `src/camera/device.js`, `flyControls.js`, `followCam.js`, `cameraManager.js`, `src/ui/hud.js`, `tests/device.test.js`, `tests/fly.test.js`; Modify `index.html`, `src/main.js`, `e2e/smoke.mjs`

**Interfaces:**
- Consumes: `createRider` API (Task 4), `heightAt`, `WATER_LEVEL`, `BOUNDS`.
- Produces: `isTouchPrimary(matchMedia) -> boolean`; `stepFly(state: {pos, yaw, pitch}, input: {forward, right, up, boost}, dt) -> state`; `clampCamera(pos, heightAt) -> pos`; `createCameraManager(ctx, camera, rider, { touch }) -> { mode: 'free'|'follow', setMode(m) }`. Speeds: base 12 m/s, Shift ×3. Clamps: `y >= max(heightAt, WATER_LEVEL) + 1.5`, `y <= 150`, `|x|,|z| <= BOUNDS`. Pitch limited to ±85°.

- [ ] **Step 1: Failing tests** `tests/device.test.js`: coarse-only → true; coarse + any-fine (touch laptop) → false; fine only → false.
- [ ] **Step 2: Failing tests** `tests/fly.test.js`:
  - yaw 0, pitch 0, forward=1, dt 1 → moves 12 m along -Z.
  - pitch -45° (looking down), forward=-1 (S) → y increases (zooming out feels like flying up and back).
  - boost → 36 m.
  - up=1 (E), any pitch → y rises 12 m, x/z unchanged; up=-1 (Q) lowers.
  - dt 5 → treated as 0.1 (no teleport).
  - Clamp: starting at y=0.2 over sand → y becomes `heightAt + 1.5`; over water → `WATER_LEVEL + 1.5`; x=400 → 250; y=500 → 150.
  - Input binding: after keydown W then window `blur`, input.forward === 0 (test the exported `createInputState()` with a fake event target).
- [ ] **Step 3:** Implement; `npm test` → PASS.
- [ ] **Step 4:** Manager: desktop starts `free` at the opening camera; mouse drag (pointer lock not used, plain drag) rotates; wheel moves along look direction; F toggles follow; Esc returns to free from the current position; transitions ease over 0.8 s. Follow: camera 7 m behind, 3 m above rider, smoothed; mouse drag orbits around the rider. Touch: `follow` from load, F/Esc ignored, HUD hidden.
- [ ] **Step 5:** HUD: small collapsible card (bottom-left) listing W/S, A/D, Q/E, Shift, drag, scroll, F, Esc; a "Follow the pelican" button toggling to "Free roam". Title "Pelican Beach Day" top-left.
- [ ] **Step 6:** Smoke additions: press F, wait 1.5 s, assert `__pelican.mode === 'follow'`, screenshot `follow.png`; new context with `isMobile: true, hasTouch: true` (iPhone viewport) asserts `mode === 'follow'` and HUD card hidden, screenshot `mobile.png`. `npm run build && npm run smoke` → PASS. Commit `feat: fly and follow camera`. Push (deploys).

---

**Parallel phase.** Tasks 6, 7, 8 only touch their own folders plus one `create*(ctx)` line in `main.js` (lead adds those lines in Task 9). Each runs as its own Sonnet agent with this plan, the spec, and `docs/reference.png`. Each places every object with `ctx.reserve` and builds a debug screenshot via the smoke script.

### Task 6: Buildings (8 types)

**Files:** Create `src/buildings/index.js`, `bathroom.js`, `clubhouse.js`, `iceCream.js`, `lifeguardTower.js`, `surfShack.js`, `snackBar.js`, `bikeRental.js`, `pier.js`, `tests/buildings.test.js`

**Interfaces:**
- Produces: each file `export function build<Name>(palette) -> THREE.Group` (origin at ground center, front facing +Z unless noted); `createBuildings(ctx) -> THREE.Group[]` places all 8.

- [ ] **Step 1: Failing test:** `createBuildings` with a stub ctx (real `createTrack`, `createLayout`, flat `heightAt`) returns 8 groups, each with a distinct `userData.type` from the list, every group's footprint accepted by `reserve`, the pier's far end at `z < WATER_Z`, the lifeguard tower in the sand zone, the clubhouse and bathroom in park or sand.
- [ ] **Step 2:** Implement builders. Each recognizable at a glance: signage via colored panels and simple shapes (ice cream cone on the roof, surfboards leaning on the shack, bikes racked outside rental, red cross + raised hut on the lifeguard tower, restroom figures on bathroom, patio tables + umbrellas at snack bar, wide porch + flag on clubhouse, bait shop hut at pier end).
- [ ] **Step 3:** `npm test` → PASS; total triangles for all buildings `< 60000` (assert in test by summing geometry). Commit `feat: buildings`.

### Task 7: Crowd

**Files:** Create `src/people/person.js`, `idle.js`, `crowd.js`, `tests/idle.test.js`, `tests/crowd.test.js`

**Interfaces:**
- Produces: `createPerson(rng, { age: 'kid'|'adult'|'senior', pose: 'stand'|'sit'|'lie' }) -> { group, parts: { torso, head, armL, armR, legL, legR } }`; `createIdle(rng, kind: 'pacer'|'looker'|'waver'|'sitter') -> idle`; `idlePose(idle, t) -> { offsetX, yaw, headPitch, armRaise }`; `createCrowd(ctx, count = 60)`.

- [ ] **Step 1: Failing tests** `tests/idle.test.js`: `idlePose` deterministic for same idle and t; pacer `|offsetX| <= 1.5` over 60 s and has stretches of ≥ 1 s with zero velocity (pauses); looker `headPitch` reaches ≥ 25° up at some point then returns to ~0; 20 idles from one rng have pairwise distinct phase offsets.
- [ ] **Step 2: Failing tests** `tests/crowd.test.js`: `createCrowd(ctx, 60)` returns 60 people; ages include all 3; at least 6 distinct skin tones and 6 outfit colors used; nobody placed in water or on the track (via `ctx.zone`, `ctx.track.distanceTo`).
- [ ] **Step 3:** Implement. Skin tone palette of ≥ 8 tones from very light to very dark; varied hair (short, long, bun, bald, curly via sphere clusters), hats, body widths/heights; kids ~0.6 scale, seniors slightly stooped. Mix: sunbathers on towels, standing groups, people in vendor lines (positions provided as a fallback list if vendors aren't placed yet), park strollers. Share geometries across people; per-person colors via materials cached by color.
- [ ] **Step 4:** `npm test` → PASS. Commit `feat: crowd`.

### Task 8: Vendors and beach props

**Files:** Create `src/vendors/index.js`, `src/vendors/cart.js`, `src/props/index.js`, `tests/vendors.test.js`

**Interfaces:**
- Consumes: `createPerson`, `createIdle` from Task 7 (if Task 7 isn't merged yet, import paths are fixed; use a local placeholder capsule and swap in Task 9).
- Produces: `createCart(type: 'iceCream'|'hotDog'|'lemonade'|'cottonCandy'|'taco', palette) -> THREE.Group`; `createVendors(ctx) -> { carts: Group[], queueSpots: Vector3[] }`; `createProps(ctx)` (beach umbrellas, towels, coolers, sandcastles, lifeguard flags).

- [ ] **Step 1: Failing test:** `createVendors` returns 5 carts with the 5 distinct types, each with a striped umbrella child (`userData.umbrella`), all within 12 m of the track (boardwalk-side vendors), none overlapping; `queueSpots.length >= 5`.
- [ ] **Step 2:** Implement carts (wheels, counter, product hint on top) with striped umbrellas (alternating color wedges); vendors sway and occasionally lean on the cart via updater; ≥ 15 beach umbrellas with towels beneath, instanced where possible.
- [ ] **Step 3:** `npm test` → PASS. Commit `feat: vendors and props`.

### Task 9: Integration, budgets, final deploy

**Files:** Modify `src/main.js`, `src/people/crowd.js` (vendor queue spots), `e2e/smoke.mjs`, `README.md`

- [ ] **Step 1:** Wire `createBuildings`, `createVendors`, `createProps`, `createCrowd` (crowd receives `queueSpots`) into `main.js` in that order so larger footprints reserve first.
- [ ] **Step 2:** `npm test && npm run build && npm run smoke` → PASS including `calls < 300` and `triangles < 500000`. If over budget: merge static meshes per module with `BufferGeometryUtils.mergeGeometries`, lower shadow casters.
- [ ] **Step 3:** Review `desktop.png`, `follow.png`, `mobile.png`, `pelican.png` against the spec's anti-goals (legs, oval, empty opening view, synced crowd). Fix what fails.
- [ ] **Step 4:** Commit, push to `main`, confirm Vercel deployment READY, run smoke against the live URL (`SMOKE_URL=<url> npm run smoke`). Report the URL to the owner.
