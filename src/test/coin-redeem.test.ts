// ============================================================================
// Zero-value redemption messaging + RPC sentinel mapping.
// ============================================================================
import { describe, it, expect } from "vitest";
import { coinFailureMessage } from "../../api/lib/coins";

describe("coinFailureMessage", () => {
  it("maps the atomic RPC sentinels to friendly, actionable text", () => {
    expect(coinFailureMessage("INSUFFICIENT_BALANCE")).toContain("balance changed");
    expect(coinFailureMessage("ALREADY_REDEEMED")).toContain("already used");
    expect(coinFailureMessage("USER_NOT_FOUND")).toContain("couldn't find your account");
    expect(coinFailureMessage("FORBIDDEN")).toContain("sign in again");
    expect(coinFailureMessage("NOT_AUTHENTICATED")).toContain("sign in again");
  });

  it("falls back to a generic message for unknown failures", () => {
    expect(coinFailureMessage("REDEMPTION_FAILED")).toContain("could not be applied");
    expect(coinFailureMessage(undefined)).toContain("could not be applied");
  });
});