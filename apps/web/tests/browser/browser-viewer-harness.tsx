import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BROWSER_VIEWER_SCHEMA as schema } from "@capiro/meri-contracts/browser-viewer";
import { createBrowserViewerTransport } from "../../src/shared/meri-browser/transport";
import { BrowserViewerController } from "../../src/shared/meri-browser/viewer-controller";
import { BrowserViewer } from "../../src/features/meri/browser/BrowserViewer";
import "../../src/app/globals.css";
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const context = {
  tenantId: id(1),
  actorId: id(2),
  conversationId: id(3),
  runId: id(4),
  selectedClientId: null,
};
const lifetime = new AbortController(),
  events: string[] = [];
let state: "agent" | "user" | "returning" = "agent",
  lost = false,
  notify = () => {},
  connectRequestId = id(8),
  sequence = 10;
const image = document.createElement("canvas");
image.width = 320;
image.height = 180;
const drawing = image.getContext("2d")!;
drawing.fillStyle = "#f5f5f5";
drawing.fillRect(0, 0, 320, 180);
drawing.fillStyle = "#111";
drawing.font = "18px sans-serif";
drawing.fillText("Synthetic remote document", 20, 80);
const data = image.toDataURL("image/png").split(",")[1]!;
const transport = createBrowserViewerTransport({
  credential: `action_session_${"a".repeat(43)}`,
  context,
  lifetime: lifetime.signal,
  isCurrent: () => !lifetime.signal.aborted,
  onAccessLost: () => lifetime.abort(),
  fetcher: async (url, init) => {
    const route = String(url).split("/").at(-1)!,
      q = JSON.parse(String(init?.body));
    events.push(route);
    notify();
    const base = { schema, context, ownerId: id(5), requestId: q.requestId },
      lease = {
        viewerId: id(7),
        leaseEpoch: 1,
        expiresAtMs: Date.now() + 60000,
        connectRequestId,
      };
    if (route === "read")
      return Response.json({
        schema,
        context,
        binding: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          conversationId: context.conversationId,
          runId: context.runId,
          attemptId: id(20),
          workerId: id(21),
          writerFence: 1,
        },
        checkpoint:
          state === "agent"
            ? null
            : { checkpointId: context.runId, checkpointSha256: "a".repeat(64) },
        ownerId: id(5),
        state,
        lease: state === "user" ? lease : null,
        pages:
          state === "user"
            ? [{ pageId: id(9), origin: "https://example.test" }]
            : [],
      });
    if (route === "ticket")
      return Response.json({
        ...base,
        ticket: "T".repeat(43),
        expiresAtMs: Date.now() + 10000,
      });
    if (route === "connect") {
      state = "user";
      connectRequestId = q.requestId;
      return Response.json({
        ...base,
        state,
        lease: { ...lease, connectRequestId },
      });
    }
    if (route === "frame")
      return Response.json({
        ...base,
        viewerId: id(7),
        leaseEpoch: 1,
        frame: {
          frameId: crypto.randomUUID().replaceAll("-", "") + "F".repeat(11),
          pageId: id(9),
          width: 320,
          height: 180,
          image: { mimeType: "image/png", data },
        },
      });
    if (route === "input") {
      if (lost) throw Error("Lost acknowledgement");
      return Response.json({
        ...base,
        viewerId: id(7),
        leaseEpoch: 1,
        accepted: true,
      });
    }
    if (route === "release") {
      state = "returning";
      return Response.json({ ...base, viewerId: id(7), leaseEpoch: 1, state });
    }
    throw Error("Unexpected route");
  },
});
const controller = new BrowserViewerController({
  transport,
  lifetime: lifetime.signal,
  expiresAtMs: Date.now() + 120000,
  uuid: () => id(sequence++),
});
function Harness() {
  const [, render] = useState(0);
  useEffect(() => {
    notify = () => render((value) => value + 1);
    return () => {
      notify = () => {};
    };
  }, []);
  return (
    <main>
      <h1>Native viewer component qualification</h1>
      <BrowserViewer controller={controller} />
      <button
        onClick={() => {
          lost = true;
        }}
      >
        Lose next input ACK
      </button>
      <button onClick={() => lifetime.abort()}>Expire session</button>
      <output aria-label="Service operations">{events.join(",")}</output>
      <output aria-label="Serialized port">{JSON.stringify(controller)}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
