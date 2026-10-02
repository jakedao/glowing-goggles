# Notes

Running log of fixes for the three tickets and the T-junction feature from
the [README](README.md). Format per ticket: symptom → root cause → fix.

---

## T1 — Snapping while dragging works zoomed in, but not zoomed out

Reference: README › "The tickets" › T1.

**Symptom.** When the viewport is zoomed out, dragging an endpoint near
another wall almost never snaps. Zoomed in, snapping works as expected.

**Root cause.** The snap threshold lived in `src/utils/geometry.ts` as
`SNAP_DIST = 0.5`, measured in **world units**, and `Editor.tsx` compared
raw world-space distances against it:

```ts
if (dist(p, w.start) < SNAP_DIST) { ... }
```

The user actually judges "close" in **screen pixels** (how far their
cursor looks from the target), not in world units. World units stay
constant across zoom levels, so a 0.5-unit radius is a wide snap zone
when zoomed in (because 0.5 units covers many pixels on screen) and a
near-invisible one when zoomed out (because 0.5 units is only a couple of
pixels). The README's T-junction spec also explicitly asks that the
threshold "work the same at every zoom level."

**Fix.**
- Introduced [src/constants/snapping.ts](src/constants/snapping.ts) with
  `ENDPOINT_SNAP_PX = 12` (screen pixels).
- In [src/components/Editor.tsx](src/components/Editor.tsx), the `snapDrag`
  helper converts the pixel threshold to world units via the current
  `viewport.scale`:

  ```ts
  const endpointSnap = ENDPOINT_SNAP_PX / viewport.scale;
  ```

  The world-space hit area now resizes with zoom, so the effective
  on-screen snap radius is constant.

---

## T2 — Side panel doesn't look right; CSS edits have no effect

Reference: README › "The tickets" › T2.

**Symptom.** The side panel renders with the wrong background and spacing
compared to the design, and editing stylesheets to try to fix it changes
nothing.

**Root cause.** `SidePanel.tsx` had inline `style={{...}}` attributes on
the panel wrapper, the length readout, and the thickness input:

```tsx
<div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>
```

Inline styles win on CSS specificity against class selectors, so any
edit to `.panel { background: ... }` in `SidePanel.css` (or anywhere
else) was silently overridden by the inline value. The ticket wording
pointed at `Editor.css` as a red herring — the panel never pulled styles
from there — but the real cause is the same: the stylesheet wasn't the
source of truth because inline styles always won.

**Fix.**
- Moved the static style values out of the components and into
  [src/components/SidePanel.css](src/components/SidePanel.css) under
  `.panel`, `.field-value`, and `.thickness-input`.
- Removed the inline `style={{...}}` attributes from
  [src/components/SidePanel.tsx](src/components/SidePanel.tsx) and
  [src/components/ThicknessField.tsx](src/components/ThicknessField.tsx);
  they use `className` now.
- CSS edits in `SidePanel.css` are the source of truth again — inline
  `style` is reserved for values driven by state.

---

## T3 — Thickness input drops focus after every keystroke

Reference: README › "The tickets" › T3.

**Symptom.** Clicking into the thickness input and typing a number drops
focus after each keystroke; the user has to re-click the field between
characters.

**Root cause.** `ThicknessField` was declared **inside** `SidePanel`'s
render body:

```tsx
export function SidePanel(...) {
  const ThicknessField = () => { return <input ... />; };
  return (... <ThicknessField /> ...);
}
```

Every keystroke calls `onThickness` → `App` re-renders → `SidePanel`
re-renders → a **new** `ThicknessField` function object is created in
that render pass. React identifies components by reference, so the new
reference looks like a different component type from the previous one.
React's reconciler responds by **unmounting the old `<input>` DOM node
and mounting a fresh one**. The fresh node starts without focus.

That's why the fix is to **move `ThicknessField` out of `SidePanel`'s
body** — not inline it. Moving it to module scope (and now to its own
file at [src/components/ThicknessField.tsx](src/components/ThicknessField.tsx))
means the function reference is created once at module load and reused
on every render. React sees the same component type, keeps the same
`<input>` DOM node across renders, and focus is preserved.

`useMemo` is not a substitute here: memoizing the component with real
deps still produces a new reference whenever `selected` or `onThickness`
changes, and memoizing with empty deps freezes the closure to the first
render's values. Hoisting + props is the correct pattern.

**Fix.**
- Extracted `ThicknessField` into
  [src/components/ThicknessField.tsx](src/components/ThicknessField.tsx)
  at module scope.
- It takes `wall` and `onThickness` as props so fresh values flow in
  every render.
- `SidePanel` imports and renders it: `<ThicknessField wall={selected}
  onThickness={onThickness} />`.

---

## Feature — T-junction snapping

Reference: README › "The feature: T-junction snapping".

**What changed.**
- Added [src/constants/snapping.ts](src/constants/snapping.ts) with
  `ENDPOINT_SNAP_PX = 12` and `TJUNCTION_SNAP_PX = 12` (both screen pixels).
- Added `projectPointOnSegment(p, a, b)` to
  [src/utils/geometry.ts](src/utils/geometry.ts) with Vitest coverage for
  interior projection, both end clamps, and the zero-length edge case.
- Rewrote the drag branch of `handlePointerMove` in
  [src/components/Editor.tsx](src/components/Editor.tsx) into a dedicated
  `snapDrag` helper that:
  - converts both thresholds to world units via `viewport.scale`;
  - picks the closest endpoint within range across all walls;
  - falls back to the closest centerline projection within range;
  - skips the wall being dragged (`w.id === drag.id`).

**Why endpoint wins over centerline.** The README spec: "endpoint-to-endpoint
snapping must still win when both are in range." The loop records the
best endpoint and best centerline separately and returns the endpoint
candidate first.

## THOUGHS ABOUT THE ASSIGNMENTS.
Very clean interface, but each item probes a different real skill — I liked that.
Short, well-scoped, and genuinely diagnostic. Good test in overall
