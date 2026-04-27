# Plan: Capsule Data Model and Access Rules (#15)

## Problem Statement

The application has no data layer yet. Before any feature work can proceed, we need a clean, well-constrained schema for the core `Capsule` entity. This schema must define what a capsule is, who owns it, when it unlocks, and who can view it. It also needs to lay the right foundation for future media (images, audio, files) support without requiring schema breaking changes later.

## Proposed Approach

Introduce **Prisma** as the ORM with **PostgreSQL** as the database. Prisma is the idiomatic choice for Next.js + TypeScript projects: it generates fully-typed clients, handles migrations, and has excellent ecosystem support. We will define:

1. A `User` model (minimal, enough to anchor ownership — auth itself is a separate issue)
2. A `Capsule` model with all required fields
3. A `CapsuleMedia` model as a placeholder/stub for future media attachments

All access rules are enforced at the API layer via helper functions co-located with the data access logic.

---

## Technical Design

### ORM & Database

| Choice | Rationale |
|---|---|
| Prisma ORM | First-class TypeScript support, migration tooling, Next.js standard |
| PostgreSQL | Reliable, supports `enum` types natively, required by Prisma in production |
| `prisma/schema.prisma` | Single source of truth for all models |

### Environment Variables to Add (`.env.example`)

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/capsule_db"
```

---

### Data Models

#### `User`

Minimal anchor model. Full auth (passwords, sessions, OAuth) is handled by a future issue.

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  capsules  Capsule[]
}
```

#### `Capsule`

Core entity. All business logic for locking, visibility, and unlock scheduling lives here.

```prisma
enum CapsuleStatus {
  LOCKED    // sealed — content cannot be viewed or changed
  OPENED    // unlocked — content is visible
}

enum Visibility {
  PRIVATE   // only the owner can view
  PUBLIC    // anyone with the link can view
}

model Capsule {
  id          String         @id @default(cuid())
  title       String
  description String?

  // Ownership
  ownerId     String
  owner       User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  // State machine
  status      CapsuleStatus  @default(LOCKED)
  visibility  Visibility     @default(PRIVATE)

  // Unlock scheduling
  openDate    DateTime       // the date/time the capsule is allowed to be opened

  // Future media support
  media       CapsuleMedia[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([ownerId])
  @@index([openDate])
  @@index([status])
}
```

**Field semantics:**

| Field | Meaning |
|---|---|
| `status: LOCKED` | Default. Content is sealed. Cannot be read by anyone, including the owner, until `openDate` is reached. |
| `status: OPENED` | Content is visible. Transition from LOCKED → OPENED happens automatically when `openDate <= now()` or manually by the owner if `openDate` has passed. |
| `visibility: PRIVATE` | Only `ownerId` can see the capsule and its contents. |
| `visibility: PUBLIC` | Anyone with the capsule `id` can read it, but only when `status = OPENED`. A PUBLIC + LOCKED capsule is still unreadable. |
| `openDate` | Required. Must be set in the future at creation time. Controls when the capsule transitions from LOCKED to OPENED. |

#### `CapsuleMedia` (stub for future use)

This model is introduced now to avoid a breaking migration later. No media upload logic is implemented in this issue.

```prisma
enum MediaType {
  IMAGE
  AUDIO
  VIDEO
  FILE
}

model CapsuleMedia {
  id         String     @id @default(cuid())
  capsuleId  String
  capsule    Capsule    @relation(fields: [capsuleId], references: [id], onDelete: Cascade)

  type       MediaType
  url        String     // storage URL (e.g. S3 presigned or CDN URL)
  mimeType   String     // e.g. "image/jpeg"
  sizeBytes  Int?

  createdAt  DateTime   @default(now())

  @@index([capsuleId])
}
```

---

### Access Rules

All rules are enforced in a dedicated module at `lib/capsule-access.ts`. API routes must call these helpers — they never write raw Prisma queries without going through the access layer.

#### Rule definitions

```typescript
// lib/capsule-access.ts

import { Capsule, CapsuleStatus, Visibility } from "@prisma/client";

export type AccessContext = {
  userId: string | null; // null = unauthenticated request
};

/**
 * Can the requesting user VIEW the capsule content?
 * Conditions:
 *   1. Capsule must be OPENED (not LOCKED regardless of who is asking)
 *   2. If PRIVATE: requester must be the owner
 *   3. If PUBLIC: any authenticated or unauthenticated request is allowed
 */
export function canViewCapsule(
  capsule: Pick<Capsule, "ownerId" | "status" | "visibility">,
  ctx: AccessContext
): boolean {
  if (capsule.status === CapsuleStatus.LOCKED) return false;
  if (capsule.visibility === Visibility.PRIVATE) {
    return ctx.userId === capsule.ownerId;
  }
  return true; // PUBLIC + OPENED
}

/**
 * Can the requesting user EDIT (update title, description, openDate)
 * or DELETE the capsule?
 * Only the owner can edit, and only while status is LOCKED.
 * Once opened, capsules are immutable.
 */
export function canEditCapsule(
  capsule: Pick<Capsule, "ownerId" | "status">,
  ctx: AccessContext
): boolean {
  return ctx.userId === capsule.ownerId && capsule.status === CapsuleStatus.LOCKED;
}

/**
 * Can the requesting user attempt to OPEN (unlock) the capsule?
 * Conditions:
 *   1. Must be the owner
 *   2. openDate must be <= now()
 */
export function canOpenCapsule(
  capsule: Pick<Capsule, "ownerId" | "openDate" | "status">,
  ctx: AccessContext
): boolean {
  if (ctx.userId !== capsule.ownerId) return false;
  if (capsule.status === CapsuleStatus.OPENED) return false;
  return new Date() >= capsule.openDate;
}
```

