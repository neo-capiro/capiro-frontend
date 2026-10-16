"use client";
import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
} from "@capiro/ui/web-preview";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import styles from "./web.module.css";

/**
 * Adopted WebPreview: static synthetic HTML in an iframe with an empty sandbox
 * (no scripts, forms, popups or same-origin access).
 */
export function WebPreviewPanel({
  fileName,
  html,
  note,
}: {
  fileName: string;
  html: string;
  note: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [reloads, setReloads] = useState(0);
  const [phone, setPhone] = useState(false);
  const [message, setMessage] = useState("");
  const fullScreen = () => {
    const node = frame.current;
    if (!node?.requestFullscreen) {
      setMessage("Full screen is not available in this browser.");
      return;
    }
    node.requestFullscreen().catch(() => {
      setMessage("Full screen is not available in this browser.");
    });
  };
  return (
    <>
      <WebPreview ref={frame} className={styles.preview}>
        <WebPreviewNavigation className={styles.navigation}>
          <button
            type="button"
            className={ui.ghost}
            onClick={() => {
              setReloads((count) => count + 1);
              setMessage("Preview reloaded from the same static version.");
            }}
          >
            Refresh
          </button>
          <p className={styles.address}>Preview · {fileName}</p>
          <button
            type="button"
            className={ui.outline}
            aria-pressed={phone}
            title="Switch between desktop and phone width"
            onClick={() => setPhone((value) => !value)}
          >
            {phone ? "Phone" : "Desktop"}
          </button>
          <button type="button" className={ui.ghost} onClick={fullScreen}>
            <ArrowUpRight aria-hidden /> Full screen
          </button>
        </WebPreviewNavigation>
        <WebPreviewBody
          key={reloads}
          className={`${styles.frame} ${phone ? styles.phone : ""}`}
          sandbox=""
          srcDoc={html}
          title={`Isolated preview of ${fileName}`}
        />
        <p className={shared.caption}>{note}</p>
      </WebPreview>
      <p className={shared.liveStatus} role="status">
        {message}
      </p>
    </>
  );
}
