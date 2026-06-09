import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY, type Capsule } from "@/lib/capsule";
import CapsulesPage from "../page";

function seed(capsules: Capsule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

beforeEach(() => {
  localStorage.clear();
});

describe("CapsulesPage", () => {
  it("renders 3 capsules in createdAt-desc order with correct pill states", async () => {
    const past = "2020-01-01T00:00:00.000Z";
    const future = "2999-01-01T00:00:00.000Z";

    seed([
      {
        id: "jan",
        title: "January Capsule",
        body: "first body",
        createdAt: "2026-01-15T10:00:00.000Z",
        unlockAt: future,
        openedAt: null,
      },
      {
        id: "feb",
        title: "February Capsule",
        body: "second body",
        createdAt: "2026-02-15T10:00:00.000Z",
        unlockAt: past,
        openedAt: null,
      },
      {
        id: "mar",
        title: "March Capsule",
        body: "third body",
        createdAt: "2026-03-15T10:00:00.000Z",
        unlockAt: future,
        openedAt: null,
      },
    ]);

    render(<CapsulesPage />);

    await screen.findByText("March Capsule");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("March Capsule")).toBeInTheDocument();
    expect(within(items[1]).getByText("February Capsule")).toBeInTheDocument();
    expect(within(items[2]).getByText("January Capsule")).toBeInTheDocument();

    expect(screen.getAllByText("Locked")).toHaveLength(2);
    expect(screen.getAllByText("Unlocked")).toHaveLength(1);
  });

  it("renders the empty state when no capsules exist", async () => {
    render(<CapsulesPage />);

    await screen.findByText("No capsules yet");

    const cta = screen.getByRole("link", { name: /create your first capsule/i });
    expect(cta).toHaveAttribute("href", "/capsules/new");
  });
});
