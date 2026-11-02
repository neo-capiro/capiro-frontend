import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CodeFrameChannel,
  codeFrameAllow,
  codeLaunchUrl,
} from "../src/shared/meri-office/code-frame";
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
    saveRequested: vi.fn(),
    saveAsRequested: vi.fn(),
    historyRequested: vi.fn(),
    closeRequested: vi.fn(),
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
      "Disable_Default_UIAction",
      "Disable_Default_UIAction",
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
  it("early CODE token warnings cannot create a renewal loop after each reset", async () => {
    const f = fixture();
    f.ready();
    for (let n = 0; n < 20; n++)
      f.receive("App_TokenExpiring", { Timeout: 60_000 });
    expect(f.callbacks.renew).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    for (let n = 0; n < 20; n++)
      f.receive("App_TokenExpiring", { Timeout: 30_000 });
    expect(f.callbacks.renew).toHaveBeenCalledTimes(1);
    const expiresAtMs = Date.now() + 180_000;
    f.owner.renew({
      editorOrigin: "https://office.example.test",
      expiresAtMs,
      fields: {
        access_token: "synthetic-renewal",
        access_token_ttl: String(expiresAtMs),
      },
    } as OfficeLaunch);
    for (let n = 0; n < 20; n++)
      f.receive("App_TokenExpiring", { Timeout: 180_000 });
    expect(f.callbacks.renew).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(150_000);
    expect(f.callbacks.renew).toHaveBeenCalledTimes(2);
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
  it("repeats the handshake on Frame_Ready and takes over CODE's Save and close once the document is loaded", () => {
    const f = fixture();
    f.receive("App_LoadingStatus", { Status: "Frame_Ready" });
    expect(f.messages.map((m) => m.MessageId)).toEqual([
      "Host_PostmessageReady",
    ]);
    for (const id of ["UI_Save", "UI_SaveAs", "UI_FileVersions", "UI_Close"])
      f.receive(id);
    expect(f.callbacks.saveRequested).not.toHaveBeenCalled();
    expect(f.callbacks.closeRequested).not.toHaveBeenCalled();
    f.ready();
    expect(f.messages.slice(1)).toMatchObject([
      {
        MessageId: "Disable_Default_UIAction",
        Values: { action: "UI_Save", disable: true },
        origin: "https://office.example.test",
      },
      {
        MessageId: "Disable_Default_UIAction",
        Values: { action: "UI_Close", disable: true },
        origin: "https://office.example.test",
      },
    ]);
    f.receive("UI_Save");
    f.receive("UI_SaveAs", { format: "docx" });
    f.receive("UI_FileVersions");
    f.receive("UI_Close", { EverModified: true });
    expect(f.callbacks.saveRequested).toHaveBeenCalledTimes(1);
    expect(f.callbacks.saveAsRequested).toHaveBeenCalledTimes(1);
    expect(f.callbacks.historyRequested).toHaveBeenCalledTimes(1);
    expect(f.callbacks.closeRequested).toHaveBeenCalledTimes(1);
    // CODE's close is a request, not an ended channel; a close from another origin is ignored.
    expect(f.callbacks.unavailable).not.toHaveBeenCalled();
    f.receive("UI_Close", {}, "https://attacker.example.test");
    expect(f.callbacks.closeRequested).toHaveBeenCalledTimes(1);
    f.receive("Session_Closed", { Reason: "OwnerTermination" });
    expect(f.callbacks.unavailable).toHaveBeenCalledWith("closed");
  });
  it("the launch URL asks for the full notebookbar UI with CODE's close and revision controls, on the service's URL", () => {
    const action =
      "https://office.example.test/browser/abc/cool.html?WOPISrc=https%3A%2F%2Fmeri.example.test%2Fapi%2Fmeri%2Foffice%2Fwopi%2Ffiles%2Fdraft";
    const url = new URL(codeLaunchUrl(action, "en-GB"));
    expect(url.origin + url.pathname).toBe(
      "https://office.example.test/browser/abc/cool.html",
    );
    expect(url.searchParams.getAll("WOPISrc")).toEqual([
      "https://meri.example.test/api/meri/office/wopi/files/draft",
    ]);
    expect(url.searchParams.get("ui_defaults")).toBe(
      "UIMode=notebookbar;SavedUIState=false",
    );
    expect(url.searchParams.get("closebutton")).toBe("1");
    expect(url.searchParams.get("revisionhistory")).toBe("1");
    expect(url.searchParams.get("lang")).toBe("en-GB");
    expect(url.searchParams.has("access_token")).toBe(false);
    expect(
      new URL(codeLaunchUrl(action, "not a tag")).searchParams.has("lang"),
    ).toBe(false);
  });
  it("grants the frame's features to the editor origin explicitly, since a form-posted frame has no src to match", () => {
    expect(codeFrameAllow("https://office.example.test")).toBe(
      "fullscreen https://office.example.test; clipboard-read https://office.example.test; clipboard-write https://office.example.test",
    );
    expect(
      codeFrameAllow("https://office.example.test/browser/x/cool.html"),
    ).toBe(codeFrameAllow("https://office.example.test"));
  });
});
