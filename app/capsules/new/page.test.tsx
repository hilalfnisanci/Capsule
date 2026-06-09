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

import NewCapsulePage from "./page";

function formatLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

beforeEach(() => {
  pushMock.mockReset();
  backMock.mockReset();
  createCapsuleMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("NewCapsulePage", () => {
  it("disables submit and does not call createCapsule when unlock date is in the past", async () => {
    const user = userEvent.setup();
    render(<NewCapsulePage />);

    await user.type(screen.getByLabelText(/title/i), "Hello future me");
    await user.type(
      screen.getByLabelText(/body/i),
      "A message to my future self.",
    );

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await user.type(
      screen.getByLabelText(/unlock at/i),
      formatLocalDateTimeInput(past),
    );

    const submit = screen.getByRole("button", { name: /create capsule/i });
    expect(submit).toBeDisabled();
    expect(
      screen.getByText(/unlock date must be in the future/i),
    ).toBeInTheDocument();

    await user.click(submit);
    expect(createCapsuleMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("calls createCapsule with parsed fields and navigates to the detail page on valid submit", async () => {
    const user = userEvent.setup();
    createCapsuleMock.mockReturnValue({ id: "abc-123" });

    render(<NewCapsulePage />);

    await user.type(screen.getByLabelText(/title/i), "  Birthday note  ");
    await user.type(
      screen.getByLabelText(/body/i),
      "Open this on your birthday.",
    );

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureInput = formatLocalDateTimeInput(future);
    await user.type(screen.getByLabelText(/unlock at/i), futureInput);

    const submit = screen.getByRole("button", { name: /create capsule/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(createCapsuleMock).toHaveBeenCalledTimes(1);
    const arg = createCapsuleMock.mock.calls[0][0] as {
      title: string;
      body: string;
      unlockAt: string;
    };
    expect(arg.title).toBe("Birthday note");
    expect(arg.body).toBe("Open this on your birthday.");
    expect(arg.unlockAt).toBe(new Date(futureInput).toISOString());

    expect(pushMock).toHaveBeenCalledWith("/capsules/abc-123");
  });
});
