# Implementation Plan — App layout shell with header and nav (#26)

## 1. Summary

Replace the bare Next.js scaffold in `app/layout.tsx` with a real
application shell. Introduce a top `<Header />` (brand on the left,
two nav links on the right with active-route highlighting), wrap
page children in a `<main>` container with a sensible max width,
and reduce `app/page.tsx` from a full-page centered hero to a small
homepage section with a single "Start a capsule" CTA.

Tailwind only. No new runtime dependencies. Vitest + Testing Library
are introduced as **dev** dependencies because the issue requires
component tests for `<Header />` and the project does not yet have
a test runner. (See §6 for the exact dev-dep delta and §10 for the
risk if the reviewer wants tests deferred.)

Closes #26.

## 2. Scope and Assumptions

In scope:

- New file `components/Header.tsx` (client component).
- Rewrite of `app/layout.tsx` to render `<Header />` and a `<main>`
  container above `{children}`.
- Rewrite of `app/page.tsx` so it is no longer a full-viewport
  centered hero — becomes a thin homepage section with a CTA link.
- Vitest + Testing Library wiring sufficient to run a single
  `components/Header.test.tsx`.
- Minor `app/globals.css` tweak (drop the `min-h-screen`-style body
  reset if it conflicts) — see §5.4.

Out of scope (explicit per issue):

- Dark/light theme toggle.
- Mobile drawer / hamburger nav.
- Footer.
- Auth-related links or user menu.
- The actual `/capsules` and `/capsules/new` routes (links target
  them, but the pages themselves are separate issues).

Assumptions (flagged so a reviewer can correct):

- **[ASSUMED]** The two target routes `/capsules` and `/capsules/new`
  do not yet exist. The header should still link to them — Next.js
  will render its built-in 404 if a user clicks before those pages
  land. This is acceptable for the shell PR and matches the issue's
  framing ("upcoming list/new/detail pages").
- **[ASSUMED]** Active-link detection uses `next/navigation`'s
  `usePathname()`. This forces `<Header />` to be a client component
  (`"use client"` directive at the top of the file). That is the
  conventional Next.js 15 App Router pattern and is preferred over
  threading the path through props from a server layout.
- **[ASSUMED]** No design system / shadcn is in use yet — the project
  is the post-scaffold baseline. Styling stays in Tailwind utility
  classes inline on the elements; no extraction to a `ui/` folder.
- **[ASSUMED]** Vitest is acceptable as the test runner. The issue
  text explicitly says "Vitest + Testing Library", so this is
  effectively confirmed.

## 3. Affected Areas (file map)

| Path | Change |
| --- | --- |
| `components/Header.tsx` | **new** — the header component |
| `components/Header.test.tsx` | **new** — Vitest + RTL tests |
| `app/layout.tsx` | **edit** — render header + main wrapper |
| `app/page.tsx` | **edit** — shrink hero to homepage section |
| `app/globals.css` | **edit** (small) — remove body font override that fights Tailwind defaults if needed; keep CSS variables |
| `package.json` | **edit** — add `test` / `test:run` scripts and dev deps |
| `vitest.config.ts` | **new** — jsdom env, React plugin, `@/*` alias |
| `vitest.setup.ts` | **new** — `@testing-library/jest-dom` import |
| `tsconfig.json` | **edit (optional)** — add `"types": ["vitest/globals"]` if we choose `globals: true`. See §5.6 |
| `eslint.config.mjs` | unchanged (existing config already covers `components/`) |

No backend, no database, no API contract. Pure UI.

## 4. Component contract — `<Header />`

This is the contract subsequent stages (and the tests) will rely
on. Pin it.

**File:** `components/Header.tsx`
**Directive:** `"use client"` at the top of the file.
**Default export:** `Header` (no props).

**Rendered structure (approximate, classes are guidance):**

```tsx
<header className="border-b border-gray-200 dark:border-gray-800">
  <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
    <Link href="/" className="font-semibold text-lg">
      Capsule
    </Link>
    <nav aria-label="Primary">
      <ul className="flex items-center gap-4">
        <li>
          <Link
            href="/capsules/new"
            aria-current={isActive("/capsules/new") ? "page" : undefined}
            className={navLinkClass(isActive("/capsules/new"))}
          >
            New capsule
          </Link>
        </li>
        <li>
          <Link
            href="/capsules"
            aria-current={isActive("/capsules") ? "page" : undefined}
            className={navLinkClass(isActive("/capsules"))}
          >
            All capsules
          </Link>
        </li>
      </ul>
    </nav>
  </div>
</header>
```

**Active-route rule (pin this — tests assert it):**

- `isActive(href)` is `true` when `pathname === href` OR
  (`href !== "/"` AND `pathname.startsWith(href + "/")`).
- This guarantees `/capsules` matches itself **but not**
  `/capsules/new` (because `/capsules/new`.startsWith would
  apply the prefix rule with a trailing slash, so `/capsules/new`
  does NOT make `/capsules` active — verify this in tests).
- `/` (the brand link) is intentionally **not** treated as an
  active nav target. The brand never gets `aria-current` regardless
  of route.

