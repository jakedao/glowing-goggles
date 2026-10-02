---
name: react-floorplan
description: Author or modify React + TypeScript code in the Floor Plan Editor interview project. USE FOR any change under `src/` touching `.ts` / `.tsx` files, components, hooks, event handlers, styling, constants, or shared types. DO NOT USE FOR pure geometry math in `src/utils/` (use the `geometry` skill), test-only changes (use `testing`), or docs/tooling (use `general-dev`).
---

# React — Floor Plan Editor

Procedural skill for every React + TypeScript edit in this workspace.
Follow the steps in order. Each step has a concrete output.

---

## When this skill fires

- Any file matched by `src/**/*.{ts,tsx}`.
- Prompts about components, hooks, props, event handlers, SVG rendering,
  side-panel inputs, viewport math, styling, or shared types.
- Ticket **T2** (side panel CSS) and **T3** (thickness input focus) always
  route here.

## When it does not

- Pure math helpers in [src/utils/geometry.ts](src/utils/geometry.ts) → `geometry` skill.
- New Vitest cases with no component change → `testing` skill.
- Build config, deps, docs → `general-dev` skill.

---

## Workflow

### Step 1 — Read before editing
- Open the target file end-to-end with `read_file`.
- Open [src/types.ts](src/types.ts) if the change touches `Wall`, `Point`,
  or `Viewport`.
- If a numeric literal is involved, check `src/constants/` first — the
  value may already exist.

**Output of this step:** one sentence stating what you are changing and why.

### Step 2 — Classify the edit
Pick exactly one:

| Kind | Examples |
|---|---|
| **interaction** | pointer / wheel / keyboard handlers, drag logic |
| **render** | JSX / SVG output, conditional rendering, selection styling |
| **state** | `useState`, `useRef`, prop lifting |
| **style** | CSS files, class names |
| **types** | prop shapes, shared types, generics |

Apply the matching rule block below.

### Step 3 — Apply the rules

#### interaction
- Type every handler param. Use `React.PointerEvent<SVGSVGElement>`,
  `React.WheelEvent<SVGSVGElement>`, `React.ChangeEvent<HTMLInputElement>`,
  `React.FocusEvent<HTMLInputElement>`. **No `any`, no `unknown`.**
- Reach the DOM through a `useRef<SVGSVGElement>(null)` /
  `useRef<HTMLInputElement>(null)` — do not query by id or class.
- Convert pointer coordinates to world space via the ref's
  `getBoundingClientRect()`. Do not read `window` offsets.
- Call `e.stopPropagation()` on handlers attached to drag handles so the
  SVG background click does not also fire.
- Prefer `onPointerDown` + `onPointerMove` + `onPointerUp` +
  `onPointerLeave` for cleanup. Only attach `window` listeners if the
  interaction must survive leaving the SVG.
- Any pixel or world-unit threshold used by the handler comes from
  `src/constants/` (see Step 4). No magic numbers.

#### render
- Keys on mapped elements use a stable id (`w.id`), never the array index.
- Conditional branches via early return of the JSX or `&&` — do not build
  a nested ternary tree.
- SVG colors, stroke widths, and handle radii come from
  `src/constants/theme.ts`. No hex codes inline.

#### state
- Hooks declared at the top of the component in a stable order.
- Lift state only as far as it needs to go. `Editor` owns viewport + drag;
  `App` owns walls + selection.
- **Never declare a child component inside another component's body.** This
  gives it a new type each render and remounts its DOM — that is the T3
  bug. Hoist it to module scope or into its own file.

#### style
- CSS lives next to its component (`Editor.css`, `SidePanel.css`) and is
  imported from **that** component. A stylesheet only applies if the
  component that owns it (or an ancestor) imports it — that is the T2 bug.
- No inline `style={{...}}` for anything that is not driven by state.

#### types
- Shared domain types (`Wall`, `Point`, `Viewport`) live in
  [src/types.ts](src/types.ts). Do not duplicate them in components.
- One `interface <Component>Props` per component, declared directly above
  the component. **No `React.FC`.**
- Prefer `type` for unions, `interface` for object shapes.
- Exported or multi-line functions declare their return type explicitly.

### Step 4 — Promote magic values to constants

Any fixed value — pixel threshold, zoom factor, default thickness, color,
timeout, snap distance — goes in a constants module and is **exported**.

- Location: `src/constants/` (one file per concern:
  `editor.ts`, `snapping.ts`, `theme.ts`). Create the folder on first use.
- Naming: `SCREAMING_SNAKE_CASE`.
- Each constant gets a one-line comment stating **the unit** and what it
  means. Units matter (world units vs screen pixels).
- If you spot an inline literal in code you are already touching, promote
  it. Do not promote literals in untouched files.

Example:

```ts
// src/constants/snapping.ts

// screen pixels; endpoints within this radius snap together
export const ENDPOINT_SNAP_PX = 12;

// screen pixels; dragged endpoint snaps onto another wall's centerline
export const TJUNCTION_SNAP_PX = 12;
```

```ts
import { ENDPOINT_SNAP_PX } from '../constants/snapping';

const snapWorld = ENDPOINT_SNAP_PX / viewport.scale;
```

### Step 5 — Document non-trivial functions

Every non-trivial function — exported helper, event handler with real
logic, geometry routine — gets a short JSDoc block answering:

1. **What** it does, in one sentence.
2. **Inputs** — meaning and unit of each parameter.
3. **Output** — meaning and unit.
4. **Edge cases** (zero-length segment, self-snap, empty list, ...).

Keep it to 2–6 lines. No ASCII art, no change log, no author tag.
Trivial one-liners and tiny prop forwards do not need a block — but if a
reviewer would ask "what unit is this?", the comment was required.

```ts
/**
 * Project a point onto a line segment and return the closest point on it.
 * All coordinates are in world units.
 *
 * @param p  point being projected
 * @param a  segment start
 * @param b  segment end
 * @returns  closest point on segment [a, b]; returns `a` if the segment
 *          has zero length.
 */
export function projectPointOnSegment(p: Point, a: Point, b: Point): Point {
  // ...
}
```

### Step 6 — Control flow hygiene

- Early returns over nested `if` / `else`. Guard clauses at the top.
- No `else` after `return`.
- Loops that iterate walls: `continue` on self-match
  (`if (w.id === drag.id) continue;`) before doing work.

### Step 7 — Verify

- Logic / behavior change → `npm run test`.
- Type or prop-shape change → `npm run build`.
- CSS-only change → load the dev server mentally; no command required.
- Report pass / fail in the reply. Do not claim done without running one
  of these when the change could plausibly break them.

---

## Hard don'ts

- No `any`. No `as unknown as X`. If a cast is unavoidable, narrow with a
  type guard.
- No new dependencies without asking.
- No inline child components inside another component's render.
- No magic numbers in components or helpers once a named constant exists.
- No stylesheet import left dangling — the component that owns the CSS
  imports it.
- No new markdown files unless the user asks. [NOTES.md](NOTES.md) may be
  appended to when a ticket or feature is shipped.
