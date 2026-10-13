import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
import {
  sendReviewedInvitations,
  type InviteOutcome,
} from "../src/features/onboard/lib/invite-sequence";
const rows = ["one", "two", "three"].map((name) => ({
  email: `${name}@synthetic.example`,
  role: "standard_user" as const,
}));
const receipt = (id: string) => ({
  status: "invited" as const,
  invitation: {
    id,
    email: `${id}@synthetic.example`,
    role: "standard_user" as const,
    firstName: null,
    lastName: null,
    createdAt: "2026-10-13T00:00:00Z",
    expiresAt: null,
  },
});
describe("reviewed onboarding invitation sequence", () => {
  it("keeps the first receipt, records unknown second, and never attempts third after loss", async () => {
    const cache = new QueryClient();
    const attempt = createOnboardAttempt(cache, "invite", () => true);
    const close = attempt.mount();
    const invite = vi
      .fn()
      .mockResolvedValueOnce(receipt("one"))
      .mockRejectedValueOnce(Error("response lost"));
    let outcomes: InviteOutcome[] = [];
    await expect(
      attempt.run("Invite reviewed rows", (guard) =>
        sendReviewedInvitations(rows, invite, guard, (value) => {
          outcomes = value;
        }),
      ),
    ).rejects.toThrow("lost");
    expect(outcomes.map((row) => row.status)).toEqual([
      "confirmed",
      "unknown",
      "unattempted",
    ]);
    expect(outcomes[0]?.invitationId).toBe("one");
    expect(invite).toHaveBeenCalledTimes(2);
    expect(attempt.read()?.phase).toBe("unknown");
    close();
    cache.clear();
  });
  it("does not confirm a late first invitation or dispatch later rows after view closure", async () => {
    const cache = new QueryClient();
    const attempt = createOnboardAttempt(cache, "invite", () => true);
    const close = attempt.mount();
    let resolve!: (value: ReturnType<typeof receipt>) => void;
    const invite = vi.fn(
      () =>
        new Promise<ReturnType<typeof receipt>>((yes) => {
          resolve = yes;
        }),
    );
    let outcomes: InviteOutcome[] = [];
    const running = attempt.run("Invite reviewed rows", (guard) =>
      sendReviewedInvitations(rows, invite, guard, (value) => {
        outcomes = value;
      }),
    );
    close();
    resolve(receipt("one"));
    await expect(running).rejects.toMatchObject({ name: "AbortError" });
    expect(outcomes.map((row) => row.status)).toEqual([
      "unknown",
      "unattempted",
      "unattempted",
    ]);
    expect(invite).toHaveBeenCalledTimes(1);
    cache.clear();
  });
  it("keeps each normalized reviewed recipient and successful invitation ID without claiming delivery", async () => {
    const cache = new QueryClient();
    const attempt = createOnboardAttempt(cache, "invite", () => true);
    const close = attempt.mount();
    const invite = vi.fn(async (row: (typeof rows)[number]) =>
      receipt(row.email.split("@")[0]!),
    );
    const outcomes = await attempt.run("Invite reviewed rows", (guard) =>
      sendReviewedInvitations(rows, invite, guard, () => {}),
    );
    expect(outcomes.map((row) => row.email)).toEqual(
      rows.map((row) => row.email),
    );
    expect(outcomes.map((row) => row.invitationId)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(outcomes.every((row) => row.status === "confirmed")).toBe(true);
    expect(invite).toHaveBeenCalledTimes(3);
    close();
    cache.clear();
  });
});
