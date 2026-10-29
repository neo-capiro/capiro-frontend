import { describe, expect, it, vi } from "vitest";
import { readDefaultConversationClient } from "../src/shared/meri-user-preferences/default-client";
import { currentPreferencesFixture } from "./meri-user-preferences-fixtures";
import {
  USER_PREFERENCE_DEFAULTS,
  type UserPreferencesResponse,
} from "@capiro/meri-client/user-preferences";
import type { UserPreferencesPort } from "../src/shared/meri-user-preferences/transport";
import type { Client } from "../src/shared/session/client-contract";
const id = "30000000-0000-4000-8000-000000000001";
const client = {
  id,
  name: "Synthetic default",
  status: "active",
  profileStatus: "active",
};
function setup(defaultClientId: string | null = id) {
  const controller = new AbortController();
  const response: UserPreferencesResponse = {
    ...currentPreferencesFixture.read,
    preferences: {
      ...USER_PREFERENCE_DEFAULTS,
      defaultClientId,
    },
  };
  const read = vi.fn<UserPreferencesPort["read"]>(async () => response);
  const readClient = vi.fn<
    (id: string, signal: AbortSignal) => Promise<Client>
  >(async () => client);
  return {
    controller,
    response,
    read,
    readClient,
    open: () =>
      readDefaultConversationClient({
        preferences: { read },
        readClient,
        signal: controller.signal,
      }),
  };
}
describe("saved default client admission", () => {
  it("reads the preference and current client before yielding the exact selection", async () => {
    const f = setup();
    expect(await f.open()).toEqual(client);
    expect(f.read).toHaveBeenCalledOnce();
    expect(f.readClient).toHaveBeenCalledExactlyOnceWith(
      id,
      expect.any(AbortSignal),
    );
  });
  it("withheld or unset defaults cannot guess another client", async () => {
    const f = setup(null);
    expect(await f.open()).toBeNull();
    expect(f.readClient).not.toHaveBeenCalled();
  });
  it.each(["archived", "foreign", "revoked", "malformed"])(
    "refuses a %s client",
    async (kind) => {
      const f = setup();
      if (kind === "revoked") f.readClient.mockRejectedValue(new Error("403"));
      else
        f.readClient.mockResolvedValue(
          kind === "archived"
            ? { ...client, status: "archived" }
            : kind === "foreign"
              ? { ...client, id: "30000000-0000-4000-8000-000000000002" }
              : ({ id } as typeof client),
        );
      await expect(f.open()).rejects.toThrow();
    },
  );
  it("cannot read a client after preferences become unavailable", async () => {
    const f = setup();
    f.read.mockResolvedValue({
      error: { code: "MEMBERSHIP_REVOKED" },
    } as never);
    await expect(f.open()).rejects.toThrow();
    expect(f.readClient).not.toHaveBeenCalled();
  });
  it.each(["preferences", "client"])(
    "ignores late %s responses after account change",
    async (stage) => {
      const f = setup();
      if (stage === "preferences")
        f.read.mockImplementation(async () => {
          f.controller.abort();
          return f.response;
        });
      else
        f.readClient.mockImplementation(async () => {
          f.controller.abort();
          return client;
        });
      await expect(f.open()).rejects.toThrow();
      if (stage === "preferences") expect(f.readClient).not.toHaveBeenCalled();
    },
  );
  it("does no IO for a retired attempt", async () => {
    const f = setup();
    f.controller.abort();
    await expect(f.open()).rejects.toThrow();
    expect(f.read).not.toHaveBeenCalled();
    expect(f.readClient).not.toHaveBeenCalled();
  });
  it("times out a stalled client lookup without releasing a selection", async () => {
    vi.useFakeTimers();
    try {
      const f = setup();
      let observed: AbortSignal | undefined;
      f.readClient.mockImplementation((_id, signal) => {
        observed = signal;
        return new Promise(() => {});
      });
      const attempted = expect(f.open()).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(10_001);
      await attempted;
      expect(observed?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