**Active styling (visible marker):**

- Inactive: `text-gray-600 hover:text-foreground`.
- Active: `text-foreground font-medium underline underline-offset-4`.
- The exact classes are not part of the contract — the test asserts
  the active link has `aria-current="page"` and the inactive one
  does not. That is the stable signal.

**Accessibility:**

- `<nav aria-label="Primary">` so the nav has a discoverable name.
- Active link uses `aria-current="page"` (this is what the tests
  assert; using a class only would couple the test to styling).
- Brand is a real `<Link>`, not a `<div>` with `onClick`.

## 5. Implementation Steps (ordered)

### 5.1 Install Vitest + RTL dev dependencies

In `package.json` `devDependencies` add:

- `vitest`
- `@vitejs/plugin-react`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event` *(optional; not strictly needed for
  the assertions in §7, but cheap to include for future use)*

Pick versions compatible with React 19 / Next 15:

- `vitest` ≥ 2.1
- `@testing-library/react` ≥ 16 (React 19 support)
- `@testing-library/jest-dom` ≥ 6.6

Pin via `npm install -D ...` (do not hand-edit lockfile).

Add scripts to `package.json`:

```json
"test": "vitest",
"test:run": "vitest run"
```

### 5.2 Add `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

`globals: true` lets the test file use `describe/it/expect` without
imports. (If the reviewer prefers explicit imports, drop `globals`
and import from `vitest` in the test file.)

### 5.3 Add `vitest.setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

### 5.4 Adjust `app/globals.css`

Remove the `font-family: Arial, Helvetica, sans-serif;` override on
`body` — it is leftover scaffold styling that will visually fight
the new header. Keep the CSS variables and the `color` / `background`
on body. Net diff: delete one line.

If the reviewer prefers to leave globals untouched, this is an
isolated stylistic call and can be skipped without affecting the
contract.

### 5.5 Build `components/Header.tsx`

Implement per §4. Notes:

- First line must be `"use client";`.
- Import `Link` from `next/link`, `usePathname` from
  `next/navigation`.
- Keep all class names inline; do not introduce a `cn()` helper.
- Do not memoize, do not add `useMemo` for the predicate — it is
  one cheap comparison.

### 5.6 Edit `app/layout.tsx`

Replace the body with:

```tsx
<body className="min-h-screen flex flex-col">
  <Header />
  <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
    {children}
  </main>
</body>
```

Keep the existing `metadata` export and `<html lang="en">`. Import
`Header` from `@/components/Header`.

### 5.7 Edit `app/page.tsx`

Rewrite to a thin section (no full-viewport centering, no `<main>`
inside — `<main>` is now in the layout):

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <section className="py-12">
      <h1 className="text-3xl font-bold tracking-tight">Capsule</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        Capture moments. Revisit memories.
      </p>
      <Link
        href="/capsules/new"
        className="mt-6 inline-block rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
      >
        Start a capsule
      </Link>
    </section>
  );
}
```

The exact classes / button styling are not part of the contract —
the only hard requirements are: (a) it is no longer full-screen
centered, (b) the CTA is a `<Link href="/capsules/new">`, (c) text
content includes the phrase "Start a capsule".

### 5.8 Write `components/Header.test.tsx`

See §7 for the cases. Mock `next/navigation`'s `usePathname` per
test rather than wrapping in a real router — Next does not ship
a test router and RTL has no built-in App Router provider.

```ts
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));
```

Where `pathname` is set per `describe` block (or use
`vi.doMock` / a controllable variable; see §7 for the chosen
approach).

### 5.9 Run the gates

In order:

1. `npm run lint` — must be clean.
2. `npx tsc --noEmit` — must be clean.
3. `npm run test:run` — all `Header` cases pass.
4. `npm run build` — production build succeeds (catches a few
   App Router mistakes that don't show up in dev).

Do not skip step 4. The "client component in a server layout"
combination is exactly the kind of thing that builds-but-then-
breaks-prod-render if mis-wired (e.g. forgetting `"use client"`).

## 6. Dependency delta

**Added (dev only):**

- `vitest`
- `@vitejs/plugin-react`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`

**Added (dev, optional):**

- `@testing-library/user-event`

**Added (production):** none. The issue's "no new dependencies"
constraint is interpreted as no new **runtime** dependencies — a
test runner is required to satisfy the test deliverable. Flagging
explicitly so the reviewer can challenge if the intent was stricter.

## 7. Test cases (`components/Header.test.tsx`)

