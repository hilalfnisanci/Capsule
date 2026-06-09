import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  createCapsule,
  deleteCapsule,
  getCapsule,
  isUnlocked,
  listCapsules,
  markOpened,
  type Capsule,
} from "./capsule";

beforeEach(() => {
  localStorage.clear();
});

describe("empty state", () => {
  it("returns [] from listCapsules when nothing is stored", () => {
    expect(listCapsules()).toEqual([]);
  });

  it("returns null from getCapsule when nothing is stored", () => {
    expect(getCapsule("anything")).toBeNull();
  });

  it("does not throw when deleting a missing id", () => {
    expect(() => deleteCapsule("missing")).not.toThrow();
    expect(listCapsules()).toEqual([]);
  });
});

describe("create-then-list", () => {
  it("persists a created capsule and returns it from list/get", () => {
    const input = {
      title: "Hello",
      body: "Future me",
      unlockAt: "2030-01-01T00:00:00.000Z",
    };

    const created = createCapsule(input);

    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    expect(created.openedAt).toBeNull();
    expect(created.title).toBe(input.title);
    expect(created.body).toBe(input.body);
    expect(created.unlockAt).toBe(input.unlockAt);

    const list = listCapsules();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(created);
    expect(getCapsule(created.id)).toEqual(created);
  });
});

describe("ids are unique", () => {
  it("generates a unique id per createCapsule call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const c = createCapsule({
        title: `t${i}`,
        body: "b",
        unlockAt: "2030-01-01T00:00:00.000Z",
      });
      ids.add(c.id);
    }
    expect(ids.size).toBe(100);
  });
});

describe("isUnlocked boundary", () => {
  const capsule: Capsule = {
    id: "x",
    title: "t",
    body: "b",
    createdAt: "2026-01-01T00:00:00.000Z",
    unlockAt: "2026-06-09T12:00:00.000Z",
    openedAt: null,
  };

  it("is false one millisecond before unlockAt", () => {
    expect(isUnlocked(capsule, new Date("2026-06-09T11:59:59.999Z"))).toBe(
      false,
    );
  });

  it("is true at the exact unlockAt instant", () => {
    expect(isUnlocked(capsule, new Date("2026-06-09T12:00:00.000Z"))).toBe(
      true,
    );
  });

  it("is true one millisecond after unlockAt", () => {
    expect(isUnlocked(capsule, new Date("2026-06-09T12:00:00.001Z"))).toBe(
      true,
    );
  });
});

describe("markOpened", () => {
  it("is idempotent — second call preserves the original openedAt", () => {
    const created = createCapsule({
      title: "t",
      body: "b",
      unlockAt: "2026-01-01T00:00:00.000Z",
    });

    const first = markOpened(created.id);
    expect(first).not.toBeNull();
    expect(first!.openedAt).not.toBeNull();

    const second = markOpened(created.id);
    expect(second).not.toBeNull();
    expect(second!.openedAt).toBe(first!.openedAt);
  });

  it("returns null for a missing id and does not insert a phantom capsule", () => {
    expect(markOpened("does-not-exist")).toBeNull();
    expect(listCapsules()).toEqual([]);
  });
});

describe("corrupt storage", () => {
  it("returns [] when the stored payload is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    expect(listCapsules()).toEqual([]);
  });
});
