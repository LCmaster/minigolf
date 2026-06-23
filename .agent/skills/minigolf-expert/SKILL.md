---
name: minigolf-expert
description: The ultimate unified expert skill for Mini Golf Mania. Combines best practices for Game Development, Svelte/SvelteKit, Threlte/Three.js, custom Shaders/Materials, and Track Creation rules.
---

# Mini Golf Mania Unified Expert Skill

This document combines all specialized knowledge required to build, maintain, and expand Mini Golf Mania.

---

## 1. Game Developer Guidelines

- **State Management**: Use Svelte stores (`$course`, `$current`, `$shots`) for UI/session state. DO NOT use reactive stores for high-frequency game loop updates (like ball position) due to massive UI re-evaluation overhead.
- **Physics (Rapier)**:
  - **Collision Groups**: Use the `<CollisionGroups>` wrapper. Never rely on undocumented props directly on a `<Collider>`.
  - **Sensors vs. Colliders**: Use `sensor={true}` for trigger volumes (holes, audio zones). Use standard colliders for physical boundaries.
  - **RigidBody Types**: `dynamic` for the ball, `fixed` for level geometry, `kinematicPosition` for moving obstacles.
- **Audio & SFX**: Use `audio.js` store architecture. Isolate physics bounce sounds using an "Audio Sensor" collider wrapped around the player.
- **Performance**: Prefer `InstancedMesh` over rendering hundreds of individual meshes. Properly `.dispose()` dynamically created Three.js textures/materials in `onDestroy`.

---

## 2. Svelte & SvelteKit Architecture

- **Svelte Reactivity**: Reactivity is triggered by assignment (`=`). When mutating arrays/objects, explicitly reassign (`arr.push(item); arr = arr;`). Keep `$:` blocks concise.
- **Component Communication**: Use `export let` for parent-to-child data, Context API (`setContext`/`getContext`) for deeply nested specific instances, and Stores for global state.
- **SvelteKit Routing**: 
  - `+page.svelte` (UI), `+layout.svelte` (Layout)
  - `+page.server.js` (Server-only logic, Firebase Admin, secrets)
  - `+page.js` (Universal load functions)
  - Use `<form method="POST">` with `use:enhance` from `$app/forms`.
- **SSR & Browser APIs**: Wrap browser-specific code (`window`, `document`, `new Audio()`) inside `onMount` or behind `typeof window !== 'undefined'` checks.

---

## 3. Threlte & Three.js Principles

- **The `<T>` Component**: Declaratively construct Three.js objects (e.g., `<T.Mesh>`). Do not instantiate new objects directly in the Svelte markup (`geometry={new BoxGeometry()}`) as it creates memory leaks.
- **The Render Loop (`useTask`)**: Use `useTask` to execute logic every frame. Avoid Svelte assignments inside `useTask`.
- **Interactivity**: Use the `interactivity` plugin and attach `on:click`, `on:pointerenter` directly to `<T.Mesh>`. Remember to `e.stopPropagation()` when necessary.
- **Asset Loading**: Use Threlte's built-in hooks (`useGltf`, `useTexture`) which integrate with Svelte's suspense mechanisms (`{#await}`).

---

## 4. Track Creation Schema

- **The Flat Schema**: Courses and Campaigns use a unified flat schema:
```json
{
  "name": "My Level",
  "theme": "clear",
  "isCampaign": true,
  "holes": [
    { "par": 2, "controlPoints": [...], "blocks": [...] }
  ]
}
```
- **Control Points**: Dictate the Catmull-Rom spline path. Format: `{ "id": "uuid", "position": [x, 0, z] }`. First point is start, last is the hole.
- **Blocks**: Format: `{ "id": "uuid", "type": "windmill", "position": [x, 0, z], "rotation": [0, yaw, 0], "variation": 1 }`. Valid types: `"ramp"`, `"bumper"`, `"boost"`, `"loop"`, `"windmill"`, `"ice"`, `"sand"`, `"water"`, `"plinko"`.

---

## 5. Three.js Shaders, Materials & Geometry

- **Shaders (GLSL vs TSL)**: Modern Three.js uses TSL (Three.js Shading Language) with NodeMaterials (e.g. `MeshStandardNodeMaterial`) to support WebGPU. For legacy/custom WebGL, use standard GLSL `ShaderMaterial` with `uniforms`, `vertexShader`, and `fragmentShader`.
- **Materials**: Standardize on `MeshStandardMaterial` for PBR lighting. Use `MeshBasicMaterial` if lighting is unneeded to save performance.
- **Geometry**: Built-in shapes (`BoxGeometry`, `SphereGeometry`). Use `BufferGeometry` for custom shapes (like the Spline track builder), making sure to construct Float32Arrays for `position`, `normal`, and `uv` attributes.

---

## 6. Code Review Guidelines

- **Performance**: Look for memory leaks (missing `.dispose()`), excessive reactivity (stores inside game loops), and non-instanced repetitive meshes.
- **Security**: Ensure Firebase client code only runs in client-side contexts, and Admin SDK is strictly kept in `+page.server.js`.
- **Style**: Maintain idiomatic Svelte syntax. Clean up console logs, remove unreachable code, and keep components modular and DRY.
