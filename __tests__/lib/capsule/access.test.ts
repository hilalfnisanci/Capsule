import { describe, it, expect } from "vitest";
import { CapsuleStatus, CapsuleVisibility } from "@prisma/client";
import {
  canRead,
  canViewContent,
  canUpdate,
  canDelete,
  canShare,
  isEligibleToOpen,
  isValidOpenDate,
} from "@/lib/capsule/access";
import type { Capsule, CapsuleShare } from "@prisma/client";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const OWNER = "user-owner";
const OTHER = "user-other";
const INVITED = "user-invited";

function makeCapsule(overrides: Partial<Capsule> = {}): Capsule {
  const base = new Date("2025-01-01T00:00:00Z");
  return {
    id: "capsule-1",
    title: "My Capsule",
    description: null,
    userId: OWNER,
    status: CapsuleStatus.LOCKED,
    visibility: CapsuleVisibility.PRIVATE,
    openDate: new Date("2030-01-01T00:00:00Z"),
    openedAt: null,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

function makeShare(userId: string): CapsuleShare {
  return {
    id: "share-1",
    capsuleId: "capsule-1",
    userId,
    invitedAt: new Date("2025-01-01T00:00:00Z"),
  };
}

// ------------------------------------------------------------------
// canRead
// ------------------------------------------------------------------

describe("canRead", () => {
  it("owner can read their private capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.PRIVATE });
    expect(canRead({ ...capsule, sharedWith: [] }, OWNER)).toBe(true);
  });

  it("other user cannot read a private capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.PRIVATE });
    expect(canRead({ ...capsule, sharedWith: [] }, OTHER)).toBe(false);
  });

  it("unauthenticated user cannot read a private capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.PRIVATE });
    expect(canRead({ ...capsule, sharedWith: [] }, null)).toBe(false);
  });

  it("anyone can read a public capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.PUBLIC });
    expect(canRead({ ...capsule, sharedWith: [] }, null)).toBe(true);
    expect(canRead({ ...capsule, sharedWith: [] }, OTHER)).toBe(true);
  });

  it("invited user can read a shared capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.SHARED });
    expect(
      canRead({ ...capsule, sharedWith: [makeShare(INVITED)] }, INVITED),
    ).toBe(true);
  });

  it("non-invited user cannot read a shared capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.SHARED });
    expect(
      canRead({ ...capsule, sharedWith: [makeShare(INVITED)] }, OTHER),
    ).toBe(false);
  });

  it("unauthenticated user cannot read a shared capsule", () => {
    const capsule = makeCapsule({ visibility: CapsuleVisibility.SHARED });
    expect(
      canRead({ ...capsule, sharedWith: [makeShare(INVITED)] }, null),
    ).toBe(false);
  });

  it("owner can always read their capsule regardless of visibility", () => {
    for (const visibility of [
      CapsuleVisibility.PRIVATE,
      CapsuleVisibility.SHARED,
      CapsuleVisibility.PUBLIC,
    ]) {
      const capsule = makeCapsule({ visibility });
      expect(canRead({ ...capsule, sharedWith: [] }, OWNER)).toBe(true);
    }
  });
});

// ------------------------------------------------------------------
// canViewContent
// ------------------------------------------------------------------

describe("canViewContent", () => {
  it("owner can view content of their locked capsule", () => {
    const capsule = makeCapsule({ status: CapsuleStatus.LOCKED });
    expect(canViewContent({ ...capsule, sharedWith: [] }, OWNER)).toBe(true);
  });

  it("invited user cannot view content of a locked shared capsule", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.LOCKED,
      visibility: CapsuleVisibility.SHARED,
    });
    expect(
      canViewContent({ ...capsule, sharedWith: [makeShare(INVITED)] }, INVITED),
    ).toBe(false);
  });

  it("invited user can view content of an opened shared capsule", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      visibility: CapsuleVisibility.SHARED,
      openedAt: new Date(),
    });
    expect(
      canViewContent({ ...capsule, sharedWith: [makeShare(INVITED)] }, INVITED),
    ).toBe(true);
  });

  it("public opened capsule is viewable by anyone including unauthenticated", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      visibility: CapsuleVisibility.PUBLIC,
      openedAt: new Date(),
    });
    expect(canViewContent({ ...capsule, sharedWith: [] }, null)).toBe(true);
    expect(canViewContent({ ...capsule, sharedWith: [] }, OTHER)).toBe(true);
  });

  it("public locked capsule content is NOT viewable by non-owner", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.LOCKED,
      visibility: CapsuleVisibility.PUBLIC,
    });
    expect(canViewContent({ ...capsule, sharedWith: [] }, OTHER)).toBe(false);
    expect(canViewContent({ ...capsule, sharedWith: [] }, null)).toBe(false);
  });

  it("returns false for user without read access regardless of status", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      visibility: CapsuleVisibility.PRIVATE,
    });
    expect(canViewContent({ ...capsule, sharedWith: [] }, OTHER)).toBe(false);
  });
});

