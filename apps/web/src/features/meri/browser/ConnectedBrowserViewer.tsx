"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@capiro/ui/button";
import { BrowserViewerHost } from "../../../shared/meri-browser/host-controller";
import type { BrowserResumeTarget } from "../../../shared/meri-browser/resume";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { BrowserViewer } from "./BrowserViewer";
import ui from "../ui/meri-ui.module.css";
import styles from "../conversation/live.module.css";

/** Keyed by the native account and exact selected run; independent of the chat stream's credential. */
export function ConnectedBrowserViewer(props: {
  account: ConversationAccount;
  clientId: string | null;
  conversationId: string;
  runId: string;
  onTarget: (target: BrowserResumeTarget) => void;
}) {
  const [host] = useState(
    () =>
      new BrowserViewerHost({
        account: props.account,
        hints: {
          clientId: props.clientId,
          conversationId: props.conversationId,
          runId: props.runId,
        },
        onTarget: props.onTarget,
      }),
  );
  useLayoutEffect(() => {
    host.setOnTarget(props.onTarget);
  }, [host, props.onTarget]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  useEffect(() => {
    const detach = host.attach();
    void host.connect();
    return detach;
  }, [host]);
  useEffect(() => {
    if (
      state.status === "expired" &&
      ["renewal", "expiry"].includes(host.getExpirationReason() ?? "")
    )
      void host.connect();
  }, [host, state.status]);
  if (state.status === "ready")
    return <BrowserViewer controller={state.port} />;
  return (
    <details className={styles.runControls}>
      <summary>Browser control</summary>
      <p role="status">
        {state.status === "connecting"
          ? "Connecting browser access…"
          : "Browser access is unavailable. Reconnect to check the current browser and recover a pending resume."}
      </p>
      <Button
        type="button"
        className={ui.outline}
        disabled={state.status === "connecting"}
        onClick={() => void host.connect()}
      >
        Reconnect browser access
      </Button>
    </details>
  );
}
