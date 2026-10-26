"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsletterOutreachStage } from "@capiro/shared/newsletter";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";

type Destination = { kind: "stage"; id: string };
type Adapter = ReturnType<typeof createRichNewsletterAdapter>;
type Read = {
  stage: NewsletterOutreachStage;
};

/** Disposable receiving state; Core alone owns access and conditional draft reuse. */
export function useNewsletterReceiver(
  destination: Destination,
  clientId?: string,
) {
  const api = useCapiro();
  const adapter = useMemo(() => createRichNewsletterAdapter(api), [api]);
  const [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([destination, clientId, refresh]);
  const [read, setRead] = useState<{
    adapter: Adapter;
    key: string;
    value?: Read;
    error?: Error;
  }>();
  const [write, setWrite] = useState<{
    adapter: Adapter;
    status: "pending" | "unknown";
    revision: number;
  }>();
  const active = useRef<AbortController | null>(null);
  const { kind, id } = destination;

  useEffect(() => {
    const controller = new AbortController();
    const expected = clientId === undefined ? {} : { clientId };
    const request = adapter
      .stageDetail(id, expected, controller.signal)
      .then((stage) => ({ stage }));
    void request.then(
      (value) => {
        if (!controller.signal.aborted) setRead({ adapter, key, value });
      },
      () => {
        if (!controller.signal.aborted)
          setRead({
            adapter,
            key,
            error: new Error(
              "This newsletter is unavailable for your current access or does not match this link.",
            ),
          });
      },
    );
    return () => controller.abort();
  }, [adapter, kind, id, clientId, key]);

  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [adapter, kind, id, clientId],
  );

  const current =
    read?.adapter === adapter && read.key === key ? read : undefined;
  const currentWrite = write?.adapter === adapter ? write : undefined;
  async function open() {
    if (!current?.value || currentWrite || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const revision = current.value.stage.revision;
    setWrite({ adapter, status: "pending", revision });
    try {
      const record = await adapter.open(current.value.stage, controller.signal);
      if (!controller.signal.aborted) return record;
    } catch {
      // Even a refused response may follow a committed create. Never replay here.
      if (!controller.signal.aborted)
        setWrite({ adapter, status: "unknown", revision });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return {
    loading: !current,
    error: current?.error,
    stage:
      currentWrite?.status === "unknown" ? undefined : current?.value?.stage,
    pending: currentWrite?.status === "pending",
    unknown: currentWrite?.status === "unknown",
    requestedRevision: currentWrite?.revision,
    refresh: () => {
      if (!currentWrite) setRefresh((value) => value + 1);
    },
    open,
  };
}
