"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  billingFlow,
  BillingStateChanged,
  requestBillingDestination,
  type BillingAction,
} from "../billingFlow";
import { useSettingsMutation } from "../useSettingsMutation";

export function useBillingSettings() {
  const mutation = useSettingsMutation("billing");
  const { api, action } = mutation;
  const state = useCapiroQuery("settings.billing.state", {});
  const summary = useCapiroQuery("settings.billing.summary", {});
  const [quantity, setQuantity] = useState(10);
  const [promoCode, setPromoCode] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [cancel, setCancel] = useState(false);
  async function openBilling(request: BillingAction, signal: AbortSignal) {
    try {
      const destination = await requestBillingDestination(api, request, signal);
      signal.throwIfAborted();
      window.location.assign(destination);
    } catch (error) {
      if (error instanceof BillingStateChanged && !signal.aborted) {
        setCheckout(false);
        setCancel(false);
        state.reload();
        summary.reload();
      }
      throw error;
    }
  }
  const portal = (signal: AbortSignal) =>
    openBilling({ kind: "portal" }, signal);
  const plan = summary.data;
  const flow = billingFlow(plan, state.data);
  const canOpenPortal = flow === "portal";

  const refresh = () => {
    state.reload();
    summary.reload();
  };
  const submitCheckout = () =>
    action.run(
      (signal) =>
        openBilling(
          {
            kind: "checkout",
            body: { quantity, ...(promoCode ? { promoCode } : {}) },
          },
          signal,
        ),
      "Opening secure checkout…",
    );
  const openPlan = () => {
    if (canOpenPortal) void action.run(portal, "Opening billing portal…");
    else if (flow === "checkout" && plan) {
      setQuantity(Math.max(10, plan.slots));
      setCheckout(true);
    }
  };
  return {
    ...mutation,
    state,
    summary,
    plan,
    flow,
    canOpenPortal,
    portal,
    quantity,
    setQuantity,
    promoCode,
    setPromoCode,
    checkout,
    setCheckout,
    cancel,
    setCancel,
    refresh,
    submitCheckout,
    openPlan,
  };
}
export type BillingModel = ReturnType<typeof useBillingSettings>;
