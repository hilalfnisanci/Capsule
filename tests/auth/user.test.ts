import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getAuthenticatedUserId } from "@/lib/auth/user";

const originalNodeEnv = process.env.NODE_ENV;
const originalDevHeaderFlag = process.env.CAPSULE_ENABLE_DEV_USER_HEADER;

function requestWithUserHeader(userId: string) {
  return new Request("http://localhost/api/capsules", {
    headers: { "x-user-id": userId },
  });
}

afterEach(() => {
  process.env["NODE_ENV"] = originalNodeEnv;

  if (originalDevHeaderFlag === undefined) {
    delete process.env.CAPSULE_ENABLE_DEV_USER_HEADER;
  } else {
    process.env.CAPSULE_ENABLE_DEV_USER_HEADER = originalDevHeaderFlag;
  }
});

describe("getAuthenticatedUserId", () => {
  it("does not trust x-user-id by default", () => {
    delete process.env.CAPSULE_ENABLE_DEV_USER_HEADER;

    assert.equal(getAuthenticatedUserId(requestWithUserHeader("user-1")), null);
  });

  it("allows x-user-id only when explicitly enabled outside production", () => {
    process.env["NODE_ENV"] = "development";
    process.env.CAPSULE_ENABLE_DEV_USER_HEADER = "true";

    assert.equal(getAuthenticatedUserId(requestWithUserHeader("user-1")), "user-1");
  });

  it("does not allow x-user-id in production even when the dev flag is set", () => {
    process.env["NODE_ENV"] = "production";
    process.env.CAPSULE_ENABLE_DEV_USER_HEADER = "true";

    assert.equal(getAuthenticatedUserId(requestWithUserHeader("user-1")), null);
  });
});
