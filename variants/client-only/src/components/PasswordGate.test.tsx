import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordGate } from "@/components/PasswordGate";

describe("PasswordGate", () => {
  it("renders children when no password is configured", () => {
    // VITE_GATE_PASSWORD is unset in the test env, so the gate is open.
    render(<PasswordGate><p>protected content</p></PasswordGate>);
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
