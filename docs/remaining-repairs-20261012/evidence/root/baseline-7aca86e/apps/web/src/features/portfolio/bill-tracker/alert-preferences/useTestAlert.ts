"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import {
  channelPath,
  testAlertBodySchema,
  testAlertReceiptSchema,
  type TestChannel,
  type TestAlertResult,
} from "./channel-contracts";
import {
  beginChannelAttempt,
  finishChannelAttempt,
  useChannelAttempt,
} from "./channel-attempts";
import {
  useChannelScope,
  type ChannelView,
  type ChannelOperation,
} from "./channel-scope";
import { capturePreferenceReview } from "./personal-queries";
import { personalSignature } from "./personal-contracts";

type TestStatus = {
  error: Error | null;
  results: TestAlertResult[] | null;
  source: string;
  reviewed: boolean;
};
const empty: TestStatus = {
  error: null,
  results: null,
  source: "",
  reviewed: false,
};
const actionError = (error: unknown) =>
  error instanceof Error
    ? error
    : new Error("The test alert result could not be confirmed.");

/** A deliberate test of current saved destinations; never scheduled or replayed. */
export function useTestAlert(view: ChannelView) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useChannelScope(view);
  const { key, attempt } = useChannelAttempt(view.clientId, view.owner, "test");
  const [selected, setSelected] = useState<TestChannel[]>(["email"]);
  const [status, setStatus] = useState<TestStatus>(empty);
  const savedSignature = personalSignature(view.baseline, view.owner);
  const enabled: Record<TestChannel, boolean> = {
    email: Boolean(view.baseline.emailEnabled && view.baseline.emailAddress),
    sms: Boolean(
      view.baseline.smsEnabled &&
      view.baseline.smsPhoneVerified &&
      view.baseline.smsPhone,
    ),
  };
  const channels = selected.filter((channel) => enabled[channel]);
  const busy = attempt?.status === "pending";
  const unknown = attempt?.status === "unknown";
  const available = view.available && channels.length > 0;
  function choose(channel: TestChannel, checked: boolean) {
    if (attempt) return;
    setSelected((values) =>
      checked
        ? [...new Set([...values, channel])]
        : values.filter((value) => value !== channel),
    );
    setStatus(empty);
  }
  async function sendTest() {
    if (!available || attempt) return;
    let operation: ChannelOperation | undefined;
    let token: number | undefined;
    try {
      operation = scope.begin((dispatched) => {
        if (token !== undefined)
          finishChannelAttempt(cache, key, token, dispatched);
      });
      const body = testAlertBodySchema.parse({ channels });
      token = beginChannelAttempt(cache, key, "test").token;
      setStatus(empty);
      scope.assert(operation);
      operation.dispatched = true;
      const results = await api.request(
        view.owner.backend,
        channelPath(view.clientId, view.owner.backend, "test-alert"),
        testAlertReceiptSchema(body.channels),
        { method: "POST", body, signal: operation.controller.signal },
      );
      scope.finish(operation);
      finishChannelAttempt(cache, key, token, false);
      setStatus({ ...empty, results, source: savedSignature });
    } catch (error) {
      if (token !== undefined)
        finishChannelAttempt(
          cache,
          key,
          token,
          Boolean(
            operation?.dispatched &&
            (operation.controller.signal.aborted ||
              ambiguousClientWrite(error)),
          ),
        );
      if (operation && !operation.finished)
        setStatus({ ...empty, error: actionError(error) });
    } finally {
      if (operation) scope.release(operation);
    }
  }
  function review() {
    if (!unknown || !view.available) return;
    try {
      capturePreferenceReview(cache, view.clientId, view.owner, view.baseline);
      finishChannelAttempt(cache, key, attempt.token, false);
      setStatus({ ...empty, reviewed: true });
    } catch (error) {
      setStatus({ ...empty, error: actionError(error) });
    }
  }
  return {
    channels,
    enabled,
    choose,
    busy,
    unknown,
    available,
    status: {
      ...status,
      results: status.source === savedSignature ? status.results : null,
    },
    sendTest,
    review,
  };
}
