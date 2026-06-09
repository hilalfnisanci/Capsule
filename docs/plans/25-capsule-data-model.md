# Implementation Plan — Issue #25: Capsule data model and localStorage CRUD layer

## Summary

Add the foundational client-side data layer for capsules: a `Capsule`
TypeScript type, a small set of pure CRUD functions backed by
`localStorage` under the key `orchestra.capsules`, an `isUnlocked`
helper, and Vitest unit tests. No UI, no routes, no remote storage.

This plan is scoped to **one file** of production code
(`lib/capsule.ts`) plus its co-located tests and the Vitest tooling
needed to run them. It is intentionally small so the list / detail /
new pages built in later issues can layer on top without churn.

## Scope and Assumptions

In scope:

- `lib/capsule.ts` containing the `Capsule` type, the storage key,
  the CRUD functions, and `isUnlocked`.
- Vitest installed as a dev dependency, configured for a `jsdom`-like
  environment (we need `localStorage` and `crypto.randomUUID`).
- A `test` (and `test:watch`) script in `package.json`.
- Unit tests co-located at `lib/capsule.test.ts` covering the four
  cases the issue calls out.

Out of scope (explicitly):

- Any React component, page route, hook, or context.
- Image / audio attachments — `body` is text only for now.
- Remote storage, sync, notifications.
- Migrations / versioning of the stored payload (we ship v1 of the
  shape; a future issue can add a `schemaVersion` field if needed).

Assumptions:

- Node 18+ is available (confirmed by README), so `crypto.randomUUID`
  exists in the test environment as well as in modern browsers.
- The app is Next.js 15 + TS 5 strict + Tailwind 3 (see
  `package.json`, `tsconfig.json`). The `@/*` path alias resolves to
  the repo root, so `lib/capsule.ts` is importable as
  `@/lib/capsule` from anywhere in `app/`.
- We use `jsdom` (not `happy-dom`) because it ships a working
  `localStorage` and `crypto.randomUUID` out of the box and is the
  default most developers expect.
- The stored representation is a single JSON array under one key
  (`orchestra.capsules`). Reads parse the whole array; writes
  replace it. This is fine at the volumes a personal capsule app
  produces and matches the issue's "single key" requirement.

## Affected Areas

| Path | Change |
| --- | --- |
| `lib/capsule.ts` | **New.** Type + storage module + `isUnlocked`. |
| `lib/capsule.test.ts` | **New.** Vitest unit tests. |
| `package.json` | Add `vitest`, `jsdom`, `@vitest/coverage-v8` (optional) to `devDependencies`; add `test` and `test:watch` scripts. |
| `vitest.config.ts` | **New.** Sets `environment: "jsdom"` and the `@/*` alias to match `tsconfig.json`. |
| `tsconfig.json` | Add `"vitest/globals"` to `compilerOptions.types` **only if** we choose the globals style. The plan below uses explicit imports (`import { describe, it, expect } from "vitest"`), so no tsconfig change is needed. |
| `eslint.config.mjs` | No change. The next ESLint config already lints `.ts` files; the new file lives at the repo root and is picked up automatically. |

Nothing under `app/` is touched. The existing scaffold pages remain
unchanged.

## Contract — `lib/capsule.ts`

The implementer must export the following symbols with these exact
signatures. The list page, detail page, and new-capsule page in later
issues will import against this contract, so deviations break them.

```ts
// The persisted shape. ISO strings everywhere — never Date — so
// JSON.stringify round-trips losslessly.
export type Capsule = {
  id: string;          // crypto.randomUUID()
  title: string;
  body: string;
  createdAt: string;   // ISO 8601, UTC, e.g. "2026-06-09T08:01:12.379Z"
  unlockAt: string;    // ISO 8601, UTC
  openedAt: string | null;
};

// Input accepted by createCapsule. The module fills in id, createdAt,
// openedAt. unlockAt is required and must be a valid ISO string; the
// module does not enforce that unlockAt is in the future (the form
// layer will).
export type CreateCapsuleInput = {
  title: string;
  body: string;
  unlockAt: string;
};

export const STORAGE_KEY = "orchestra.capsules";

export function listCapsules(): Capsule[];
export function getCapsule(id: string): Capsule | null;
export function createCapsule(input: CreateCapsuleInput): Capsule;
export function markOpened(id: string): Capsule | null;
export function deleteCapsule(id: string): void;

export function isUnlocked(capsule: Capsule, now?: Date): boolean;
```

