# Mini Golf Mania ⛳ (`v2.0.0`)

![Mini Golf Mania Logo](https://github.com/LCmaster/minigolf/assets/930046/74666a39-84b5-4d60-8120-79c0f4ee9211)

**Version:** `v2.0.0` · **Play online:** [minigolfmania.vercel.app](https://minigolfmania.vercel.app/)

Mini Golf Mania is a 3D web-based mini golf game and modular course builder built with SvelteKit, Three.js, and Rapier physics. Tee off across the 9-hole Carnival Park Showcase, build custom courses with modular socket-snapping and spline tracks, and share creations via Firebase Cloud Saves.

---

## ✨ Features

- **Custom 3D Physics & Rendering Engine**: Headless-testable Three.js + Rapier (`@dimforge/rapier3d-compat`) simulation featuring seamless welded track floors (`SeamWelder`), modular GLB kitbashing (`AssetLoader`), a sunlit procedural park backdrop (`ParkBackdrop`), and a live 3D Home screen course flyover (`/`).
- **9-Hole *Carnival Park Showcase* Course**:
  1. *Sunny Creek & Midway Bend*
  2. *Big Top Windmill*
  3. *Carousel Split*
  4. *Sky-Hoop Leap*
  5. *Midway Pinball Alley*
  6. *Cliffside Switchback*
  7. *Candy Cove Crosswalk*
  8. *Funhouse Turbo Slalom*
  9. *Grand Big-Top Finale*
- **Dynamic Hazards & Game Feel**:
  - Spinning 4-blade kinematic windmill gates (`TileWindmill`) with physical bumper deflections.
  - Glowing animated turbo booster pads (`BoosterVisuals`) with impulse boost and chevron flashes.
  - Active pond & waterfall lagoon water hazards that play a splash SFX and automatically respawn the ball at its last safe position.
  - Progressive exponential slingshot power curve with high-power tremble (`SlingshotInput`) and 3D aerodynamic slipstream ribbons + wingtip streaks (`BallWindTrail`).
- **Modular Socket & Spline Level Editor (`/editor`)**:
  - Snap modular track pieces seamlessly with the radial socket menu (`RadialSocketMenu`), toggle side walls or open-air gaps, and swap tile types with automatic downstream re-chaining (`TileSwapPlanner`).
  - Place props and hazards from `PropPalette`, sculpt spline track paths, generate procedural holes via the WFC Wizard (`WfcWizardModal`), undo/redo edits, and playtest live in-browser.
- **Courses Hub, Tour Bundler & Cartoon Arcade UI (`/courses`, `/profile`, `/auth/signin`)**:
  - Browse Official, Community, and My Levels tabs (`/courses?tab=mine`), bundle multi-hole tours (`TourBundlerPanel`), and manage player profiles/cloud saves via Firebase in a cohesive Cartoon Arcade interface (`ArcadeFrame`, `ArcadeButton`, `ArcadeTitle`).
- **Sample-Backed Web Audio Overhaul**:
  - Built around `SoundBank`, `SynthEffects`, and `AudioManager` using 9 normalized [OpenGameArt.org](https://opengameart.org) SFX (see [`static/sounds/CREDITS.md`](static/sounds/CREDITS.md)) with procedural Web Audio fallbacks.
  - Ground-gated grassy turf rolling audio (`updateRolling` silenced mid-air), velocity-scaled debounced wall knocks, dedicated booster whooshes, slingshot power-tier ratchet ticks (25 / 50 / 75 / 100%), Par-or-better crowd applause, and persisted mute state across routes.

---

## 🛠️ Technology Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) & [Svelte 4](https://svelte.dev/)
- **3D Rendering**: [Three.js](https://threejs.org/) (`@threlte/core`, `@threlte/extras`)
- **Physics**: [Rapier 3D](https://rapier.rs/) (`@dimforge/rapier3d-compat`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Skeleton UI](https://www.skeleton.dev/)
- **Backend / Auth**: [Firebase](https://firebase.google.com/) (Auth & Firestore)
- **Testing & Tooling**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [pnpm](https://pnpm.io/) (`pnpm@11.28.4`), deployed on [Vercel](https://vercel.com/) (`@sveltejs/adapter-vercel`)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 20.x`
- [pnpm](https://pnpm.io/) (`11.28.4` pinned via `packageManager`)

### Installation & Local Development

1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/LCmaster/minigolf.git
   cd minigolf
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. *(Optional for Cloud Saves & Auth)* Copy `.env.example` to `.env` and fill in your `PUBLIC_FIREBASE_*` keys:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   pnpm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Scripts

- `pnpm run dev` — Start Vite / SvelteKit dev server
- `pnpm run build` — Build client & SSR bundles for Vercel
- `pnpm run preview` — Preview the production build locally
- `pnpm test` — Run all Vitest unit, physics, and integration suites
  - `pnpm run test:unit` (`src/`)
  - `pnpm run test:physics` (`tests/physics/`)
  - `pnpm run test:integration` (`tests/integration/`)
  - `pnpm run test:coverage` (`v8` coverage on `src/lib/engine/`)
- `pnpm run test:e2e` — Run Playwright end-to-end tests (`tests/e2e/`)
- `pnpm run lint` — Run ESLint

---

## 🎮 How to Play & Controls

1. **Select a Course**: Launch right into *Carnival Park Showcase* from the Home screen or open **Courses** (`/courses`) to choose an official, community, or custom level.
2. **Aim & Putt**: Click on the ball (or its pulsing ready indicator) and drag backward to set direction and power, then release to shoot. Soft ratchet ticks mark 25%, 50%, 75%, and 100% power thresholds, with aim tremble above 85%.
3. **Camera & HUD Controls**:
   - **Drag anywhere outside the ball** (or right/middle-drag) to orbit the camera.
   - **Spacebar** (or 🔭 button) toggles the Tactical Overview camera.
   - **🔊 / 🔇** toggles persisted audio mute; **🔄** respawns the ball cleanly if needed.
4. **Scorecard**: Complete all holes on a course to review your hole-by-hole scorecard and total par rating.

---

## 🗺️ Changelog & Roadmap

### Completed (`v1.0.0`)
- [x] Core 3D gameplay mechanics & Rapier physics
- [x] Spline-based Level Editor & dynamic obstacles (Windmill)
- [x] Firebase User Accounts, Cloud Saves & Level Bundling

### Completed (`v1.5.0`)
- [x] Procedural Spline Course Generation & low-poly terrain props
- [x] Role-Based Access Control (Player / Creator / Admin), Profiles & Ball Customization
- [x] Campaign Visibility toggles & initial procedural Physics Audio

### Completed (`v2.0.0`)
- [x] **Modular Clean Engine Architecture**: Refactored `CourseManager`, `EditorController`, `BallController`, and `AudioManager` under single-responsibility modules guarded by automated architecture tests.
- [x] **9-Hole Carnival Park Showcase**: Shipped full 9-hole showcased course with Carnival & Meadow modular GLB kit pieces and Home screen live turntable flyover.
- [x] **Unified Cartoon Arcade UI**: Shared `ArcadeFrame`, `ArcadeButton`, and `ArcadeTitle` primitives across Home, Courses Hub + Tour Bundler, Profile, Sign-In, First-Login Modal, and Editor HUD.
- [x] **Dynamic Hazards & Polish**: Kinematic 4-blade spinning windmill obstacles, water-hazard splash + automatic safe-spot respawn, glowing booster chevrons, and 3D aerodynamic `BallWindTrail` ribbons.
- [x] **Sample-Backed Web Audio Overhaul**: 9 normalized CC0 / CC-BY OpenGameArt SFX (`SoundBank` + `SynthEffects` fallbacks), ground-gated grassy rolling loop, debounced wall knocks, booster whooshes, aim ticks, and Par-or-better applause.

### Roadmap (`v2.1+`)
- [ ] **Ambient Background Music**: In-game music player with mute/volume controls utilizing the theme tracks in `static/sounds/` (*Clear Day*, *Sunset*, *Night*, *Vaporwave*).
- [ ] **Community Discovery & Ratings**: Dedicated public browser with upvotes, difficulty ratings, and play-counts.
- [ ] **Global Leaderboards & Campaign Progression**: Best par / speedrun leaderboards and campaign unlock progression.
- [ ] **Mobile Touch Controls**: Responsive touch-and-drag slingshot controls for tablets and phones.
- [ ] **Async & Real-Time Multiplayer**: Turn-based course challenges and multi-player lobbies (up to 4 players).

---

## 🔊 Audio Credits & 📜 License

- Sound effects in `static/sounds/` are sourced from [OpenGameArt.org](https://opengameart.org) under CC0 1.0 Universal and CC-BY 3.0 licenses — full attributions are listed in [`static/sounds/CREDITS.md`](static/sounds/CREDITS.md).
- Mini Golf Mania source code is released under the [MIT License](LICENSE).
