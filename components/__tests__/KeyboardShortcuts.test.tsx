import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockReset();
  cleanup();
});

describe("KeyboardShortcuts", () => {
  it("navigates to /capsules/new on bare 'n'", () => {
    render(<KeyboardShortcuts />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
    expect(push).toHaveBeenCalledWith("/capsules/new");
  });

  it("does not navigate when an INPUT is the target", () => {
    render(<KeyboardShortcuts />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "n", bubbles: true })
    );
    expect(push).not.toHaveBeenCalled();
    input.remove();
  });
});
