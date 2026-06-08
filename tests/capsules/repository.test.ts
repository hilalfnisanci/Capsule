import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearCapsulesForTests,
  createCapsule,
  getCapsuleById,
  listCapsules,
  markCapsuleOpened,
} from "@/lib/capsules/repository";

const now = new Date("2026-06-08T12:00:00.000Z");
const future = new Date("2026-06-09T12:00:00.000Z");
const openedAt = new Date("2026-06-09T12:00:01.000Z");

afterEach(() => {
  clearCapsulesForTests();
});

function createTestCapsule(ownerId = "user-1") {
  return createCapsule(
    {
      ownerId,
      title: "Future note",
      body: "Remember this.",
      openAt: future,
      visibility: "private",
    },
    now,
  );
}

describe("capsule repository", () => {
  it("stores created capsules and returns newest first", () => {
    const older = createTestCapsule("user-1");
    const newer = createCapsule(
      {
        ownerId: "user-2",
        title: "Later note",
        body: "Remember this too.",
        openAt: future,
        visibility: "public",
      },
      new Date("2026-06-08T12:00:01.000Z"),
    );

    assert.equal(getCapsuleById(older.id)?.id, older.id);
    assert.deepEqual(
      listCapsules().map((capsule) => capsule.id),
      [newer.id, older.id],
    );
  });

  it("marks an existing capsule opened through the domain rules", () => {
    const capsule = createTestCapsule();

    const opened = markCapsuleOpened(capsule.id, "user-1", openedAt);

    assert.equal(opened?.openedAt?.toISOString(), openedAt.toISOString());
    assert.equal(getCapsuleById(capsule.id)?.openedAt?.toISOString(), openedAt.toISOString());
  });

  it("returns null when opening a missing capsule", () => {
    assert.equal(markCapsuleOpened("missing", "user-1", openedAt), null);
  });
});
