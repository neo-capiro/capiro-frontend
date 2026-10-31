import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { browserSession, hearingFixtures } from "./hearing-fixtures";

test.afterEach(async ({ runtimeObservation }) => {
  expect(runtimeObservation.consoleErrors).toEqual([]);
});

// This proves mounted UI/MediaRecorder/transport lifecycle with synthetic audio.
// It does not exercise the browser permission chooser or a real storage service.
test("explicit retained recording drains real synthetic MediaRecorder audio on client navigation", async ({
  page,
}) => {
  let retained = false;
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...hearingFixtures,
    "legiwatch.session": () => ({
      ...browserSession,
      recordingPolicy: retained ? "audio_and_transcript" : "transcript_only",
    }),
    "legiwatch.recording": () => ({
      recordingPolicy: retained ? "audio_and_transcript" : "transcript_only",
      recording: null,
    }),
    "legiwatch.recording.enable": () => {
      retained = true;
      return { recordingPolicy: "audio_and_transcript" };
    },
  });
  await page.addInitScript(() => {
    const audit = {
      events: [] as string[],
      frames: 0,
      options: null as unknown,
    };
    (window as unknown as { captureAudit: typeof audit }).captureAudit = audit;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        throw new Error("Microphone must never be requested");
      },
    });
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async (options: unknown) => {
        audit.options = options;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        let stopped = false;
        const video = Object.assign(new EventTarget(), {
          getSettings: () => ({ displaySurface: "browser" }),
          stop: () => {
            if (stopped) return;
            stopped = true;
            oscillator.stop();
            void context.close();
          },
        });
        return {
          getAudioTracks: () => destination.stream.getAudioTracks(),
          getVideoTracks: () => [video],
          getTracks: () => [...destination.stream.getTracks(), video],
        };
      },
    });
    class SyntheticSocket {
      static OPEN = 1;
      readyState = 0;
      bufferedAmount = 0;
      binaryType = "arraybuffer";
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      constructor() {
        setTimeout(() => {
          this.readyState = 1;
          this.onopen?.();
        }, 0);
      }
      emit(value: unknown) {
        this.onmessage?.({ data: JSON.stringify(value) });
      }
      send(data: string | ArrayBuffer) {
        if (typeof data === "string") {
          const message = JSON.parse(data);
          audit.events.push(message.type);
          if (message.type === "capture_start") {
            if (message.recordingProtocol !== 1)
              throw new Error("Retained protocol was not selected");
            setTimeout(() => {
              this.emit({
                type: "recording_epoch",
                recordingId: "synthetic-recording",
                epochId: "synthetic-epoch",
                startMs: 0,
              });
              this.emit({ type: "status", status: "capture_ready" });
            }, 0);
          } else if (message.type === "capture_stop") {
            audit.events.push(`final:${message.finalSequence}`);
            setTimeout(() => this.emit({ type: "status", status: "ended" }), 0);
          }
        } else {
          const view = new DataView(data);
          const sequence = view.getUint32(4);
          audit.frames += 1;
          audit.events.push(`frame:${sequence}`);
          setTimeout(() => {
            audit.events.push(`ack:${sequence}`);
            this.emit({
              type: "audio_saved",
              epochId: "synthetic-epoch",
              sequence,
              durableBytes: data.byteLength,
              durableEndMs: view.getFloat64(8),
            });
          }, 30);
        }
      }
      close() {
        this.readyState = 3;
        audit.events.push("closed");
        this.onclose?.();
      }
    }
    const NativeSocket = window.WebSocket;
    Object.defineProperty(window, "WebSocket", {
      value: new Proxy(NativeSocket, {
        construct(target, args) {
          return String(args[0]).endsWith("/synthetic-live")
            ? new SyntheticSocket()
            : Reflect.construct(target, args);
        },
      }),
    });
  });
  await page.goto(
    "/modules/intelligence?view=legiwatch&sessionId=synthetic-session",
  );
  const connect = page.getByRole("button", {
    name: "Connect and share tab audio",
  });
  await expect(connect).toBeDisabled();
  await page
    .getByRole("button", { name: "Enable retained audio before capture" })
    .click();
  await expect(connect).toBeEnabled();
  await page.screenshot({
    path: "test-results/hearing-recording-choice.png",
    fullPage: true,
  });
  await connect.click();
  await expect(page.getByText("Capturing", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { captureAudit: { frames: number } })
            .captureAudit.frames,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { captureAudit: { events: string[] } }
        ).captureAudit.events.at(-1),
      ),
    )
    .toBe("closed");
  const audit = await page.evaluate(
    () =>
      (
        window as unknown as {
          captureAudit: { events: string[]; options: unknown };
        }
      ).captureAudit,
  );
  const stopIndex = audit.events.indexOf("capture_stop");
  expect(stopIndex).toBeGreaterThan(0);
  expect(audit.events[stopIndex - 1]).toMatch(/^ack:/);
  expect(
    audit.events.filter((event) => event.startsWith("frame:")).length,
  ).toBeGreaterThanOrEqual(2);
  expect(audit.options).toMatchObject({
    video: { displaySurface: "browser" },
    audio: true,
    systemAudio: "exclude",
    monitorTypeSurfaces: "exclude",
  });
});

test("transcript-only capture requires an explicit choice and missing tab audio is rejected", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, hearingFixtures);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => ({
        getAudioTracks: () => [],
        getVideoTracks: () => [
          { getSettings: () => ({ displaySurface: "browser" }) },
        ],
        getTracks: () => [],
      }),
    });
  });
  await page.goto(
    "/modules/intelligence?view=legiwatch&sessionId=synthetic-session",
  );
  const connect = page.getByRole("button", {
    name: "Connect and share tab audio",
  });
  await expect(connect).toBeDisabled();
  await page
    .getByLabel(
      "Continue with transcript only. Audio will not be saved for replay.",
    )
    .check();
  await connect.click();
  await expect(page.getByRole("alert")).toContainText("enable Share tab audio");
  await expect(connect).toBeEnabled();
});
