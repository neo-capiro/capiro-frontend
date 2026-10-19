import { describe, expect, it, vi } from "vitest";
import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { QueryClient } from "@tanstack/react-query";
import { clerkInputAttempt } from "../src/features/onboard/lib/clerk-input-attempt";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";

describe("confirmed Clerk input refusal versus unknown transport outcome", () => {
  it.each([
    "form_password_pwned",
    "form_code_incorrect",
    "form_identifier_exists",
  ])(
    "allows an explicit corrected input after %s without automatically retrying",
    async (code) => {
      const cache = new QueryClient();
      const attempt = createOnboardAttempt(cache, "signup", () => true);
      const close = attempt.mount();
      const refusal = new ClerkAPIResponseError("Input refused", {
        status: 422,
        data: [{ code, message: "Use corrected input" }],
      });
      const effect = vi
        .fn()
        .mockRejectedValueOnce(refusal)
        .mockResolvedValueOnce("accepted");
      await expect(
        attempt.run("Reviewed input", (guard) =>
          guard.wait(() => clerkInputAttempt(effect)),
        ),
      ).rejects.toThrow("corrected");
      expect(attempt.read()?.phase).toBe("rejected");
      expect(effect).toHaveBeenCalledTimes(1);
      expect(
        await attempt.run("Corrected input", (guard) =>
          guard.wait(() => clerkInputAttempt(effect)),
        ),
      ).toBe("accepted");
      expect(effect).toHaveBeenCalledTimes(2);
      close();
      cache.clear();
    },
  );
  it("keeps unknown network loss blocked even when the form can be edited locally", async () => {
    const cache = new QueryClient();
    const attempt = createOnboardAttempt(cache, "signup", () => true);
    const close = attempt.mount();
    const effect = vi.fn().mockRejectedValue(Error("network loss"));
    await expect(
      attempt.run("Reviewed input", (guard) =>
        guard.wait(() => clerkInputAttempt(effect)),
      ),
    ).rejects.toThrow("network loss");
    expect(attempt.read()?.phase).toBe("unknown");
    await expect(
      attempt.run("Changed input", (guard) =>
        guard.wait(() => clerkInputAttempt(effect)),
      ),
    ).rejects.toThrow("current-status");
    expect(effect).toHaveBeenCalledTimes(1);
    close();
    cache.clear();
  });
});
