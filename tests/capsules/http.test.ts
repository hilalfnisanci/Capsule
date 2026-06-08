import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterReadableCapsules,
  parseCapsuleCreateBody,
  toCapsuleResponse,
} from "@/lib/capsules/http";
import { createCapsuleRecord, openCapsule } from "@/lib/capsules/model";

const now = new Date("2026-06-08T12:00:00.000Z");
const future = new Date("2026-06-09T12:00:00.000Z");
const openedAt = new Date("2026-06-09T12:00:01.000Z");

function createTestCapsule(overrides = {}, id = "capsule-1") {
  return createCapsuleRecord(
    id,
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

describe("capsule HTTP helpers", () => {
  it("parses create payload fields used by the domain model", () => {
    const input = parseCapsuleCreateBody(
      {
        title: " Future note ",
        body: " Remember this. ",
        openAt: future.toISOString(),
        visibility: "public",
        mediaCount: 2,
        mediaTotalBytes: 1024,
      },
      "user-1",
    );

    assert.equal(input.ownerId, "user-1");
    assert.equal(input.title, " Future note ");
    assert.equal(input.body, " Remember this. ");
    assert.equal(input.openAt.toISOString(), future.toISOString());
    assert.equal(input.visibility, "public");
    assert.equal(input.mediaCount, 2);
    assert.equal(input.mediaTotalBytes, 1024);
  });

  it("passes invalid visibility and media metadata through for validation", () => {
    const input = parseCapsuleCreateBody(
      {
        title: "Future note",
        body: "Remember this.",
        openAt: future.toISOString(),
        visibility: "shared",
        mediaCount: "2",
        mediaTotalBytes: "1024",
      },
      "user-1",
    );

    assert.equal(input.visibility, "shared");
    assert.equal(Number.isNaN(input.mediaCount), true);
    assert.equal(Number.isNaN(input.mediaTotalBytes), true);
  });

  it("hides content while locked and includes it only when readable", () => {
    const locked = createTestCapsule({ visibility: "public" });
    const openedPublic = openCapsule(locked, { requesterId: "user-1", now: openedAt });
    const openedPrivate = openCapsule(createTestCapsule(), { requesterId: "user-1", now: openedAt });

    assert.equal("body" in toCapsuleResponse(locked, "user-1", now), false);
    assert.equal(toCapsuleResponse(openedPublic, null, openedAt).body, "Remember this.");
    assert.equal("body" in toCapsuleResponse(openedPrivate, "user-2", openedAt), false);
    assert.equal(toCapsuleResponse(openedPrivate, "user-1", openedAt).body, "Remember this.");
  });

  it("filters readable capsule metadata by owner, visibility, and opened state", () => {
    const lockedPublic = createTestCapsule({ visibility: "public" }, "locked-public");
    const openedPublic = openCapsule(createTestCapsule({ visibility: "public" }, "opened-public"), {
      requesterId: "user-1",
      now: openedAt,
    });
    const openedPrivate = openCapsule(createTestCapsule({}, "opened-private"), {
      requesterId: "user-1",
      now: openedAt,
    });

    assert.deepEqual(
      filterReadableCapsules([lockedPublic, openedPublic, openedPrivate], "user-2").map(
        (capsule) => capsule.id,
      ),
      ["opened-public"],
    );
    assert.deepEqual(
      filterReadableCapsules([lockedPublic, openedPublic, openedPrivate], "user-1").map(
        (capsule) => capsule.id,
      ),
      ["locked-public", "opened-public", "opened-private"],
    );
  });
});
