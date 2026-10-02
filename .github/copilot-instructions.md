# Copilot Orchestrator — Floor Plan Editor

Every prompt in this workspace MUST pass through this file first. Read the
rules, classify the request, route it to the right skill, then act.

---

## 1. Project context

- React 18 + TypeScript + Vite 2D floor plan editor.
- Entry: [index.html](index.html) → [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx).
- Core components: [src/components/Editor.tsx](src/components/Editor.tsx), [src/components/SidePanel.tsx](src/components/SidePanel.tsx), [src/components/Toolbar.tsx](src/components/Toolbar.tsx).
- Shared types: [src/types.ts](src/types.ts). Geometry helpers: [src/utils/geometry.ts](src/utils/geometry.ts).
- Tests: Vitest, colocated as `*.test.ts` (see [src/utils/geometry.test.ts](src/utils/geometry.test.ts)).
- Open tickets + feature spec live in [README.md](README.md). Running log of
  fixes lives in [NOTES.md](NOTES.md) — update it whenever you ship a fix.

---

## 2. Orchestration flow (run this on every prompt)

1. **Parse** the user request. Identify intent in one sentence.
2. **Classify** into exactly one skill below (section 3). If it fits none,
   use `general-dev`.
3. **Gather** only the context the chosen skill needs. Prefer the custom
   tools (`grep_search`, `file_search`, `read_file`, `list_dir`) over
   terminal `grep`/`find`/`cat`.
4. **Act** per the skill's rules. Keep edits surgical.
5. **Verify** — run `npm run test` for logic changes, `npm run build` for
   type-level changes. Report pass/fail.
6. **Log** — if the change relates to a ticket (T1/T2/T3) or the T-junction
   feature, append a short entry to [NOTES.md](NOTES.md).

Do not skip step 2. Every reply must name the skill it routed through.

---

## 3. Skill registry

### `ticket-fix` — bug tickets T1, T2, T3
Trigger: user mentions "T1", "T2", "T3", "snapping zoomed out", "side panel
styling", "thickness input focus", or asks to fix a bug.
Rules:
- Reproduce the bug mentally before editing. State the root cause in one line.
- Fix only the broken file(s). No drive-by refactors.
- Add or update a Vitest case if the bug has a pure-logic surface.
- Append `## T<n>` section to [NOTES.md](NOTES.md) with root cause + fix.

### `feature-tjunction` — T-junction snapping feature
Trigger: user mentions "T-junction", "snap to wall body", "centerline snap".
Rules:
- Snap threshold is **12 screen pixels**, converted to world units via the
  current `viewport.scale`. Never hard-code world-unit thresholds.
- Endpoint-to-endpoint snap wins over centerline snap when both are in range.
- A wall never snaps to itself. Skip `drag.id` in the loop.
- Add Vitest coverage for the point-to-segment projection in [src/utils/geometry.ts](src/utils/geometry.ts).

### `geometry` — pure math in `src/utils/`
Trigger: changes to [src/utils/geometry.ts](src/utils/geometry.ts) or new
geometry helpers.
Rules:
- Keep functions pure and framework-free. No React, no DOM.
- Every exported function needs a Vitest case.
- Prefer early returns over nested branches.

### `react-component` — anything under `src/`
Trigger: changes to `.ts` / `.tsx` files, component styling, or new hooks.
Full procedure: [.github/skills/react-floorplan/SKILL.md](.github/skills/react-floorplan/SKILL.md).
Highlights:
- Interactions use native HTML / SVG DOM events, typed precisely (no `any`).
- Never redefine a child component inside a parent's render (ticket T3).
- Every fixed value (pixels, zoom factors, colors) lives in `src/constants/`
  and is exported — no magic numbers in components or helpers.
- Non-trivial functions get a short JSDoc block covering what / inputs
  (with units) / output / edge cases.
- CSS is imported by the component that owns it.

### `testing` — Vitest work
Trigger: user asks for tests, coverage, or a failing test repro.
Rules:
- Run `npm run test` (not `vitest` directly) so Vite config is respected.
- One `describe` per unit under test. AAA layout inside each `it`.
- No snapshot tests for geometry — assert numeric values with a tolerance.

### `general-dev` — fallback
Trigger: anything that does not match above (tooling, deps, docs, questions).
Rules:
- Prefer answering from existing files before searching the web.
- Do not install new dependencies without asking.
- Do not create new markdown files unless the user asks.

---

## 4. Hard rules (apply to every skill)

- **Surgical edits only.** Do not rewrite files, rename symbols, or
  reformat code the user did not ask you to touch.
- **No new dependencies** without explicit approval.
- **No `any`** in new code. If you see `any` in code you are already
  editing, tighten it.
- **Early returns** over nested `if`/`else`.
- **Comments** only state what the code cannot. One line max. Never
  narrate the change for the reviewer.
- **Do not create markdown files** (including this one's siblings) unless
  the user asks. Updating [NOTES.md](NOTES.md) is allowed and expected.
- **Verify before claiming done.** Run tests or the build when the change
  could plausibly break them.

---

## 5. Reply template

Start every substantive reply with one line:

> Skill: `<skill-name>` — <one-sentence intent>

Then do the work. Keep prose minimal; let the diff speak.
