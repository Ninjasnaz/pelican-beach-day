# Pelican Beach Day: Design

## Intent

A fun, shareable three.js website: a cartoon pelican rides a bike around a long, wavy track on a beach boardwalk, inside a lively beach scene visitors can fly around. It exists for the owner's enjoyment and to show friends. It will not grow into a bigger product.

Visual reference: `docs/reference.png` (every builder reads it; the pelican and bike are reviewed against it). It shows a flat-shaded, bright illustration of a white pelican with a blue cap and red polka-dot bandana, riding a teal bicycle with a wicker front basket (a small blue fish wearing headphones sits in the basket), a headlight, a late-afternoon sun, pastel sky, ocean with a sailboat, and a wooden boardwalk.

## Goals

- The pelican rides a bike continuously around a closed track. Knees bend naturally while pedaling (proper leg IK tied to crank rotation, not floating legs).
- The track is a long, irregular loop, roughly two city blocks in length (~400 m perimeter scale in world units, 1 unit = 1 m). It has bends, twists, small peaks and small valleys (gentle elevation changes, a few meters at most).
- Beach scene: ocean far from the opening view; boardwalk and sand in the middle; a grassy park (trees, shrubs, grass) nearest the opening camera.
- Beachgoers of all ages, genders, and ethnicities (skin tones, hair, body shapes, outfit colors vary).
- Vendor carts with striped umbrellas.
- 8 building types: bathroom, clubhouse, ice cream store, lifeguard tower, surf rental shack, snack bar with patio, bike rental, small pier with bait shop.
- Controls: WASD moves the camera (W/S forward/back, A/D strafe), mouse drag rotates, scroll zooms. Visitors can follow the pelican.
- Hosted free on the owner's Vercel Hobby plan from a private GitHub repo.

## Non-goals

- No detailed or realistic characters; stylized low-poly figures built from primitives are expected.
- No downloaded 3D models or texture packs. Everything is built in code from three.js geometry and materials.
- No accounts, backend, sound requirement, or multi-page site.
- No touch controls. Phones and tablets (touch-primary devices, detected via `(pointer: coarse)` with no fine pointer) load straight into follow mode and stay there: the camera follows the pelican automatically, the controls hint card and Follow button are hidden. Desktop gets the full controls described below.

## Anti-goals (failure even if it "works")

- Legs that clip through the bike, float off the pedals, or bend backwards.
- A track that is a perfect oval or perfectly flat.
- The opening view feeling empty or the ocean being right in front of the camera.
- A crowd that all moves in sync or looks like copies of one person.
- Choppy frame rate on a normal laptop.

## Constraints

- three.js via npm, Vite build, plain JavaScript (ES modules).
- Static site; Vercel auto-detects Vite (`npm run build` -> `dist/`).
- Private GitHub repo named `pelican-beach-day` on the owner's account (`Ninjasnaz`), with a short README describing the site.
- Performance: target 60 fps on a mid-range laptop. Use instancing or merged geometry for repeated items (grass tufts, trees, crowd parts where practical), limit shadow-casting lights to one directional sun.

## Approaches considered

| Approach | Trade-off | Decision |
|---|---|---|
| A. Vite + three.js, one module per scene part | Clean structure, parallel work, optimized build. Needs a build step (Vercel handles it). | **Picked by owner.** |
| B. Single HTML + CDN three.js, no build | Simplest to hand-edit; gets messy as the scene grows; no optimization. | Rejected |
| C. React Three Fiber | Good for a bigger React app; extra weight not needed here. | Rejected (owner confirmed it won't grow) |

## Decided details

### Look and feel
- Flat/toon shading in the style of the reference image: bright saturated colors, soft gradient sky, low-poly shapes.
- Late-afternoon lighting: large soft sun low in the sky, pastel sky gradient (warm peach near the horizon to light blue above), gentle animated ocean surface, one or two drifting sailboats.

### Layout (opening view to horizon)
1. Park (nearest the camera at load): grass, trees, shrubs.
2. Track: a pale wooden boardwalk path that runs along the beach side and loops back through the park side, so the pelican passes close to the opening shot.
3. Sand and beach with people, umbrellas, vendors, buildings.
4. Ocean, farthest from the opening camera.

### Pelican and bike
- Pelican matching the reference: white body, large orange-pink beak and pouch, blue cap, red polka-dot bandana, orange legs.
- Teal bicycle with wicker front basket, headlight, chain, and a small blue fish with headphones in the basket.
- Rides continuously along the track spline, oriented to its tangent, leaning slightly into turns, following elevation.
- Pedaling: crank rotation speed tied to travel speed; two-bone leg IK so hips, knees, and feet stay on the pedals with natural knee bend. Wings hold the handlebars.

### Camera and controls
- Landing state: free roam ("the beach is the star"), camera in the park at roughly human eye height looking toward the boardwalk and ocean.
- Free roam is a flying camera (owner's call): W/S move forward/back along the look direction, so looking down and pressing S pulls up and out for a bird's-eye view; A/D strafe; Q/E go straight up/down (builder's call); mouse drag rotates view; scroll wheel zooms. Camera never dips below terrain or water and stays inside a world boundary. Holding Shift moves faster (builder's call).
- Follow mode: press F or click a "Follow the pelican" button; camera eases in behind the pelican and tracks him; mouse can still orbit around him. F or Esc returns to free roam from the current position.
- Small collapsible on-screen hint card listing the controls.

### Crowd
- Stylized figures built from reusable body parts, randomized: kids, adults, seniors; varied skin tones, hair styles, body shapes, outfit colors.
- Idle animation only, no free roaming: a few steps back and forth with pauses, looking up and back toward the beach, waving, sitting and shifting. Each person has a random time offset so nobody moves in sync.
- Some sunbathing on towels under umbrellas, some standing, some in line at vendors.

### Vendors
- 4 to 5 carts with striped umbrellas: ice cream, hot dogs, lemonade, cotton candy, tacos.
- Vendors sway and occasionally lean on their cart.

### Buildings (8 types)
Bathroom, clubhouse, ice cream store, lifeguard tower, surf rental shack, snack bar with patio, bike rental, small pier with bait shop. Each recognizable at a glance through shape and simple signage/colors.

### Hosting and workflow
- Vercel project linked to the GitHub repo via Git integration; every push to `main` deploys.
- Deployment is in scope: the builder creates the repo, pushes, links Vercel, and verifies the live URL. Check GitHub and Vercel access first; if repo creation is blocked, hand the owner exact steps.
- Verification bar (builder's call, since headless Chromium uses software WebGL and can't measure real fps): no console errors, screenshots of the opening view and follow mode, draw calls under ~300 and triangles under ~500k per frame.
- Build order: lead builds the foundation (scene, lighting, terrain, track, camera controls, pelican and bike). Then three Sonnet agents build in parallel, each in its own module: buildings, people, vendors/props. Lead integrates and verifies in headless Chromium (screenshots, no console errors, acceptable frame time) before deploying.

## Left to the builder

- Exact track shape and coordinates, within the constraints above.
- Exact placement of buildings, vendors, and people.
- Colors and proportions beyond what the reference image dictates.
- Code structure inside each module, and the shared interface between modules (e.g., each module exports a `create*(scene, ctx)` function and an optional `update(dt, t)`).
- Movement speed, camera easing values, pelican riding speed.
