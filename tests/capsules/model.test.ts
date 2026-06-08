import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CapsuleAccessError,
  CapsuleValidationError,
  canReadCapsuleContent,
  canReadCapsuleMetadata,
  createCapsuleRecord,
  getCapsuleState,
  openCapsule,
} from "@/lib/capsules/model";

const now = new Date("2026-06-08T12:00:00.000Z");
const future = new Date("2026-06-09T12:00:00.000Z");
const afterFuture = new Date("2026-06-09T12:00:01.000Z");

function createTestCapsule(overrides = {}) {
  return createCapsuleRecord(
    "capsule-1",
    {
      ownerId: "user-1",
      title: "Future note",
      body: "Remember this.",
      openAt: future,
      visibility: "private",
      ...overrides,
    },
    now,
  );
}

describe("capsule model", () => {
  it("creates locked private capsules with validated fields", () => {
    const capsule = createTestCapsule();

    assert.equal(capsule.ownerId, "user-1");
    assert.equal(capsule.visibility, "private");
    assert.equal(capsule.openedAt, null);
    assert.equal(getCapsuleState(capsule), "locked");
    assert.equal(capsule.mediaCount, 0);
    assert.equal(capsule.mediaTotalBytes, 0);
  });

  it("requires openAt to be in the future", () => {
    assert.throws(
      () => createTestCapsule({ openAt: now }),
      (error) => error instanceof CapsuleValidationError && error.message === "openAt must be in the future",
    );
  });

  it("only allows the owner to open a capsule on or after openAt", () => {
    const capsule = createTestCapsule();

    assert.throws(
      () => openCapsule(capsule, { requesterId: "user-1", now }),
      (error) => error instanceof CapsuleAccessError,
    );
    assert.throws(
      () => openCapsule(capsule, { requesterId: "user-2", now: afterFuture }),
      (error) => error instanceof CapsuleAccessError,
    );

    const opened = openCapsule(capsule, { requesterId: "user-1", now: afterFuture });
    assert.equal(getCapsuleState(opened), "opened");
    assert.equal(opened.openedAt?.toISOString(), afterFuture.toISOString());
  });

  it("keeps locked capsule content private even when visibility is public", () => {
    const capsule = createTestCapsule({ visibility: "public" });

    assert.equal(canReadCapsuleMetadata(capsule, { requesterId: "user-2" }), false);
    assert.equal(canReadCapsuleContent(capsule, { requesterId: "user-1" }), false);
    assert.equal(canReadCapsuleContent(capsule, { requesterId: "user-2" }), false);
  });

  it("allows anyone to read opened public capsules and only owners to read opened private capsules", () => {
    const privateCapsule = openCapsule(createTestCapsule(), { requesterId: "user-1", now: afterFuture });
    const publicCapsule = openCapsule(createTestCapsule({ visibility: "public" }), {
      requesterId: "user-1",
      now: afterFuture,
    });

    assert.equal(canReadCapsuleMetadata(privateCapsule, { requesterId: "user-2" }), false);
    assert.equal(canReadCapsuleContent(privateCapsule, { requesterId: "user-2" }), false);
    assert.equal(canReadCapsuleContent(privateCapsule, { requesterId: "user-1" }), true);

    assert.equal(canReadCapsuleMetadata(publicCapsule, { requesterId: "user-2" }), true);
    assert.equal(canReadCapsuleContent(publicCapsule, { requesterId: "user-2" }), true);
    assert.equal(canReadCapsuleContent(publicCapsule, {}), true);
  });
});