Behavioral notes the implementer must honor:

- **`listCapsules`** — reads `localStorage.getItem(STORAGE_KEY)`. If
  the key is absent or the value fails to `JSON.parse`, returns `[]`
  (do not throw — corrupt storage should not brick the app). Returns
  capsules in insertion order; do not sort here. The list page will
  sort for display.
- **`getCapsule(id)`** — returns the capsule with that id, or `null`
  if not found. Does **not** throw on miss.
- **`createCapsule(input)`** — generates `id` via
  `crypto.randomUUID()`, sets `createdAt = new Date().toISOString()`,
  sets `openedAt = null`, persists the new array (existing capsules +
  the new one appended), and returns the created capsule. Must not
  mutate or normalize `unlockAt` — store it as given.
- **`markOpened(id)`** — finds the capsule; if absent, returns
  `null`. If present and `openedAt` is already non-null, returns the
  existing capsule **unchanged** (idempotent — opening twice is not
  an error and must not overwrite the original open timestamp).
  Otherwise sets `openedAt = new Date().toISOString()`, persists, and
  returns the updated capsule. The "unlocked" gate is the caller's
  responsibility; this function does not enforce `isUnlocked`.
- **`deleteCapsule(id)`** — removes the capsule if present; no-op if
  not. Always persists the resulting array.
- **`isUnlocked(capsule, now = new Date())`** — returns
  `now.getTime() >= Date.parse(capsule.unlockAt)`. The boundary is
  **inclusive** — a capsule whose `unlockAt` equals `now` to the
  millisecond is unlocked. The issue's "unlock detection at exact
  boundary" test pins this.

All writes go through a single private helper, e.g.
`writeAll(capsules: Capsule[])`, that does
`localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules))`. Keep
the surface minimal: do not export the helper.

SSR safety: every function that touches `localStorage` must guard
with `typeof window === "undefined"`. The reads return `[]` / `null`
in that case; the writes are no-ops. This lets the module be
imported from Server Components without crashing the build, even
though the issue scopes us to client-side use.

## Test Plan — `lib/capsule.test.ts`

Use explicit Vitest imports
(`import { describe, it, expect, beforeEach } from "vitest"`). Reset
`localStorage` in `beforeEach` so tests are isolated:

```ts
beforeEach(() => {
  localStorage.clear();
});
```

Cases the issue requires, mapped to concrete assertions:

1. **Empty state.** With nothing in storage, `listCapsules()`
   returns `[]` and `getCapsule("anything")` returns `null`. After
   `deleteCapsule("missing")`, no throw and `listCapsules()` is
   still `[]`.
2. **Create-then-list.** `createCapsule({ title, body, unlockAt })`
   returns a capsule whose `id` is a non-empty string, `createdAt`
   parses as a valid Date, `openedAt` is `null`, and `title` /
   `body` / `unlockAt` match the input. `listCapsules()` then
   contains exactly that one capsule, deep-equal to the returned
   value. `getCapsule(returned.id)` returns the same capsule.
3. **ID is unique per call.** Call `createCapsule` 100 times in a
   loop; assert `new Set(ids).size === 100`. This guards against a
   regression where someone caches `randomUUID()` or seeds from
   `Date.now()`.
4. **Unlock detection at exact boundary.** Build a capsule with
   `unlockAt = "2026-06-09T12:00:00.000Z"`. Assert
   `isUnlocked(c, new Date("2026-06-09T11:59:59.999Z"))` is
   `false`, `isUnlocked(c, new Date("2026-06-09T12:00:00.000Z"))`
   is `true`, and `isUnlocked(c, new Date("2026-06-09T12:00:00.001Z"))`
   is `true`.

