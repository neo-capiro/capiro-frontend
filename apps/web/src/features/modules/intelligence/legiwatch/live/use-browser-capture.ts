"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import {
  HearingRecordingTransport,
  type AudioSaved,
} from "./HearingRecordingTransport";
import {
  hearingWsMessageSchema,
  type LiveCard,
  type LiveSegment,
} from "./ws-messages";

type CapturePhase =
  | "idle"
  | "sharing"
  | "connecting"
  | "ready"
  | "capturing"
  | "stopping"
  | "ended"
  | "interrupted";
type CaptureResources = {
  socket?: WebSocket;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  transport?: HearingRecordingTransport;
  timeout?: ReturnType<typeof setTimeout>;
  startedAt: number;
  graceful: boolean;
};

export function useBrowserCapture(
  sessionId: string,
  recordingPolicy: string,
  onEnded: () => void,
) {
  const api = useCapiro(),
    resources = useRef<CaptureResources>({ startedAt: 0, graceful: false }),
    generation = useRef(0),
    mounted = useRef(true),
    onEndedRef = useRef(onEnded);
  useLayoutEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  const [phase, setPhase] = useState<CapturePhase>("idle"),
    [error, setError] = useState<string>(),
    [interim, setInterim] = useState<LiveSegment>(),
    [segments, setSegments] = useState<LiveSegment[]>([]),
    [cards, setCards] = useState<LiveCard[]>([]),
    [saved, setSaved] = useState<AudioSaved>(),
    [bytesSent, setBytesSent] = useState(0);
  const release = useCallback(() => {
    const current = resources.current;
    if (current.timeout) clearTimeout(current.timeout);
    if (current.recorder?.state === "recording") current.recorder.stop();
    current.transport?.stop();
    current.stream?.getTracks().forEach((track) => track.stop());
    current.socket?.close();
    resources.current = { startedAt: 0, graceful: false };
  }, []);
  const interrupt = useCallback(
    (message: string) => {
      generation.current += 1;
      setError(message);
      setPhase("interrupted");
      release();
    },
    [release],
  );
  const [previousScope, setPreviousScope] = useState({ api, sessionId });
  if (previousScope.api !== api || previousScope.sessionId !== sessionId) {
    setPreviousScope({ api, sessionId });
    setPhase("idle");
    setSegments([]);
    setCards([]);
    setSaved(undefined);
    setInterim(undefined);
    setError(undefined);
    setBytesSent(0);
  }
  async function connect() {
    if (!["idle", "ended", "interrupted"].includes(phase)) return;
    const currentGeneration = ++generation.current;
    setError(undefined);
    setPhase("sharing");
    try {
      if (
        !navigator.mediaDevices?.getDisplayMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Tab audio capture is unavailable in this browser. Open the official source or use available server attendance.",
        );
      const mimeType = ["audio/webm;codecs=opus", "audio/webm"].find((value) =>
        MediaRecorder.isTypeSupported(value),
      );
      if (!mimeType)
        throw new Error(
          "This browser cannot record the required WebM/Opus audio format.",
        );
      const options: DisplayMediaStreamOptions & {
        systemAudio: "exclude";
        monitorTypeSurfaces: "exclude";
        surfaceSwitching: "exclude";
      } = {
        video: { displaySurface: "browser" },
        audio: true,
        systemAudio: "exclude",
        monitorTypeSurfaces: "exclude",
        surfaceSwitching: "exclude",
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(options);
      if (currentGeneration !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioTracks = stream.getAudioTracks();
      const displaySurface = stream
        .getVideoTracks()[0]
        ?.getSettings().displaySurface;
      if (audioTracks.length === 0 || displaySurface !== "browser") {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(
          "Choose the official source browser tab and enable Share tab audio. Screen sharing without tab audio cannot be transcribed.",
        );
      }
      const current: CaptureResources = {
        stream,
        startedAt: 0,
        graceful: false,
      };
      resources.current = current;
      const ownsCapture = () =>
        currentGeneration === generation.current &&
        resources.current === current;
      const interruptCurrent = (message: string) => {
        if (ownsCapture()) interrupt(message);
      };
      stream.getTracks().forEach((track) =>
        track.addEventListener(
          "ended",
          () => {
            if (!current.graceful)
              interruptCurrent(
                "Tab sharing ended. Capture is interrupted; the unsaved tail is not confirmed. Reconnect and share again.",
              );
          },
          { once: true },
        ),
      );
      setPhase("connecting");
      const ticket = await api.request("legiwatch.session.wsTicket", {
        params: { id: sessionId },
      });
      if (currentGeneration !== generation.current) return;
      const socket = new WebSocket(ticket.socketUrl);
      current.socket = socket;
      socket.binaryType = "arraybuffer";
      current.timeout = setTimeout(
        () =>
          interruptCurrent(
            "Capture did not become ready. No audio was sent. Reconnect to try again.",
          ),
        20000,
      );
      socket.onopen = () => {
        if (ownsCapture())
          socket.send(
            JSON.stringify({
              type: "capture_start",
              mimeType,
              displaySurface: displaySurface ?? "browser",
              ...(recordingPolicy === "audio_and_transcript"
                ? { recordingProtocol: 1 }
                : {}),
            }),
          );
      };
      socket.onerror = () =>
        interruptCurrent(
          "The live audio connection failed. Reload the session to confirm any saved coverage.",
        );
      socket.onclose = () => {
        if (!current.graceful)
          interruptCurrent(
            "The live connection closed. Capture is interrupted; saved coverage must be checked before quoting.",
          );
      };
      socket.onmessage = (event) => {
        if (!ownsCapture() || typeof event.data !== "string") return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        const result = hearingWsMessageSchema.safeParse(parsed);
        if (!result.success) return;
        const message = result.data;
        if (message.type === "recording_epoch")
          current.transport = new HearingRecordingTransport(
            socket,
            message.epochId,
            setSaved,
          );
        if (message.type === "audio_saved")
          current.transport?.acknowledge(message);
        if (message.type === "interim")
          setInterim({ ...message.segment, id: "interim" });
        if (message.type === "final") {
          setInterim(undefined);
          setSegments((previous) =>
            [
              ...previous.filter((item) => item.id !== message.segmentId),
              { ...message.segment, id: message.segmentId },
            ].slice(-500),
          );
        }
        if (message.type === "card")
          setCards((previous) =>
            [
              ...previous.filter((item) => item.id !== message.card.id),
              message.card,
            ].slice(-100),
          );
        if (message.type === "error") {
          const detail = `${message.message}${message.code ? ` (${message.code})` : ""}`;
          // The backend explicitly keeps retained audio running through these
          // recoverable failures. Stopping here would discard its retry path.
          if (
            recordingPolicy === "audio_and_transcript" &&
            ["TRANSCRIPTION_DELAYED", "RECORDING_STORAGE_DELAYED"].includes(
              message.code ?? "",
            )
          )
            setError(detail);
          else interruptCurrent(detail);
        }
        if (message.type === "status" && message.status === "capture_ready") {
          if (current.recorder) return;
          if (current.timeout) clearTimeout(current.timeout);
          if (
            recordingPolicy === "audio_and_transcript" &&
            !current.transport
          ) {
            interruptCurrent(
              "The retained audio epoch was not initialized. No audio was sent.",
            );
            return;
          }
          setPhase("ready");
          const recorder = new MediaRecorder(new MediaStream(audioTracks), {
            mimeType,
          });
          current.recorder = recorder;
          current.startedAt = performance.now();
          recorder.ondataavailable = (event) => {
            if (
              !ownsCapture() ||
              event.data.size === 0 ||
              socket.readyState !== WebSocket.OPEN
            )
              return;
            const endMs = performance.now() - current.startedAt;
            if (current.transport)
              void current.transport
                .enqueue(event.data, endMs)
                .catch((failure) =>
                  interruptCurrent(
                    failure instanceof Error
                      ? failure.message
                      : "Audio save failed.",
                  ),
                );
            else {
              if (socket.bufferedAmount > 8 * 1024 * 1024) {
                interruptCurrent(
                  "Audio backlog exceeded 8 MB. Capture stopped; the unsaved tail is incomplete.",
                );
                return;
              }
              socket.send(event.data);
            }
            setBytesSent((previous) => previous + event.data.size);
          };
          recorder.onerror = () =>
            interruptCurrent(
              "The browser audio recorder failed. Capture is incomplete.",
            );
          recorder.start(1000);
          setPhase("capturing");
        }
        if (message.type === "status" && message.status === "ended") {
          current.graceful = true;
          setPhase("ended");
          generation.current += 1;
          release();
          if (mounted.current) onEndedRef.current();
        }
      };
    } catch (failure) {
      if (currentGeneration === generation.current)
        interrupt(
          failure instanceof Error
            ? failure.message
            : "Could not connect capture.",
        );
    }
  }

  const stop = useCallback(async () => {
    const current = resources.current,
      currentGeneration = generation.current;
    const ownsCapture = () =>
      currentGeneration === generation.current && resources.current === current;
    if (!current.recorder || current.recorder.state !== "recording") return;
    current.graceful = true;
    setPhase("stopping");
    current.timeout = setTimeout(() => {
      if (ownsCapture())
        interrupt(
          "Final audio was not confirmed in time. Reload the session and check retained coverage.",
        );
    }, 20000);
    try {
      await new Promise<void>((resolve) => {
        current.recorder!.addEventListener("stop", () => resolve(), {
          once: true,
        });
        current.recorder!.stop();
      });
      current.stream?.getTracks().forEach((track) => track.stop());
      await current.transport?.drain();
      if (!ownsCapture()) return;
      if (current.socket?.readyState !== WebSocket.OPEN)
        throw new Error(
          "Connection closed before capture stop was acknowledged.",
        );
      current.socket.send(
        JSON.stringify({
          type: "capture_stop",
          ...(current.transport
            ? { finalSequence: current.transport.finalSequence }
            : {}),
        }),
      );
    } catch (failure) {
      if (ownsCapture())
        interrupt(
          failure instanceof Error
            ? failure.message
            : "Could not confirm the final saved audio.",
        );
    }
  }, [interrupt]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Client navigation does not unload the document. Keep the existing
      // socket alive long enough to drain the final recorder blob and receive
      // the terminal acknowledgement; stop() retains its bounded timeout.
      if (resources.current.recorder?.state === "recording") void stop();
      else if (!resources.current.graceful) {
        generation.current += 1;
        release();
      }
    };
  }, [api, sessionId, release, stop]);
  return {
    phase,
    error,
    interim,
    segments,
    cards,
    saved,
    bytesSent,
    connect,
    stop,
    active: [
      "sharing",
      "connecting",
      "ready",
      "capturing",
      "stopping",
    ].includes(phase),
  };
}