All four cases are required by the issue ("renders brand, both
links, marks active route correctly"). Concretely:

1. **Renders the brand mark linking to `/`.**
   - Pathname: `/`.
   - Assert: `getByRole("link", { name: /capsule/i })` exists and
     has `href="/"`.

2. **Renders both nav links with the right hrefs.**
   - Pathname: `/`.
   - Assert: `getByRole("link", { name: /new capsule/i })` →
     `href="/capsules/new"`.
   - Assert: `getByRole("link", { name: /all capsules/i })` →
     `href="/capsules"`.

3. **Marks `/capsules/new` as active on the new-capsule route.**
   - Pathname: `/capsules/new`.
   - Assert: the "New capsule" link has `aria-current="page"`.
   - Assert: the "All capsules" link does **not** have
     `aria-current`.

4. **Marks `/capsules` as active on the list route, but not on
   `/capsules/new`.**
   - Sub-case 4a — pathname `/capsules`:
     - "All capsules" → `aria-current="page"`.
     - "New capsule" → no `aria-current`.
   - Sub-case 4b — pathname `/capsules/new`:
     - "All capsules" → no `aria-current` (this is the pin from
       §4 — `/capsules/new` must not light up `/capsules`).
     - This sub-case overlaps case 3; can be folded together.

**Mock strategy for `usePathname` (concrete):**

```ts
import { vi } from "vitest";

const pathnameRef = { current: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

// Per test:
pathnameRef.current = "/capsules/new";
render(<Header />);
```

Using a mutable ref object keeps the mock declaration at module
scope (required by Vitest hoisting) while letting each test set
the path before `render`.

## 8. Validation Strategy

| Gate | Command | Pass criteria |
| --- | --- | --- |
| Lint | `npm run lint` | exit 0 |
| Type check | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm run test:run` | all `Header` cases green |
| Build | `npm run build` | exit 0; both routes (`/` and the new layout) compile |
| Manual sanity | `npm run dev` then visit `/` | header visible; CTA links to `/capsules/new` (404 is acceptable target since that page does not yet exist) |

The manual step is optional and only matters if the reviewer
wants visual confirmation; CI gates plus the tests are sufficient
for correctness.

## 9. Success Criteria (verifier-grade)

A reviewer can answer **yes** to all of:

- `components/Header.tsx` exists, starts with `"use client";`,
  default-exports a component, and renders:
  - exactly one `<header>` element,
  - a single brand link to `/` with visible text "Capsule",
  - exactly two nav links with the hrefs and labels from §4.
- `app/layout.tsx` renders `<Header />` immediately inside `<body>`
  and wraps `{children}` in a `<main>` that has a max-width class
  (`max-w-5xl` or similar) and horizontal centering.
- `app/page.tsx` no longer uses `min-h-screen` / full-viewport
  centering and contains a `<Link href="/capsules/new">` whose
  text includes "Start a capsule".
- `components/Header.test.tsx` runs under `npm run test:run` and
  all four cases from §7 pass.
- `npm run build` and `npm run lint` and `npx tsc --noEmit` all
  pass.
- No new runtime dependencies in `package.json` `dependencies`.

## 10. Risks and Mitigations

- **Risk: `"use client"` forgotten.** `usePathname()` throws at
  render time when called in a server component. *Mitigation:* the
  `npm run build` gate in §5.9 catches this; the test also catches
  it because Vitest will fail to import the file if the mock is
  wrong.
- **Risk: Active-link rule lights up `/capsules` on `/capsules/new`.**
  This is the classic `startsWith` trap. *Mitigation:* the rule in
  §4 uses `startsWith(href + "/")` (note trailing slash) and
  excludes `/` from the prefix rule. Test case 4b pins the
  behavior — if a future refactor breaks it, the test fails.
- **Risk: Adding test deps is rejected as scope creep.** The issue
  text explicitly asks for Vitest + RTL tests, so this is in scope.
  *Mitigation:* dependencies are dev-only and called out in §6 for
  reviewer visibility. If they must be a separate PR, the Header
  itself plus the layout/page changes can ship first and tests
  follow — but that violates the issue's deliverables.
- **Risk: Tailwind classes for the active state are not visible
  enough.** "Visually marked" is subjective. *Mitigation:* the
  default in §4 uses both `font-medium` and `underline` so the
  marker is robust to color theme. The contract asserts the
  accessible signal (`aria-current="page"`), not the classes — so
  styling can be tweaked later without breaking tests.
- **Risk: `/` route brand link is treated as "active" by an
  over-eager rule.** *Mitigation:* explicit guard in §4 (`href !== "/"`
  before the prefix branch). Brand link does not carry an
  `aria-current` ever; nav-link logic is the only path that sets it.
- **Risk: Linting catches an unused `Image` import** (the scaffold
  may have had one). *Mitigation:* fully rewrite `app/page.tsx`
  per §5.7 rather than editing in place; the rewrite has only the
  imports it uses.

## 11. Out of scope for this PR (explicit deferrals)

- Theme toggle / dark mode UI (CSS variables already handle
  prefers-color-scheme; no toggle).
- Mobile breakpoint navigation (drawer / hamburger). The desktop
  layout will simply collapse awkwardly on narrow screens. Tracked
  separately.
- Footer.
- The `/capsules` and `/capsules/new` page implementations — links
  resolve to Next's 404 until those issues land.
- Auth surfaces.
- Any global error / loading boundaries on the layout.

---

Once this plan is approved, the follow-up implementation stage
should be able to execute §5 in order without re-investigating the
codebase. The contract in §4 plus the test cases in §7 are the
verification surface.
