"use client";

import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { SettingsNotice } from "../components";
import {
  consumeOAuthOutcome,
  oauthOutcomeNotice,
  type OAuthOutcome,
  type OutcomeNotice,
} from "./outcomes";

export function OAuthOutcomeNotice({
  currentConnections,
}: {
  currentConnections?: readonly unknown[];
}) {
  const api = useCapiro();
  const outcome = useRef<OAuthOutcome | null | undefined>(undefined);
  const [notice, setNotice] = useState<{
    api: typeof api;
    value: OutcomeNotice;
    readFailed?: boolean;
    currentConnections: typeof currentConnections;
    revision: number;
  }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (outcome.current === undefined) {
      const url = new URL(window.location.href);
      outcome.current = consumeOAuthOutcome(url);
      if (url.href !== window.location.href)
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
    }
    const hint = outcome.current;
    if (!hint) return;
    const controller = new AbortController();
    // A new read is required even when the screen already has cached rows.
    api
      .request("settings.integrations.list", {}, { signal: controller.signal })
      .then(
        (rows) => {
          if (!controller.signal.aborted)
            setNotice({
              api,
              currentConnections,
              revision,
              value: oauthOutcomeNotice(hint, rows),
            });
        },
        () => {
          if (!controller.signal.aborted)
            setNotice({
              api,
              currentConnections,
              revision,
              readFailed: true,
              value: {
                title: "Connection status unavailable",
                error: true,
                message:
                  "The current account list could not be read. Reload integrations to confirm the result of sign-in.",
              },
            });
        },
      );
    return () => controller.abort();
  }, [api, currentConnections, revision]);
  if (
    notice?.api !== api ||
    notice.currentConnections !== currentConnections ||
    notice.revision !== revision
  )
    return null;
  return (
    <SettingsNotice
      title={notice.value.title}
      error={notice.value.error}
      retry={
        notice.readFailed ? () => setRevision((value) => value + 1) : undefined
      }
    >
      {notice.value.message}
    </SettingsNotice>
  );
}
