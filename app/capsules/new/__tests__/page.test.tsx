import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const backMock = vi.fn();
const createCapsuleMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

vi.mock("@/lib/capsule", () => ({
  createCapsule: (...args: unknown[]) => createCapsuleMock(...args),
}));

import NewCapsulePage from "../page";

function formatLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

describe("NewCapsulePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    createCapsuleMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps submit disabled and surfaces an inline error when unlockAt is in the past", async () => {
    const user = userEvent.setup();
    render(<NewCapsulePage />);

    const submit = screen.getByRole("button", { name: /create capsule/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "Hello");
    await user.type(
      screen.getByLabelText(/body/i),
      "A friendly note from the past.",
    );

    const past = new Date(Date.now() - 60 * 60 * 1000);
    await user.type(screen.getByLabelText(/unlock at/i), formatLocal(past));

    expect(
      screen.getByText(/unlock date must be in the future/i),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(createCapsuleMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("submits valid input, calls createCapsule with parsed fields, and navigates to the detail page", async () => {
    const user = userEvent.setup();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureIso = new Date(formatLocal(future)).toISOString();

    createCapsuleMock.mockResolvedValueOnce({ id: "capsule-123" });

    render(<NewCapsulePage />);

    await user.type(screen.getByLabelText(/title/i), "  Birthday note  ");
    await user.type(
      screen.getByLabelText(/body/i),
      "  Open me on your birthday.  ",
    );
    await user.type(screen.getByLabelText(/unlock at/i), formatLocal(future));

    const submit = screen.getByRole("button", { name: /create capsule/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(createCapsuleMock).toHaveBeenCalledTimes(1);
    expect(createCapsuleMock).toHaveBeenCalledWith({
      title: "Birthday note",
      body: "Open me on your birthday.",
      unlockAt: futureIso,
    });

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/capsules/capsule-123");
    });
  });

  it("renders a character counter for the body field", async () => {
    const user = userEvent.setup();
    render(<NewCapsulePage />);

    expect(screen.getByText("0/2000")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/body/i), "hello");
    expect(screen.getByText("5/2000")).toBeInTheDocument();
  });

  it("cancel button calls router.back()", async () => {
    const user = userEvent.setup();
    render(<NewCapsulePage />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
