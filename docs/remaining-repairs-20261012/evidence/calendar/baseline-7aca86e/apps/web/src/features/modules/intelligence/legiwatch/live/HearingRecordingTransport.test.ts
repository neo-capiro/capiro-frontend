import { afterEach, describe, expect, it, vi } from "vitest";
import { HearingRecordingTransport } from "./HearingRecordingTransport";

function socket() {
  const frames: ArrayBuffer[] = [];
  const connection = {
    readyState: 1,
    send: vi.fn((frame: ArrayBuffer) => frames.push(frame.slice(0))),
  };
  return { connection: connection as unknown as WebSocket, frames };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("retained hearing audio transport", () => {
  it("commits ordered frames only after a matching durable acknowledgement", async () => {
    vi.stubGlobal("WebSocket", { OPEN: 1 });
    const { connection, frames } = socket(),
      saved = vi.fn(),
      transport = new HearingRecordingTransport(connection, "epoch-1", saved);
    const queued = transport.enqueue(
      new Blob([new Uint8Array([1, 2, 3])]),
      1200,
    );
    await vi.waitFor(() => expect(frames).toHaveLength(1));
    expect([...new Uint8Array(frames[0]!).slice(0, 4)]).toEqual([
      76, 87, 65, 52,
    ]);
    expect(new DataView(frames[0]!).getUint32(4)).toBe(0);
    expect(new DataView(frames[0]!).getFloat64(8)).toBe(1200);
    transport.acknowledge({
      epochId: "wrong-epoch",
      sequence: 0,
      durableBytes: 3,
      durableEndMs: 1200,
    });
    expect(transport.finalSequence).toBe(-1);
    transport.acknowledge({
      epochId: "epoch-1",
      sequence: 7,
      durableBytes: 3,
      durableEndMs: 1200,
    });
    expect(transport.finalSequence).toBe(-1);
    transport.acknowledge({
      epochId: "epoch-1",
      sequence: 0,
      durableBytes: 3,
      durableEndMs: 1200,
    });
    await queued;
    await transport.drain();
    expect(transport.finalSequence).toBe(0);
    expect(transport.backlogBytes).toBe(0);
    expect(saved).toHaveBeenCalledTimes(1);
  });
  it("retries an immutable frame without advancing the saved checkpoint", async () => {
    vi.stubGlobal("WebSocket", { OPEN: 1 });
    vi.useFakeTimers();
    const { connection, frames } = socket(),
      transport = new HearingRecordingTransport(connection, "epoch-2", vi.fn());
    const queued = transport.enqueue(new Blob([new Uint8Array([5, 6])]), 1000);
    await vi.waitFor(() => expect(frames).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(10001);
    expect(frames).toHaveLength(2);
    expect(new Uint8Array(frames[1]!)).toEqual(new Uint8Array(frames[0]!));
    expect(transport.finalSequence).toBe(-1);
    transport.acknowledge({
      epochId: "epoch-2",
      sequence: 0,
      durableBytes: 2,
      durableEndMs: 1000,
    });
    await queued;
    expect(transport.finalSequence).toBe(0);
  });
  it("stops when the queue exceeds its bounded unsaved tail", async () => {
    vi.stubGlobal("WebSocket", { OPEN: 1 });
    const { connection, frames } = socket(),
      transport = new HearingRecordingTransport(connection, "epoch-3", vi.fn());
    await expect(
      transport.enqueue(new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]), 1000),
    ).rejects.toThrow("8 MB");
    expect(frames).toHaveLength(0);
    expect(transport.finalSequence).toBe(-1);
    await expect(transport.enqueue(new Blob(["tail"]), 1001)).rejects.toThrow(
      "stopped",
    );
  });
});
