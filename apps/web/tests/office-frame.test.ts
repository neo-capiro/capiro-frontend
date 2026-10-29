import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeFrameChannel } from "../src/shared/meri-office/code-frame";
import type { OfficeLaunch } from "@capiro/meri-contracts/office-application";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop();
  vi.useRealTimers();
});
function fixture() {
  vi.useFakeTimers();
  vi.setSystemTime(1_800_000_000_000);
  const channel = new MessageChannel(),
    wrong = new MessageChannel(),
    events = new EventTarget();
  const messages: {
    MessageId: string;
    Values: Record<string, unknown>;
    origin: string;
  }[] = [];
  const frame = channel.port1 as unknown as Window;
  frame.postMessage = ((message: string, origin: string) =>
    messages.push({ ...JSON.parse(message), origin })) as Window["postMessage"];
  const callbacks = {
    ready: vi.fn(),
    modified: vi.fn(),
    renew: vi.fn(),
    unavailable: vi.fn(),
  };
  const owner = new CodeFrameChannel({
    origin: "https://office.example.test",
    frame,
    events: events as unknown as Window,
    expiresAtMs: Date.now() + 60_000,
    callbacks,
  });
  cleanup.push(() => {
    owner.dispose();
    channel.port1.close();
    channel.port2.close();
    wrong.port1.close();
    wrong.port2.close();
  });
  const receive = (
    MessageId: string,
    Values = {},
    origin = "https://office.example.test",
    source = channel.port1,
  ) =>
    events.dispatchEvent(
      new MessageEvent("message", {
        origin,
        source,
        data: JSON.stringify({ MessageId, Values }),
      }),
    );
  const ready = () =>
    receive("App_LoadingStatus", { Status: "Document_Loaded" });
  return { owner, events, channel, wrong, messages, callbacks, receive, ready };
}
describe("CODE frame channel", () => {
  it("checks both exact origin and frame and sends only bounded protocol commands", async () => {
    const f = fixture();
    f.owner.handshake();
    f.receive(
      "App_LoadingStatus",
      { Status: "Document_Loaded" },
      "https://attacker.example.test",
    );
    f.receive(
      "App_LoadingStatus",
      { Status: "Document_Loaded" },
      undefined,
      f.wrong.port1,
    );
    expect(f.callbacks.ready).not.toHaveBeenCalled();
    await expect(
      f.owner.requestSave(new AbortController().signal),
    ).rejects.toThrow();
    f.ready();
    const save = f.owner.requestSave(new AbortController().signal);
    f.receive("Action_Save_Resp", { success: true }, undefined, f.wrong.port1);
    let acknowledged = false;
    void save.then(() => {
      acknowledged = true;
    });
    await Promise.resolve();
    expect(acknowledged).toBe(false);
    f.receive("Action_Save_Resp", { success: true });
    await save;
    expect(f.messages.map((m) => m.MessageId)).toEqual([
      "Host_PostmessageReady",
      "Action_Save",
    ]);
    expect(
      f.messages.every((m) => m.origin === "https://office.example.test"),
    ).toBe(true);
  });
  it("Save timeout retires the channel so a late acknowledgement cannot satisfy another Save", async () => {
    const f = fixture();
    f.ready();
    const save = f.owner.requestSave(new AbortController().signal);
    const failed = expect(save).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_000);
    await failed;
    expect(f.callbacks.unavailable).toHaveBeenCalledWith("save-unknown");
    f.receive("Action_Save_Resp", { success: true });
    await expect(
      f.owner.requestSave(new AbortController().signal),
    ).rejects.toThrow();
    expect(
      f.messages.filter((m) => m.MessageId === "Action_Save"),
    ).toHaveLength(1);
  });
  it("renewal sends both token and absolute TTL and never stores or publishes a document", async () => {
    const f = fixture();
    f.ready();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(f.callbacks.renew).toHaveBeenCalledTimes(1);
    const launch = {
      editorOrigin: "https://office.example.test",
      expiresAtMs: Date.now() + 60_000,
      fields: {
        access_token: "synthetic-token",
        access_token_ttl: String(Date.now() + 60_000),
      },
    } as OfficeLaunch;
    f.owner.renew(launch);
    expect(f.messages.at(-1)).toMatchObject({
      MessageId: "Reset_Access_Token",
      Values: { token: "synthetic-token", ttl: launch.fields.access_token_ttl },
    });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(f.callbacks.unavailable).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(f.callbacks.unavailable).toHaveBeenCalledWith("expired");
    expect(
      f.messages.some((m) => m.MessageId.toLowerCase().includes("publish")),
    ).toBe(false);
  });
  it("cancellation/disposal clears pending Save and ignores subsequent frame messages", async () => {
    const f = fixture();
    f.ready();
    const abort = new AbortController(),
      save = f.owner.requestSave(abort.signal),
      failed = expect(save).rejects.toThrow();
    abort.abort();
    await failed;
    f.receive("Doc_ModifiedStatus", { Modified: true });
    expect(f.callbacks.modified).not.toHaveBeenCalled();
    expect(f.callbacks.unavailable).toHaveBeenCalledTimes(1);
    f.owner.dispose();
    expect(f.callbacks.unavailable).toHaveBeenCalledTimes(1);
  });
  it("malformed or oversized messages convey no ready, modified or Save acknowledgement", () => {
    const f = fixture();
    for (const data of [
      "{",
      "x".repeat(65_537),
      { MessageId: "App_LoadingStatus", Values: { Status: "Document_Loaded" } },
    ])
      f.events.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://office.example.test",
          source: f.channel.port1,
          data,
        }),
      );
    expect(f.callbacks.ready).not.toHaveBeenCalled();
    expect(f.callbacks.modified).not.toHaveBeenCalled();
  });
});