Additionally (cheap, high-value extras — keep these but do not
expand further):

- **`markOpened` idempotency.** Create a capsule, call `markOpened`
  twice; the second call returns the same `openedAt` as the first.
- **`markOpened` on missing id** returns `null` and does not insert
  a phantom capsule.
- **Corrupt storage.** Set `localStorage.setItem(STORAGE_KEY,
  "not json")`; `listCapsules()` returns `[]` rather than throwing.

## Implementation Steps (ordered)

1. **Tooling.** Install Vitest and jsdom as dev deps:
   `npm install -D vitest jsdom`.
   Add scripts to `package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
2. **Vitest config.** Create `vitest.config.ts` at the repo root:
   ```ts
   import { defineConfig } from "vitest/config";
   import { fileURLToPath } from "node:url";

   export default defineConfig({
     test: {
       environment: "jsdom",
       include: ["**/*.test.ts", "**/*.test.tsx"],
     },
     resolve: {
       alias: {
         "@": fileURLToPath(new URL("./", import.meta.url)),
       },
     },
   });
   ```
   The alias mirrors `tsconfig.json`'s `"@/*": ["./*"]` so imports
   work the same in tests as in app code.
3. **Module.** Create `lib/capsule.ts` implementing the contract
   above. Order inside the file: type aliases → `STORAGE_KEY` →
   private `readAll` / `writeAll` helpers → exported CRUD
   functions → `isUnlocked`. No default export.
4. **Tests.** Create `lib/capsule.test.ts` covering the four
   required cases plus the three extras listed above.
5. **Verify locally.**
   - `npm run test` — all tests green.
   - `npm run lint` — clean.
   - `npm run build` — Next.js build succeeds (sanity check that
     the new file does not break compilation).
6. **Commit and PR.** One commit, message
   `feat(capsule): add data model and localStorage CRUD layer`,
   referencing `Closes #25` in the PR body.

## Validation Strategy

- **Type contract.** `tsc` runs as part of `next build`; that plus
  the strict `tsconfig` confirms the exported signatures match the
  contract.
- **Behavior.** The Vitest suite is the source of truth for runtime
  behavior. The four required cases plus the three extras give us
  coverage of every branch in the module.
- **No regressions.** There is no prior `lib/` code, no prior tests,
  and no UI to break. The risk surface is the tooling addition; the
  `npm run build` step in Implementation Step 5 catches a broken
  Vitest install (e.g. a peer-dep conflict surfacing during
  install).

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| `crypto.randomUUID` missing in some test environment. | Pin Vitest's `environment: "jsdom"`; jsdom 22+ exposes `crypto.randomUUID`. If a CI runner ships an older jsdom, the install in Step 1 will pull a current one. |
| SSR import crashes the build because `localStorage` is undefined. | Every function guards with `typeof window === "undefined"`. The module can be imported from anywhere without side effects. |
| Two tabs writing concurrently overwrite each other. | Out of scope for v1 — a personal capsule app rarely sees concurrent writes. If it becomes a problem, a later issue can add a `storage` event listener; do not pre-build it now. |
| Storing `unlockAt` as a string lets callers pass garbage. | Acceptable for this layer — the form (later issue) validates. `isUnlocked` uses `Date.parse`, which returns `NaN` for garbage; `NaN >= anything` is `false`, so a malformed `unlockAt` stays locked forever rather than crashing. |
| `JSON.parse` on corrupt storage throws. | Wrap the parse in a `try / catch` and return `[]` on failure. Tested. |

## Success Criteria

- `lib/capsule.ts` exports `Capsule`, `CreateCapsuleInput`,
  `STORAGE_KEY`, `listCapsules`, `getCapsule`, `createCapsule`,
  `markOpened`, `deleteCapsule`, and `isUnlocked` with the
  signatures in the Contract section.
- `npm run test` runs Vitest and all tests pass, including the four
  cases the issue calls out.
- `npm run lint` and `npm run build` are clean.
- No files under `app/` or `public/` are modified.
- PR description references `Closes #25`.
