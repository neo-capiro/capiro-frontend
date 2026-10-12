"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import {
  channelPath,
  phoneRequestSchema,
  phoneConfirmBodySchema,
  phoneRequestReceiptSchema,
  phoneConfirmReceiptSchema,
  type PhoneRequestReceipt,
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
import {
  personalPreferencesPath,
  personalPreferencesSchema,
  personalSignature,
  type PersonalPreferences,
} from "./personal-contracts";
import {
  personalPreferencesKey,
  capturePreferenceReview,
} from "./personal-queries";
import { savedPhoneValue } from "./core-contracts";
import { intelSavedPhoneValue } from "./contracts";

type Challenge = {
  phone: string;
  source: string;
  receipt: PhoneRequestReceipt;
};
type PhoneStatus = {
  error: Error | null;
  verifiedSource: string;
  reviewed: boolean;
};
const initialStatus: PhoneStatus = {
  error: null,
  verifiedSource: "",
  reviewed: false,
};
const actionError = (error: unknown) =>
  error instanceof Error
    ? error
    : new Error("The phone verification request could not be confirmed.");

/** OTP request/confirmation owner. Native confirmation also enables SMS. */
export function usePhoneVerification(
  view: ChannelView,
  onVerified: (record: PersonalPreferences) => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useChannelScope(view);
  const { key, attempt } = useChannelAttempt(
    view.clientId,
    view.owner,
    "phone",
  );
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const savedSignature = personalSignature(view.baseline, view.owner);
  const phone =
    view.owner.backend === "core"
      ? savedPhoneValue(view.baseline.smsPhone)
      : intelSavedPhoneValue(view.baseline.smsPhone);
  const phoneReady = Boolean(
    phone && phoneRequestSchema.safeParse({ phone }).success,
  );
  const currentChallenge =
    view.available &&
    challenge?.phone === phone &&
    challenge.source === savedSignature
      ? challenge
      : null;
  const available = view.available && phoneReady;
  const busy = attempt?.status === "pending";
  const unknown = attempt?.status === "unknown";
  function preserveUnknownConfirmation(token: number) {
    finishChannelAttempt(cache, key, token, true);
    void cache.invalidateQueries({
      queryKey: personalPreferencesKey(view.clientId, view.owner),
      refetchType: "none",
    });
  }

  async function requestCode() {
    if (!available || attempt || !phone) return;
    let operation: ChannelOperation | undefined;
    let token: number | undefined;
    try {
      operation = scope.begin((dispatched) => {
        if (token !== undefined)
          finishChannelAttempt(cache, key, token, dispatched);
      });
      const body = phoneRequestSchema.parse({ phone });
      token = beginChannelAttempt(cache, key, "start").token;
      setStatus(initialStatus);
      setChallenge(null);
      setCode("");
      scope.assert(operation);
      operation.dispatched = true;
      const receipt = await api.request(
        view.owner.backend,
        channelPath(view.clientId, view.owner.backend, "sms/verify/start"),
        phoneRequestReceiptSchema,
        { method: "POST", body, signal: operation.controller.signal },
      );
      scope.finish(operation);
      finishChannelAttempt(cache, key, token, false);
      setChallenge({ phone, source: savedSignature, receipt });
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
        setStatus({ ...initialStatus, error: actionError(error) });
    } finally {
      if (operation) scope.release(operation);
    }
  }

  async function confirmPhone() {
    if (
      !available ||
      attempt ||
      !phone ||
      !currentChallenge ||
      !/^\d{6}$/.test(code)
    )
      return;
    let operation: ChannelOperation | undefined;
    let token: number | undefined;
    let confirmationReceived = false;
    try {
      operation = scope.begin((dispatched) => {
        if (token !== undefined)
          if (dispatched) preserveUnknownConfirmation(token);
          else finishChannelAttempt(cache, key, token, false);
      });
      const body = phoneConfirmBodySchema.parse({ phone, code });
      token = beginChannelAttempt(cache, key, "confirm").token;
      setStatus(initialStatus);
      scope.assert(operation);
      operation.dispatched = true;
      await api.request(
        view.owner.backend,
        channelPath(view.clientId, view.owner.backend, "sms/verify/confirm"),
        phoneConfirmReceiptSchema(phone),
        { method: "POST", body, signal: operation.controller.signal },
      );
      confirmationReceived = true;
      scope.assert(operation);
      // This read checks saved preferences; it never resends a code or test.
      const record = await api.request(
        view.owner.backend,
        personalPreferencesPath(view.clientId, view.owner),
        personalPreferencesSchema(view.clientId, view.owner),
        { signal: operation.controller.signal },
      );
      scope.assert(operation);
      if (
        !record.smsPhoneVerified ||
        !record.smsEnabled ||
        record.smsPhone !== phone
      )
        throw new Error(
          "The verification response arrived, but the saved SMS settings could not be confirmed. Reload saved preferences.",
        );
      scope.finish(operation);
      cache.setQueryData(
        personalPreferencesKey(view.clientId, view.owner),
        record,
      );
      finishChannelAttempt(cache, key, token, false);
      onVerified(record);
      setChallenge(null);
      setCode("");
      setStatus({
        ...initialStatus,
        verifiedSource: personalSignature(record, view.owner),
      });
    } catch (error) {
      const publishError = operation && !operation.finished;
      if (token !== undefined) {
        const uncertain = Boolean(
          operation?.dispatched &&
          (operation.controller.signal.aborted ||
            confirmationReceived ||
            ambiguousClientWrite(error)),
        );
        if (operation) scope.release(operation);
        if (uncertain) preserveUnknownConfirmation(token);
        else finishChannelAttempt(cache, key, token, false);
      }
      if (publishError)
        setStatus({ ...initialStatus, error: actionError(error) });
    } finally {
      if (operation) scope.release(operation);
    }
  }

  function review() {
    if (!unknown || !view.available) return;
    try {
      capturePreferenceReview(cache, view.clientId, view.owner, view.baseline);
      finishChannelAttempt(cache, key, attempt.token, false);
      setChallenge(null);
      setCode("");
      setStatus({ ...initialStatus, reviewed: true });
    } catch (error) {
      setStatus({ ...initialStatus, error: actionError(error) });
    }
  }
  return {
    challenge: currentChallenge,
    code,
    setCode,
    status: {
      ...status,
      verified:
        status.verifiedSource === savedSignature &&
        view.baseline.smsPhoneVerified &&
        view.baseline.smsEnabled,
    },
    available,
    busy,
    unknown,
    requestCode,
    confirmPhone,
    review,
  };
}
