---
name: code-reviewer
description: Reviews diffs, pull requests, and source files in Mini Golf Mania against the project's TDD methodology, clean-code standards, resource hygiene, and Cartoon Arcade UI cohesion. Use when auditing code changes, verifying readiness before committing, or enforcing architecture guards.
---

# Mini Golf Mania Code Reviewer

Use this runbook to perform deterministic, methodology-aligned code reviews on staged diffs, recent commits, or target modules.

## Review Runbook

1. **Inspect Scope & Diffs**
   - Check uncommitted work or target commit range:
     `git status -s`
     `git diff` (or `git show <sha>` / `git diff main...HEAD`)
2. **Audit File Length & Architecture Guards**
   - Verify touched source files against the single-responsibility line budget:
     `wc -l <touched_files>`
   - Confirm no superseded v1 prototype files (`src/lib/trackGeometry.js`, `src/routes/mylevels`, etc.) or unguarded wrapper files were reintroduced.
3. **Run the 6-Point Methodology Checklist** against every changed file (see below).
4. **Verify Automated Checks After Final Edits**
   - Run full unit/integration tests: `./node_modules/.bin/vitest run --reporter=dot`
   - Run production SSR/client bundle check: `npm run build`
5. **Report Using the Structured Review Output Template** below, citing only directly observed file paths, line numbers, symbols, and command results.

---

## 6-Point Methodology Checklist

### 1. TDD Discipline (`Red -> Green -> Refactor -> Commit`)
- Every new behavior or bugfix has a corresponding automated test (`*.test.ts`) placed next to the module it verifies (e.g., `TileSwapPlanner.test.ts` beside `TileSwapPlanner.ts`).
- Pure planning, math, socket, and storage rules are extracted away from Three.js / Rapier side effects so they execute fast without DOM/WebGL mocks.
- Edge cases, invalid inputs, and boundary conditions have dedicated assertions—no skipped (`it.skip`) or relaxed assertions.

### 2. Single-Responsibility & Lean File Budget (`<= 450` lines)
- Core engine orchestrators (`CourseManager.ts`, `EditorController.ts`, etc.) stay **at or below `450` lines**; cohesive sub-responsibilities are extracted into focused helpers/managers.
- Functions remain small and single-purpose with shallow nesting and early returns (guard clauses).
- Repeated logic across branches or sibling files is unified into shared helpers rather than copy-pasted.
- Variant handling uses lookup tables or uniform code paths rather than growing `if / else if` chains.

### 3. Documentation & Named Constants
- New or modified `.ts` files start with a crisp **file-header JSDoc** explaining module responsibility.
- Public classes, interfaces, and non-obvious helper methods carry concise **JSDoc** comments (`/** ... */`).
- Inline comments explain **why** an invariant or offset exists, not **what** the syntax does; preserve existing valid comments and docstrings.
- Domain values (impulses, heights, durations, line budgets, colors) live in named constants rather than unexplained inline magic numbers.

### 4. Three.js, Rapier3D & DOM Resource Hygiene
- Dynamically allocated Three.js geometries, materials, and textures have explicit `.dispose()` cleanup in `dispose()` / `clear()` / `onDestroy()`.
- Rapier rigid bodies, colliders, sensors, and map/set registrations (`boosterSensors`, `bumperColliderHandles`) are removed cleanly when tiles, props, or holes unload.
- DOM/window event listeners (`pointermove`, `pointerdown`, `keydown`, `resize`) added in `attach()` or `onMount()` are symmetrically removed on teardown.
- High-frequency render loop updates never mutate reactive Svelte stores every frame; browser APIs stay inside `onMount` or `typeof window !== "undefined"` guards.

### 5. Cartoon Arcade UI & Theme Cohesion
- Player-facing UI and overlays adhere to the **Cartoon Arcade** aesthetic (warm wood/cream frames, glossy pill/orb controls, crisp outlined typography) rather than mixing legacy dark-slate or pastel Skeleton defaults.
- Numeric scores and HUD badges display clear player-facing values (e.g., numeric `0` via `formatRelativeScore` instead of cryptic golf abbreviations).
- Track courses stay theme-consistent (no classical grey/wood hazard tiles inside Carnival Park holes) and playable visual cues stay cleanly visible (`depthTest: false` / elevated chevrons).

### 6. Atomic Git Hygiene
- Changes land as small, logical commits following conventional commit prefixes (`feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`).
- Stage only explicitly intended files—**never** run `git add -A` so unrelated workspace modifications never sneak into commits.

---

## Structured Review Output Template

```markdown
## Code Review Summary

| Dimension | Status | Notes |
| :--- | :--- | :--- |
| TDD & Test Coverage | PASS / WARN / FAIL | ... |
| Single-Responsibility (`<= 450` lines) | PASS / WARN / FAIL | ... |
| Documentation & Constants | PASS / WARN / FAIL | ... |
| Three.js / Rapier / DOM Hygiene | PASS / WARN / FAIL | ... |
| Cartoon Arcade UI & Theme Cohesion | PASS / WARN / FAIL | ... |
| Git & Build Hygiene | PASS / WARN / FAIL | ... |

### Blocking Issues
- `[file.ts:L10-L25]` Concrete correctness, leak, or methodology violation and exact fix.

### Clean-Code Improvements
- Optional polish suggestions kept strictly within the review scope.

### Verification
- Vitest: exact test file / test counts observed after final edit.
- Build: `npm run build` result (`exit code 0`).
```
