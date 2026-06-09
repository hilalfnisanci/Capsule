# Implementation plan — #27: `/capsules` list page reading from local storage

Status: plan only. Implementation lands in a separate PR opened against the
implementation branch for #27.

## 1. Summary

Add the client-side `/capsules` route. It reads every capsule the user has
created from `localStorage`, renders them as a list in reverse-chronological
order, shows a Locked/Unlocked pill plus a live countdown chip for locked
items, and links each row to `/capsules/[id]`. When no capsules exist, the
page renders a small card pointing at `/capsules/new`.

Pure client work. No new runtime dependencies. Test infra (Vitest +
Testing Library) is added because the repo does not currently have it (see
§2.2).

## 2. Scope and assumptions

### 2.1 In scope

- New route file `app/capsules/page.tsx` (`'use client'`).
- Two small presentational components, co-located under `app/capsules/`:
  - `CapsuleRow.tsx` — one capsule row (title, preview, unlock date, pill,
    countdown chip if locked) wrapped in a `next/link` to
    `/capsules/[id]`.
  - `EmptyState.tsx` — "No capsules yet" card with a CTA button linking to
    `/capsules/new`.
- Two pure helpers in `lib/` so they are unit-testable without rendering:
  - `lib/capsule-format.ts` — `formatUnlockDate(iso: string): string` and
    `formatCountdown(diffMs: number): string`.
- Vitest + Testing Library setup: dev-deps, `vitest.config.ts`, a
  `vitest.setup.ts` that imports `@testing-library/jest-dom`, an npm
  `test` script.
- Tests:
  - `lib/__tests__/capsule-format.test.ts` — pure unit tests for the two
    helpers (no DOM).
  - `app/capsules/__tests__/page.test.tsx` — renders 3 capsules in
    correct order; renders the empty state when none.

### 2.2 Critical dependency: `lib/capsule.ts` and the storage layer

The issue says "reads `listCapsules()` from `lib/capsule.ts`". That module
was implemented under issue #25 in commit `4206b33` but the implementation
**was reverted** by PR #31 (commit `19ed132`). It is not present on
`main` as of this plan.

The Vitest scaffolding from #25 (`vitest.config.ts`, the vitest/jsdom/
testing-library dev-deps, and `lib/capsule.test.ts`) was reverted with it.

This plan therefore re-introduces, **as a single first phase before
touching anything route-related**, the exact contract that the reverted
commit shipped, with no behavioural change. The shape is small enough that
re-stating it here is cheaper than blocking on a separate re-do of #25:

```ts
// lib/capsule.ts (re-introduced, byte-identical to the reverted 4206b33)
export type Capsule = {
  id: string;
  title: string;
  body: string;
  createdAt: string;   // ISO
  unlockAt: string;    // ISO
  openedAt: string | null;
};
export const STORAGE_KEY = "orchestra.capsules";
export function listCapsules(): Capsule[];
export function getCapsule(id: string): Capsule | null;
export function createCapsule(input: { title: string; body: string; unlockAt: string }): Capsule;
export function markOpened(id: string): Capsule | null;
export function deleteCapsule(id: string): void;
export function isUnlocked(capsule: Capsule, now?: Date): boolean;
```

The implementing engineer should restore the file (and its colocated test
`lib/capsule.test.ts`) verbatim from commit `4206b33`:

```
git show 4206b33:lib/capsule.ts      > lib/capsule.ts
git show 4206b33:lib/capsule.test.ts > lib/capsule.test.ts
git show 4206b33:vitest.config.ts    > vitest.config.ts
```

…and add back the dev-deps and `test` script via the diff in §3.1.

> If the orchestrator has already merged a re-implementation of #25 by the
> time #27 starts, **skip §3.1's lib/ and config restore** and only add
> the new route + components + helpers. Re-running `git show` against an
> already-present file is fine (no-op or trivial conflict).

### 2.3 Forward dependency: `/capsules/[id]`

