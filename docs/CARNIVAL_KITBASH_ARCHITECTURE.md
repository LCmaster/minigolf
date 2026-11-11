# Carnival Park Modular Kitbash Architecture

This document describes how the stylized **Carnival Park** course kitbash system (modeled after `assets/sunny_creek_midway_bend.blend`) integrates into Mini Golf Mania's Three.js + Rapier engine (`/play` and `/editor`) alongside the existing `country_club` arcade kit.

---

## 1. Blender-to-GLB Modular Standard (`6.0m` Grid)

All modular pieces live in `static/models/kit/` and are indexed in `static/models/kit/manifest.json` (`assets/carnival_kitbash_master.blend` is the Blender source for the 20 Carnival Park assets).

- **Grid & Dimensions**:
  - Straight / standard square footprint: `6.0m × 6.0m` (bridge/overpass: `6.0m × 12.0m`)
  - Playable turf width: `5.2m` (`±2.6m`)
  - Curb rail width / height: `0.4m` wide, `0.6m` tall
  - Floor slab depth: `0.5m` (`Y = 0.0` rolling surface down to `Y = -0.5`)
  - Cup cutout radius: `0.38m` (matching `CourseManager.createGoalSensor` `0.425m` trigger cylinder)
- **Blender Export Rules (`export_yup=True`, `export_apply=True`)**:
  - Blender `(X, Y, Z)` maps to Three.js `(X, Z, -Y)` — forward track flow (`-Z` in Three.js) runs along `+Y` in Blender.
  - Convert `FONT` and `CURVE` objects to `MESH` prior to export.
  - Visual meshes must be prefixed `Mesh_*` (multi-material Blender objects exported as GLTF `THREE.Group` wrappers are preserved cleanly by `AssetLoader`).
  - Smooth physics proxies must be prefixed `UBX_*` (`UBX_Floor`, `UBX_Wall_L`, `UBX_Wall_R`, `UBX_Wall_Back`, or `UBX_*` on collidable props like bumpers/boulders/arch posts).
  - Sockets and locators use empties: `LOC_Socket_In`, `LOC_Socket_Out`, `LOC_Spawn_Tee`, `LOC_Sensor_Goal`.

---

## 2. Dual-Mode Materials & Stylized Shaders

- `AssetLoader.ts` keeps the shared PBR trim-sheet material for base `country_club` modular kit pieces.
- Pieces with `"preserveMaterials": true` keep their glTF PBR material colors.
- `StylizedMaterials.ts` swaps two Blender procedural-node material names dynamically at load time:
  - `*FairwayTurf*` → `createCarnivalTurfMaterial()` (crisp two-tone emerald/lime striped canvas texture aligned to track UVs)
  - `*PondWater*` → `createPondWaterMaterial()` (translucent turquoise water with world-space caustic ripples)

---

## 3. Delimited Horizon Park Backdrop (`ParkBackdrop.ts`)

Instead of a floating island void, `RenderPipeline.ts` creates a `ParkBackdrop`:
- A `280m × 280m` grassy park plane (`Y = -0.08m`) flattened cleanly inside the active hole's padded bounding box and smoothly blending outward into rolling `simplex-noise` hills and sky fog (`#9be0ff`).
- Whenever `CourseManager` loads or modifies tiles/props, `onHoleChanged` updates `ParkBackdrop.updateFromCourse()` to refit the flattened area and rebuild an instanced wooden perimeter fence (`Park_Perimeter_Fence`) around the delimited playable area (toggleable via `HoleData.showBoundary` or the editor `🪵 Fence` button).
- Elevated tiles (`Y = +1.5m`) sit naturally on modular `terrain_hill_knoll_6x6` props, and ponds sit inside stone-rimmed basins (`carnival_bridge_pond_6x12` and `terrain_pond_patch_6x6`) slightly above lawn level (`Y ≈ 0.12m`).

---

## 4. Editor, Procedural Generation & Persistence

- **Manual Building (`/editor`)**:
  - Toggle between **🎪 Carnival** and **🏌️ Classic** kits in the top bar.
  - Click glowing cyan socket rings to snap modular tiles via `SocketSolver` (`RadialSocketMenu.svelte`).
  - Select props or terrain pieces from `PropPalette.svelte` and left-click to place on floors or lawn (`R` rotates 45°, `Right-click` removes, `Ctrl+Z` / `Ctrl+Y` undo/redo via `HistoryManager`).
  - Click **🌉 Sunny Creek** to load the reference reconstruction (`src/lib/courses/carnivalParkCourse.ts`) for inspection or remixing.
- **Procedural Generation (`HoleGenerator.ts` & `AutoDecorate.ts`)**:
  - `HoleGenerator.generateHole({ par, style, includeObstacles, theme })` builds guaranteed-solvable socket-connected layouts in either `country_club` or `carnival_park` theme (inserting `carnival_bridge_pond_6x12` and ramps when enabled).
  - `autoDecorateHole()` (also triggered manually via **🌲 Decorate** in `/editor`) adds `terrain_hill_knoll_6x6` under elevated tiles, `prop_carnival_arch_6m` over the tee, and scatters trees, boulders, toadstools, grass tufts, and wildflowers outside a `6.2m` track clearance radius without removing existing user props.
- **Save & Play (`CourseStorage.ts` → `/play`)**:
  - Clicking **💾 Save** stores the hole locally (`localStorage`) and surfaces a **🎮 Play Saved** link (`/play?course=<id>`).
  - `/play` (`src/routes/play/+page.svelte`) includes a course selector dropdown with **Carnival Park Showcase** and all user-saved custom courses.

