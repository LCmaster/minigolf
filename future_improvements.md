# Editor Improvements Roadmap

This file contains a list of identified improvements for the `src/routes/editor` architecture based on the `minigolf-expert` guidelines.

## 1. Object Instancing (Performance)
**Goal:** Migrate highly repetitive editor assets (like basic bumpers or scenery) to use `<InstancedMesh>`.
**Why:** Currently, placing 50 sand traps creates 50 independent `<T.Mesh>` draw calls, which can cause lag on complex maps. Instancing will keep draw calls at 1 regardless of how many identical blocks are placed.

## 2. Dragging Reactivity Bottlenecks
**Goal:** Throttle `historyStore` commits during `TransformControls` dragging operations.
**Why:** Moving a block fires `on:change` 60+ times a second. Pushing every micro-movement to the Undo/Redo stack destroys performance and fills the history stack with useless micro-steps.
**Action:** Ensure the `historyStore.commit()` only fires on `on:dragging-changed` (when the mouse is released).

## 3. Editor Audio Muting
**Goal:** Prevent physics audio (like thwacks and rolling sounds) from triggering randomly while editing or placing blocks.
**Why:** The editor lacks a spawned Player ball, so raw physics interactions between blocks might cause unexpected ambient noise.
**Action:** Pass an `isEditor={true}` prop down to the loaded obstacles to strictly disable audio nodes when rendered inside `EditorScene`.

## 4. Raycaster Ghost Placement
**Goal:** Replace the default `[0,0,0]` block spawn logic with an interactive click-to-place system.
**Why:** When clicking an item in the `AssetsList`, it spawns at the origin.
**Action:** When a block is selected from the list, attach a translucent "ghost" version of the block to the user's cursor. Clicking anywhere on the `EditorFloor` or `SplineTrack` should raycast the exact coordinate and spawn the block perfectly at the mouse position.