Rows link to `/capsules/[id]`. That route is issue #29 and does not exist
on `main`. The link will 404 until #29 ships. That is acceptable — it
matches how `/capsules/new` (issue #28) already 404s from the header today
— and is **explicitly out of scope** for this PR. Do not stub a detail
page.

### 2.4 Hydration / SSR

`app/capsules/page.tsx` must be a client component (`'use client'`) because
it reads `window.localStorage`. The list is loaded inside `useEffect`, not
at module top-level or during render, so the first paint is consistent
between SSR and client:

```tsx
const [items, setItems] = useState<Capsule[] | null>(null);
useEffect(() => {
  setItems([...listCapsules()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)));
}, []);
```

`items === null` means "not yet loaded" → render nothing (or a minimal
skeleton). `items.length === 0` → empty state. `items.length > 0` → list.
This null-vs-empty distinction prevents the empty state from flashing on
first paint before the effect runs.

### 2.5 Out of scope

Pagination, filtering, search, bulk actions, drag/drop, theme toggle,
mobile layout tweaks beyond what Tailwind defaults give us, grouping by
locked/unlocked (that is issue #39).

## 3. Affected areas / files

### 3.1 New / restored

| Path | Action | Purpose |
| --- | --- | --- |
| `lib/capsule.ts` | restore from `4206b33` (see §2.2) | data layer |
| `lib/capsule.test.ts` | restore from `4206b33` | data-layer tests |
| `vitest.config.ts` | restore from `4206b33` | Vitest config with `@/*` alias |
| `vitest.setup.ts` | new | imports `@testing-library/jest-dom` |
| `package.json` | edit | add dev-deps + `test` script |
| `lib/capsule-format.ts` | new | `formatUnlockDate`, `formatCountdown` |
| `lib/__tests__/capsule-format.test.ts` | new | unit tests for helpers |
| `app/capsules/page.tsx` | new | the `/capsules` route |
| `app/capsules/CapsuleRow.tsx` | new | row presentational component |
| `app/capsules/EmptyState.tsx` | new | empty-state card |
| `app/capsules/__tests__/page.test.tsx` | new | route tests |
| `docs/plans/27-capsules-list-page.md` | new | this file |

### 3.2 Touched (not behaviour-changing)

- `package.json` — dev-deps and `test` script (exact diff in §4.1).
- `package-lock.json` — regenerated by `npm install` after the
  package.json change. The diff will be large; that is expected and was
  also true of the reverted #25 commit.

### 3.3 Not touched

- `app/layout.tsx` — already wraps children in
  `<main className="mx-auto max-w-5xl px-6 py-8">`; the route inherits
  it. Do not re-add a `<main>` inside `page.tsx`.
- `components/Header.tsx` — already shows the "All capsules" link
  pointing to `/capsules` and applies `aria-current="page"` via
  `usePathname()`; this just lights up automatically once the route
  exists.
- `tailwind.config.ts` — the existing `./app/**/*` glob covers the new
  files.

## 4. Contracts

### 4.1 `package.json` diff

Add to `devDependencies` (versions chosen to match what the reverted
#25 commit used; pin to those):

```json
"@testing-library/jest-dom": "^6.6.3",
"@testing-library/react": "^16.1.0",
"@testing-library/user-event": "^14.5.2",
"@vitejs/plugin-react": "^4.3.4",
"jsdom": "^29.1.1",
"vitest": "^4.1.8"
```

Add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Also add `engines.node >= 20.0.0` (the reverted `f8b7ec8` set this; jsdom
29 and Vitest 4 require it).

### 4.2 `lib/capsule-format.ts`

```ts
export function formatUnlockDate(iso: string): string {
  // User's local format. Date + short time, no seconds.
  // Deliberately omit `locale` arg so Intl picks the runtime default.
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Returns a short human countdown to the unlock instant.
// Bucketing rules (chosen for the chip's compact "Xd Yh" form):
//   >= 1 day   →  "Xd Yh"
//   >= 1 hour  →  "Xh Ym"
//   >= 1 min   →  "Xm Ys"
//   >= 0       →  "Xs"           // sub-minute
//   <  0       →  "ready now"
export function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "ready now";
  const s = Math.floor(diffMs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h - d * 24}h`;
  if (h >= 1) return `${h}h ${m - h * 60}m`;
  if (m >= 1) return `${m}m ${s - m * 60}s`;
  return `${s}s`;
}
```

### 4.3 `app/capsules/page.tsx` (sketch)

```tsx
"use client";

import { useEffect, useState } from "react";
import { listCapsules, isUnlocked, type Capsule } from "@/lib/capsule";
import CapsuleRow from "./CapsuleRow";
import EmptyState from "./EmptyState";

export default function CapsulesPage() {
  const [items, setItems] = useState<Capsule[] | null>(null);

  useEffect(() => {
    setItems(
      [...listCapsules()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }, []);

  if (items === null) return null;        // pre-hydration
  if (items.length === 0) return <EmptyState />;

  return (
    <section aria-labelledby="capsules-heading">
      <h1
        id="capsules-heading"
        className="mb-6 text-2xl font-semibold tracking-tight text-gray-900"
      >
        Your capsules
      </h1>
      <ul className="flex flex-col gap-3">
        {items.map((c) => (
          <li key={c.id}>
            <CapsuleRow capsule={c} unlocked={isUnlocked(c)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### 4.4 `app/capsules/CapsuleRow.tsx`

- Wrapped in `<Link href={`/capsules/${capsule.id}`}>` so the entire row
  is clickable; styled as a block with hover state.
- Body preview: `capsule.body.length > 120 ? body.slice(0, 120).trimEnd() + "…" : body`. Use a single inline helper, do not pull in a library.
- Tailwind layout: card-ish row, flex row on `sm:` and up, stacked on
  mobile. No new shadcn-style abstractions.
- Pill: `unlocked ? "Unlocked" : "Locked"`, distinct background colors
  (e.g. `bg-emerald-100 text-emerald-800` vs `bg-amber-100 text-amber-800`).
  Render the chip as a `<span>` with `aria-label` repeating the text so a
  screen reader announces status.
- Countdown chip: rendered **only when `unlocked === false`**. Pull from
  `formatCountdown(Date.parse(capsule.unlockAt) - Date.now())`. No live
  timer in this PR — it computes once at render. (A live-updating
  countdown badge is issue #40.)

### 4.5 `app/capsules/EmptyState.tsx`

```tsx
import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <p className="text-base text-gray-700">No capsules yet</p>
      <Link
        href="/capsules/new"
        className="mt-4 inline-flex items-center rounded-md border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Create your first capsule
      </Link>
    </div>
  );
}
```

## 5. Implementation steps (ordered)

1. **Restore the data layer.** Run the three `git show … > file` commands
   in §2.2 to re-create `lib/capsule.ts`, `lib/capsule.test.ts`, and
   `vitest.config.ts` from `4206b33`. Apply the `package.json` and
   `engines` changes from §4.1. Run `npm install`. Run `npm run test` —
   the 11 tests from #25 should pass green. If a re-implementation of
   #25 has already landed on main, skip this step.

2. **Add `vitest.setup.ts`** with `import "@testing-library/jest-dom";`
   and reference it from `vitest.config.ts`
   (`test: { setupFiles: ["./vitest.setup.ts"], environment: "jsdom" }`).

3. **Add `lib/capsule-format.ts`** with the two helpers in §4.2, plus
   `lib/__tests__/capsule-format.test.ts` covering:
   - `formatUnlockDate` returns a non-empty string for a known ISO date
     (avoid pinning to a specific locale string — the test runner's
     locale varies; assert with a regex or `expect(value).toContain("…")`
     using parts that are locale-stable, e.g. the year).
   - `formatCountdown`:
     - `0 ms` → `"ready now"`
     - `-1 ms` → `"ready now"`
     - `45 * 1000` → `"45s"`
     - `(2 * 60 + 5) * 1000` → `"2m 5s"`
     - `(3 * 3600 + 7 * 60) * 1000` → `"3h 7m"`
     - `((2 * 24 + 4) * 3600) * 1000` → `"2d 4h"`

4. **Add the two presentational components** (`CapsuleRow`,
   `EmptyState`) per §4.4 and §4.5.

5. **Add the page** `app/capsules/page.tsx` per §4.3.

6. **Add the page test** `app/capsules/__tests__/page.test.tsx`:

   - Setup: use Vitest's `jsdom` environment so `localStorage` is real;
     `beforeEach(() => localStorage.clear())`.
   - "renders 3 capsules in createdAt-desc order":
     - Seed `localStorage[STORAGE_KEY]` directly with a JSON array of
       three capsules whose `createdAt` is `2026-01-01T…`,
       `2026-02-01T…`, `2026-03-01T…` and whose `unlockAt` is split
       (one in the past, two in the future) so both pill states render.
     - `render(<CapsulesPage />)`, then `await screen.findByText(...)`
       on the first row's title to wait through the `useEffect`.
     - Assert the rendered titles appear in March → February → January
       order (use `screen.getAllByRole("link")` filtered by title text,
       or `within(list).getAllByRole("listitem")` and read text content
       in order).
     - Assert one row shows "Unlocked" and two show "Locked".
   - "renders empty state when none":
     - Do not seed localStorage.
     - `render(<CapsulesPage />)`, `await screen.findByText("No capsules yet")`.
     - Assert the CTA link points to `/capsules/new`.

7. **Lint + build sanity check.** `npm run lint` and `npm run build`
   must pass green.

## 6. Validation strategy

- `npm run test` — all of: #25's restored 11 tests, the new
  `capsule-format` unit tests, and the new page tests pass.
- `npm run build` — Next.js builds with no warnings other than pre-
  existing ones.
- `npm run lint` — clean.
- Manual (out of CI, optional): `npm run dev`, open `/capsules` in a
  fresh browser profile (no storage). Expect empty state. Then in
  DevTools console: `localStorage.setItem("orchestra.capsules", JSON.stringify([...]))` with three rows and reload. Expect them rendered in
  desc order with the correct pills.

## 7. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| `lib/capsule.ts` was reverted for a real reason we don't know. | Restoring from the same commit reproduces the reviewed code byte-for-byte. If the revert reason surfaces later, that is a problem for #25, not #27 — and is then fixable in one place. The implementing engineer should grep recent PR review comments for `#25` / `#30` / `#31` before restoring; if a concrete objection is recorded, raise it on the PR. |
| Hydration mismatch from reading `localStorage` during render. | The plan loads the list inside `useEffect` and starts with `items=null` so the first paint is identical on server and client. Do not move the read into the render body. |
| Locale-sensitive assertions in tests. | Helper-level test asserts only locale-stable substrings (e.g. the year); the page test asserts on capsule titles and pill text, never on the formatted date string itself. |
| Listing performance with many rows. | Out of scope. Pagination is issue #43-ish (search) / future work. This PR sorts once on mount and renders all rows. |
| `crypto.randomUUID()` in jsdom 29. | Already present and used by the reverted #25 tests; covered by the restored config. |
| `aria-current="page"` in the header underline-styles "All capsules" while on `/capsules`. | Already implemented in `components/Header.tsx`; no work needed, but verify visually in step 7 of §5. |

## 8. Success criteria

- `/capsules` renders without errors on a fresh browser profile.
- With three capsules in `localStorage`, all three render, in
  `createdAt`-descending order, each with a title, ≤120-char preview
  with ellipsis on overflow, a locale-formatted unlock date, a
  Locked/Unlocked pill matching `isUnlocked()`, and (for locked rows
  only) a countdown chip whose format matches §4.2.
- With no capsules, the empty-state card renders with the
  `/capsules/new` CTA.
- Clicking a row navigates to `/capsules/${id}` (404 until #29 lands —
  expected).
- `npm run test`, `npm run lint`, `npm run build` all pass.
- No new runtime dependencies in `dependencies` (test infra goes in
  `devDependencies` only).
- Out-of-scope items from §2.5 are absent from the diff.