#### Open date behavior

- `openDate` is required at creation and must be a future timestamp (validated server-side).
- The system does **not** automatically flip `status` in the background at `openDate`. Instead, the first read attempt by the owner after `openDate` triggers the transition (lazy unlock). This avoids needing a background job at this stage.
- A future background job (separate issue) can sweep and bulk-open capsules for notifications.

---

## Implementation Steps

These steps are ordered for sequential execution by an engineer.

### Step 1 — Install and initialize Prisma

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

This creates:
- `prisma/schema.prisma`
- `.env` with `DATABASE_URL` placeholder

### Step 2 — Update `.env.example`

Add:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/capsule_db"
```

### Step 3 — Write the Prisma schema

Write the full schema to `prisma/schema.prisma` with:
- `generator client` block
- `datasource db` block
- `User`, `Capsule`, `CapsuleMedia` models
- `CapsuleStatus`, `Visibility`, `MediaType` enums

Use the exact field definitions from the Technical Design section above.

### Step 4 — Create and run the initial migration

```bash
npx prisma migrate dev --name init_capsule_schema
```

This generates `prisma/migrations/TIMESTAMP_init_capsule_schema/migration.sql` and applies it to the local development database.

### Step 5 — Create the Prisma client singleton

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

This prevents multiple client instances during Next.js hot reloads.

### Step 6 — Create the access rules module

Create `lib/capsule-access.ts` with the three helper functions defined in the Technical Design section above: `canViewCapsule`, `canEditCapsule`, `canOpenCapsule`.

### Step 7 — Write unit tests for access rules

Create `lib/__tests__/capsule-access.test.ts` covering all rule permutations (see Testing Strategy below).

### Step 8 — Update `.gitignore`

Ensure `.env` is in `.gitignore` (Next.js default includes this, but verify).

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Create | Single source of truth for all models |
| `prisma/migrations/*/migration.sql` | Auto-generated | Version-controlled DB migration |
| `lib/prisma.ts` | Create | Singleton Prisma client for Next.js |
| `lib/capsule-access.ts` | Create | Access rule helpers |
| `lib/__tests__/capsule-access.test.ts` | Create | Unit tests for access rules |
| `.env.example` | Update | Add `DATABASE_URL` variable |

---

## Testing Strategy

### Unit tests — `lib/__tests__/capsule-access.test.ts`

Use **Jest** (or Vitest — whichever the project uses; check `package.json` — currently neither, add `vitest` as it integrates cleanly with Vite-style Next.js projects).

Test matrix for `canViewCapsule`:

| Status | Visibility | Requester | Expected |
|---|---|---|---|
| LOCKED | PRIVATE | owner | `false` |
| LOCKED | PRIVATE | other | `false` |
| LOCKED | PUBLIC | null | `false` |
| OPENED | PRIVATE | owner | `true` |
| OPENED | PRIVATE | other | `false` |
| OPENED | PUBLIC | owner | `true` |
| OPENED | PUBLIC | other user | `true` |
| OPENED | PUBLIC | null (unauthenticated) | `true` |

Test matrix for `canEditCapsule`:

| Status | Requester | Expected |
|---|---|---|
| LOCKED | owner | `true` |
| LOCKED | other | `false` |
| OPENED | owner | `false` |
| OPENED | other | `false` |

Test matrix for `canOpenCapsule`:

| Status | openDate | Requester | Expected |
|---|---|---|---|
| LOCKED | past | owner | `true` |
| LOCKED | future | owner | `false` |
| LOCKED | past | other | `false` |
| OPENED | past | owner | `false` |

### Integration / migration test

Verify the migration applies cleanly:
```bash
npx prisma migrate dev --name init_capsule_schema
npx prisma validate
npx prisma generate
```

---

## Risks and Open Questions

| Risk | Mitigation |
|---|---|
| No test runner installed yet | Add `vitest` + `@vitest/ui` in this PR |
| Auth is not implemented; `userId` will be null for now | Access helpers accept `userId: string \| null`; all protected routes return 401 until auth is wired |
| Lazy unlock means a briefly-past-openDate capsule may still appear LOCKED to the owner until they make a request | Acceptable for MVP; document behavior in code comment |
| PostgreSQL availability in CI | Add a note in the PR for the team to configure a test DB; can use `prisma migrate dev --skip-seed` with an in-memory alternative later |
| `CapsuleMedia.url` is a plain string | Sufficient for now; a storage abstraction (S3 presigned URLs) is a future concern |
| `User` model has no password/auth fields | Intentional; auth is a separate issue. The model is deliberately minimal |

---

## Success Criteria

- [ ] `prisma/schema.prisma` defines `User`, `Capsule`, `CapsuleMedia` with correct types and relations
- [ ] Migration file is generated and applies without errors
- [ ] `lib/prisma.ts` exports a working singleton client
- [ ] `lib/capsule-access.ts` exports `canViewCapsule`, `canEditCapsule`, `canOpenCapsule`
- [ ] All unit tests in `lib/__tests__/capsule-access.test.ts` pass
- [ ] `LOCKED` capsules are unviewable regardless of visibility setting
- [ ] `PRIVATE` + `OPENED` capsules are only visible to the owner
- [ ] `PUBLIC` + `OPENED` capsules are visible to anyone
- [ ] Only the owner can edit a `LOCKED` capsule; `OPENED` capsules are immutable
- [ ] `openDate` must be in the future at creation time (enforced at the API layer, noted in the schema comment)
- [ ] `.env.example` documents `DATABASE_URL`