// ------------------------------------------------------------------
// canUpdate
// ------------------------------------------------------------------

describe("canUpdate", () => {
  it("owner can update a locked capsule", () => {
    const capsule = makeCapsule({ status: CapsuleStatus.LOCKED });
    expect(canUpdate(capsule, OWNER)).toBe(true);
  });

  it("owner cannot update an opened capsule", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      openedAt: new Date(),
    });
    expect(canUpdate(capsule, OWNER)).toBe(false);
  });

  it("non-owner cannot update a capsule", () => {
    const capsule = makeCapsule({ status: CapsuleStatus.LOCKED });
    expect(canUpdate(capsule, OTHER)).toBe(false);
  });

  it("non-owner cannot update an opened capsule", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      openedAt: new Date(),
    });
    expect(canUpdate(capsule, OTHER)).toBe(false);
  });
});

// ------------------------------------------------------------------
// canDelete
// ------------------------------------------------------------------

describe("canDelete", () => {
  it("owner can delete a locked capsule", () => {
    expect(canDelete(makeCapsule({ status: CapsuleStatus.LOCKED }), OWNER)).toBe(true);
  });

  it("owner can delete an opened capsule", () => {
    expect(
      canDelete(makeCapsule({ status: CapsuleStatus.OPENED }), OWNER),
    ).toBe(true);
  });

  it("non-owner cannot delete a capsule", () => {
    expect(canDelete(makeCapsule(), OTHER)).toBe(false);
  });
});

// ------------------------------------------------------------------
// canShare
// ------------------------------------------------------------------

describe("canShare", () => {
  it("owner can share their capsule", () => {
    expect(canShare(makeCapsule(), OWNER)).toBe(true);
  });

  it("non-owner cannot share a capsule", () => {
    expect(canShare(makeCapsule(), OTHER)).toBe(false);
  });
});

// ------------------------------------------------------------------
// isEligibleToOpen
// ------------------------------------------------------------------

describe("isEligibleToOpen", () => {
  it("locked capsule past open date is eligible", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.LOCKED,
      openDate: new Date("2020-01-01"),
    });
    expect(isEligibleToOpen(capsule)).toBe(true);
  });

  it("locked capsule before open date is not eligible", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.LOCKED,
      openDate: new Date("2099-01-01"),
    });
    expect(isEligibleToOpen(capsule)).toBe(false);
  });

  it("already opened capsule is not eligible", () => {
    const capsule = makeCapsule({
      status: CapsuleStatus.OPENED,
      openDate: new Date("2020-01-01"),
      openedAt: new Date(),
    });
    expect(isEligibleToOpen(capsule)).toBe(false);
  });

  it("open date equal to now is eligible", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    const capsule = makeCapsule({
      status: CapsuleStatus.LOCKED,
      openDate: now,
    });
    expect(isEligibleToOpen(capsule, now)).toBe(true);
  });
});

// ------------------------------------------------------------------
// isValidOpenDate
// ------------------------------------------------------------------

describe("isValidOpenDate", () => {
  it("future date is valid", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const future = new Date("2025-06-01T00:00:00Z");
    expect(isValidOpenDate(future, now)).toBe(true);
  });

  it("past date is invalid", () => {
    const now = new Date("2025-06-01T00:00:00Z");
    const past = new Date("2025-01-01T00:00:00Z");
    expect(isValidOpenDate(past, now)).toBe(false);
  });

  it("same instant is invalid (must be strictly future)", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(isValidOpenDate(now, now)).toBe(false);
  });
});
