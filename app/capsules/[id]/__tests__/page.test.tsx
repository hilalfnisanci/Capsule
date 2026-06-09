import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, type Capsule } from "@/lib/capsule";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import CapsuleDetailPage from "../page";

function seed(capsules: Capsule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

const LOCKED: Capsule = {
  id: "locked-1",
  title: "Locked Capsule",
  body: "secret-body-should-not-appear",
  createdAt: "2026-01-01T00:00:00.000Z",
  unlockAt: "2999-01-01T00:00:00.000Z",
  openedAt: null,
};

const UNLOCKED_UNOPENED: Capsule = {
  id: "unlocked-1",
  title: "Unlocked Capsule",
  body: "this is the reveal",
  createdAt: "2020-01-01T00:00:00.000Z",
  unlockAt: "2020-06-01T00:00:00.000Z",
  openedAt: null,
};

beforeEach(() => {
  pushMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

function resolvedParams(id: string): Promise<{ id: string }> {
  const value = { id };
  const p = Promise.resolve(value) as Promise<{ id: string }> & {
    status: "fulfilled";
    value: { id: string };
  };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

function renderDetail(id: string) {
  return render(
    <Suspense fallback={null}>
      <CapsuleDetailPage params={resolvedParams(id)} />
    </Suspense>,
  );
}

describe("CapsuleDetailPage", () => {
  it("renders a not-found state with a link back to /capsules when the id is unknown", async () => {
    renderDetail("missing-id");

    await screen.findByText(/capsule not found/i);
    const link = screen.getByRole("link", { name: /back to all capsules/i });
    expect(link).toHaveAttribute("href", "/capsules");
  });

  it("locked: hides the body, shows the countdown and locked hint", async () => {
    seed([LOCKED]);

    renderDetail(LOCKED.id);

    await screen.findByText(LOCKED.title);
    expect(
      screen.queryByText(LOCKED.body),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/time until unlock/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reveal itself when the timer hits zero/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open capsule/i }),
    ).not.toBeInTheDocument();
  });

  it("unlocked + not opened: shows the body and the Open capsule button", async () => {
    seed([UNLOCKED_UNOPENED]);

    renderDetail(UNLOCKED_UNOPENED.id);

    await screen.findByText(UNLOCKED_UNOPENED.title);
    expect(screen.getByText(UNLOCKED_UNOPENED.body)).toBeInTheDocument();
    expect(screen.getByText(/sealed on/i)).toBeInTheDocument();
    expect(screen.getByText(/unlocked on/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open capsule/i }),
    ).toBeInTheDocument();
  });

  it("clicking Open capsule transitions to the opened state and persists openedAt", async () => {
    const user = userEvent.setup();
    seed([UNLOCKED_UNOPENED]);

    renderDetail(UNLOCKED_UNOPENED.id);

    const openBtn = await screen.findByRole("button", {
      name: /open capsule/i,
    });
    await user.click(openBtn);

    expect(
      screen.queryByRole("button", { name: /open capsule/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/opened/i)).toBeInTheDocument();

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as Capsule[];
    expect(stored[0].openedAt).not.toBeNull();
  });

  it("delete confirmation removes the capsule and navigates back to /capsules", async () => {
    const user = userEvent.setup();
    seed([UNLOCKED_UNOPENED]);

    renderDetail(UNLOCKED_UNOPENED.id);

    await screen.findByText(UNLOCKED_UNOPENED.title);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^delete$/i }),
    );

    expect(pushMock).toHaveBeenCalledWith("/capsules");

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as Capsule[];
    expect(stored).toEqual([]);
  });
});
