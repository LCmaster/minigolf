# Carnival Park Modular Kitbash Architecture

This document describes how the stylized **Carnival Park** course kitbash system (modeled after `assets/sunny_creek_midway_bend.blend`) integrates into Mini Golf Mania's Three.js + Rapier engine (`/play` and `/editor`) alongside the existing `country_club` arcade kit.

---

## 1. Blender-to-GLB Modular Standard (`6.0m` Grid)

All modular pieces live in `static/models/kit/` and are indexed in `static/models/kit/manifest.json` (`assets/carnival_kitbash_master.blend` stores the Carnival track/props/obstacles, and `assets/stylized_rock_pack.blend` stores the 15 sculpted Large/Medium/Small stylized rocks baked via Cycles vertex colors with lightweight `UBX_Rock` proxies).

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
- Whenever `CourseManager` loads or modifies tiles/props, `onHoleChanged` updates `ParkBackdrop.updateFromCourse()` to refit the flattened area, dips any ground-level cup cavity clearance (`3.6m` around `goalPos`), rebuilds the instanced wooden perimeter fence (`Park_Perimeter_Fence`), and regenerates a static Rapier trimesh terrain collider (`CourseManager.updateTerrainCollider()`) so balls cannot pass through the park ground.
- Elevated tiles (`Y = +1.5m`) sit naturally on modular `terrain_hill_knoll_6x6` props, and ponds sit inside stone-rimmed basins (`carnival_bridge_pond_6x12` and `terrain_pond_patch_6x6`). All `terrain_*` kitbash GLBs (`terrain_hill_knoll_6x6`, `terrain_pond_patch_6x6`, `terrain_waterfall_lagoon_12x12`) include `UBX_*` collision proxies so hills, rims, and bluffs are physically solid.
- **Cup Bottom Indicator & Immediate Ball Stop (`CourseManager.ts`, `BallController.ts`, `GameEngine.ts`)**:
  - The goal flag pole (`center.y = 0`), bottom target ring, solid `cupBottomCollider`, and `goalSensorCollider` all anchor at the true bottom of the cup (`cupRimY - 0.30m`).
  - Sinking triggers `BallController.sinkAt()`, immediately zeroing linear/angular velocity and locking the ball at `[goalX, cupFloorY + radius, goalZ]` so it never falls through the green or terrain beneath; **Putt Again** (`GameEngine.resetBallToTee()`) restores dynamic physics at the tee.

---

## 4. Editor, Procedural Generation & Persistence

- **Free-Roam Editor Mode (`GameEngine.setEditorMode(true)` & `CameraController` `"editor_free"`)**:
  - While editing, the golf ball, slingshot aiming input, and ball-follow camera lock are disabled (`Playtest / Test Putt` spawns the ball and switches to play mode, then removes the ball again on exit).
  - **Camera Controls**: `WASD` / Arrow keys pan across the course (`Shift` for faster pan), Right-click or Middle-click drag orbits (`12°`–`80°` pitch, `360°` yaw), Scroll wheel zooms freely (`4m`–`65m`), and `F` (or **🎯 Frame**) centers on the course.
- **Playable vs. Decorative Prop Role System (`KitTypes.ts` & `PropPalette.svelte`)**:
  - Every `KitPieceMetadata` supports `propRole?: "playable" | "decorative"` (resolved via `getPiecePropRole()`), separating interactive gameplay props (bumpers, booster pads, wedge deflectors, spinners) from passive scenery (trees, boulders, toadstools, flowers, arches, fences, terrain hills/ponds).
  - `PropPalette.svelte` is driven dynamically from `manifest.json` (`getFreeformPropCatalog()`) with **All / ⚡ Play / 🌿 Decor** filter tabs and visual badges, while socket-snapping hazards (`hazard_booster_strip_6x3`, `hazard_sand_trap_6x6`, `hazard_water_channel_6x6`) are placed through `RadialSocketMenu.svelte` under **Track | Hazards**.
  - Ghost placement previews tint **amber** (`0xfbbf24`) for playable props and **emerald** (`0x34d399`) for decorative props.
