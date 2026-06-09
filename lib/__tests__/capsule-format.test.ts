import { describe, expect, it } from "vitest";
import { formatCountdown, formatUnlockDate } from "../capsule-format";

describe("formatUnlockDate", () => {
  it("returns a non-empty string including the year for a known ISO date", () => {
    const out = formatUnlockDate("2030-06-15T14:30:00.000Z");
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("2030");
  });
});

describe("formatCountdown", () => {
  it("returns 'ready now' at zero diff", () => {
    expect(formatCountdown(0)).toBe("ready now");
  });

  it("returns 'ready now' for negative diff", () => {
    expect(formatCountdown(-1)).toBe("ready now");
  });

  it("formats sub-minute as seconds", () => {
    expect(formatCountdown(45 * 1000)).toBe("45s");
  });

  it("formats minutes-and-seconds", () => {
    expect(formatCountdown((2 * 60 + 5) * 1000)).toBe("2m 5s");
  });

  it("formats hours-and-minutes", () => {
    expect(formatCountdown((3 * 3600 + 7 * 60) * 1000)).toBe("3h 7m");
  });

  it("formats days-and-hours", () => {
    expect(formatCountdown((2 * 24 + 4) * 3600 * 1000)).toBe("2d 4h");
  });
});
