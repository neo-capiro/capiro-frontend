import { describe, expect, it, vi } from "vitest";
import {
  MERI_IDENTITY_TOKEN_SECONDS,
  meriIdentityToken,
} from "../src/shared/meri-actions/identity-token.server";

const jwt = "aaa.bbb.ccc";

describe("meriIdentityToken", () => {
  it("asks Clerk for a fresh token for the signed-in session", async () => {
    const mint = vi.fn(async () => ({ jwt }));
    const fallback = vi.fn(async () => "cookie.token.value");
    await expect(meriIdentityToken("sess_123", fallback, mint)).resolves.toBe(
      jwt,
    );
    expect(mint).toHaveBeenCalledWith("sess_123");
    expect(fallback).not.toHaveBeenCalled();
    expect(MERI_IDENTITY_TOKEN_SECONDS).toBe(300);
  });
  it("falls back to the request token when minting fails or returns junk", async () => {
    const fallback = vi.fn(async () => "cookie.token.value");
    await expect(
      meriIdentityToken("sess_123", fallback, async () => {
        throw new Error("down");
      }),
    ).resolves.toBe("cookie.token.value");
    await expect(
      meriIdentityToken("sess_123", fallback, async () => ({
        jwt: "not a jwt",
      })),
    ).resolves.toBe("cookie.token.value");
    await expect(
      meriIdentityToken("sess_123", fallback, async () => null),
    ).resolves.toBe("cookie.token.value");
  });
  it("never mints without a session id", async () => {
    const mint = vi.fn(async () => ({ jwt }));
    await expect(
      meriIdentityToken(null, async () => null, mint),
    ).resolves.toBeNull();
    expect(mint).not.toHaveBeenCalled();
  });
});