- **Playable Prop Physics (`AssetLoader.ts`, `CourseManager.ts`, `GameEngine.ts`)**:
  - GLB proxy meshes containing `Sensor` (`UBX_Booster_Sensor` on `prop_carnival_booster_pad`) are isolated into `ubxSensorGeometry` and instantiated as non-solid Rapier triggers (`setSensor(true)`), whereas solid bumper proxies (`UBX_Bumper`) get high restitution (`1.15`).
  - Rolling over `prop_carnival_booster_pad` or `hazard_booster_strip_6x3` applies a forward directional impulse (`0.038`) with a `0.35s` cooldown.
  - **15°–75° Stylized Carnival Curves:** `carnival_turn_15deg_rounded`, `carnival_turn_30deg_rounded`, `carnival_turn_60deg_rounded`, and `carnival_turn_75deg_rounded` follow the same `R = 6.0m` centerline arc math as Classic turns (`LOC_Socket_In -> LOC_Socket_Out` for right turns, and reversed `LOC_Socket_Out -> LOC_Socket_In` attachment for symmetrical left turns).
- **Bidirectional Spline Track Editing (`SplineMath.ts`, `SplineTrackSync.ts`, `DiscreteKitFitter.ts`)**:
  - Toggle **〰️ Edit Track (`T`)** in `/editor` to view the single-path Cubic Bezier spline overlay, waypoint spheres (`Node 0` Tee protected from delete), and single `C1`-mirrored outgoing tangent handle diamond (`SplineOverlay.ts`), with a **〰️ Smooth / 📐 Sharp** corner toggle and **`⬇️ -1.5m` / `⬆️ +1.5m`** elevation steps per selected waypoint.
  - Dragging a node (`XZ`) or curve handle previews discrete fitted tiles at `60fps` (`ghostSegments`); releasing commits the [`CourseManager`](file:///home/luizv/Workspace/minigolf/src/lib/engine/course/CourseManager.ts) rebuild, locks the realized endpoints to exact socket coordinates, preserves Tee, Cup, placed freeform props, and mid-course hero/hazard modules (`carnival_bridge_pond_6x12`, `carnival_windmill_6x12`, `hazard_*`), and pushes an atomic [`HistoryManager`](file:///home/luizv/Workspace/minigolf/src/lib/engine/editor/HistoryManager.ts) undo entry.
  - **Double-Click** empty ground in **Edit Track** mode inserts a waypoint right after the selected node (appending & sliding the terminal Cup at the tail); **Del / Backspace** removes non-root nodes. Manual socket snaps in Build mode update `HoleData.splinePath` automatically (`syncSplineAfterSocketChange`).
- **Manual Building & Editing (`/editor`)**:
  - Toggle between **🎪 Carnival** and **🏌️ Classic** kits in the top bar.
  - Click glowing cyan socket rings to snap modular track or hazard tiles via `SocketSolver` (`RadialSocketMenu.svelte`).
  - Select props or terrain pieces from `PropPalette.svelte` to preview a role-tinted ghost under the cursor, then left-click to place (`R` rotates 45°, `Esc` cancels).
  - Left-click an existing prop to select it, drag to reposition, press `R` to rotate, or press `Delete`/`Backspace` to remove.
  - Toggle **🧹 Erase (`X`)** to left-click delete any prop or non-root track tile (re-opening parent sockets and rebuilding `SeamWelder` floor physics), or click **🗑️ Clear** to reset to a single tee tile.
  - Click **🌉 Sunny Creek** or **🎡 Big Top** to load the Carnival Park showcase holes for inspection or remixing.
- **Procedural Generation (`HoleGenerator.ts` & `AutoDecorate.ts`)**:
  - `HoleGenerator.generateHole({ par, style, includeObstacles, theme })` builds guaranteed-solvable socket-connected layouts in either `country_club` or `carnival_park` theme (inserting `carnival_bridge_pond_6x12` and ramps when enabled).
  - `autoDecorateHole()` (also triggered manually via **🌲 Decorate** in `/editor`) adds `terrain_hill_knoll_6x6` under elevated tiles, `prop_carnival_arch_6m` over the tee, and scatters trees, boulders, toadstools, grass tufts, and wildflowers outside a `6.2m` track clearance radius without removing existing user props.
- **Save & Play (`CourseStorage.ts` → `/play`)**:
  - Clicking **💾 Save** stores the hole locally (`localStorage`) and surfaces a **🎮 Play Saved** link (`/play?course=<id>`).
  - `/play` (`src/routes/play/+page.svelte`) includes a course selector dropdown with **Carnival Park Showcase** and all user-saved custom courses.

