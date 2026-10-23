"use client";

import { ScopedLink as Link } from "../../shared/shell/ScopedLink";
import { useState } from "react";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { Badge, StatusPanel, TextInput } from "../../shared/module-ui";
import {
  SettingFacts,
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import {
  billingFlow,
  BillingStateChanged,
  requestBillingDestination,
  type BillingAction,
} from "./billingFlow";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );

export function BillingSettings() {
  const mutation = useSettingsMutation("billing");
  const { api, action, locked } = mutation;
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
  return (
    <div className={styles.stack} data-design-target="1064:246942">
      <StatusPanel
        loading={state.loading || summary.loading}
        error={state.error ?? summary.error}
        onRetry={() => {
          state.reload();
          summary.reload();
        }}
      >
        {plan && (
          <>
            {plan.status === "past_due" && (
              <SettingsNotice title="Payment needs attention" error>
                Your payment failed. Update the payment method to keep your
                workspace available.
                <div>
                  <SettingsButton
                    onClick={() =>
                      void action.run(portal, "Opening payment settings…")
                    }
                    disabled={locked || !canOpenPortal}
                  >
                    Update payment method
                  </SettingsButton>
                </div>
              </SettingsNotice>
            )}
            {state.data?.locked && (
              <SettingsNotice title="Workspace is read-only" error>
                Your workspace is locked for non-payment. The billing portal
                shows the outstanding amount and payment options.
              </SettingsNotice>
            )}
            {plan.status === "canceled" && (
              <SettingsNotice title="Plan cancelled">
                Your subscription is cancelled. Contact your account manager
                about continuing access.
              </SettingsNotice>
            )}
            {!plan.billingEnabled && (
              <SettingsNotice title="Billing is unavailable">
                Billing has not been enabled for this workspace. Contact your
                account manager.
              </SettingsNotice>
            )}
            <SettingsCard
              title="Your plan"
              description="Your current subscription and profile capacity."
              action={
                <SettingsButton
                  primary
                  disabled={locked || flow === "unavailable"}
                  onClick={() => {
                    if (canOpenPortal)
                      void action.run(portal, "Opening billing portal…");
                    else if (flow === "checkout") {
                      setQuantity(Math.max(10, plan.slots));
                      setCheckout(true);
                    }
                  }}
                >
                  {flow === "checkout" ? "Start subscription" : "Add profiles"}
                </SettingsButton>
              }
            >
              <Badge
                tone={
                  plan.status === "active" || plan.status === "comped"
                    ? "success"
                    : "warning"
                }
              >
                {plan.status}
              </Badge>
              <SettingFacts
                items={[
                  ["Profiles", `${plan.usedSlots} of ${plan.slots} used`],
                  ["Price per profile", money(plan.pricePerSlotUsd)],
                  [
                    "Capacity list price per month",
                    money(plan.slots * plan.pricePerSlotUsd),
                  ],
                  [
                    "Current period ends",
                    plan.currentPeriodEnd
                      ? new Date(plan.currentPeriodEnd).toLocaleDateString()
                      : "Not available",
                  ],
                  ["AI allowance", money(plan.llmAllowanceUsd)],
                  ["AI used", money(plan.llmUsedUsd)],
                  ["AI overage", money(plan.llmOverageUsd)],
                ]}
              />
              <p className={styles.description}>
                {canOpenPortal
                  ? "Review profile capacity and available plan changes in the billing portal."
                  : flow === "checkout"
                    ? "Start a new subscription and review its price in hosted checkout."
                    : "Profile changes are unavailable for this billing state."}
              </p>
              {state.data?.trialEndsAt && (
                <p className={styles.description}>
                  Trial ends{" "}
                  {new Date(state.data.trialEndsAt).toLocaleDateString()}.
                </p>
              )}
            </SettingsCard>
            <SettingsCard
              title="Payment method"
              description="View and update your payment method through the billing provider."
              action={
                <SettingsButton
                  disabled={locked || !canOpenPortal}
                  onClick={() =>
                    void action.run(portal, "Opening billing portal…")
                  }
                >
                  Update
                </SettingsButton>
              }
            >
              <p className={styles.description}>
                Your payment details are managed securely in the billing portal.
              </p>
            </SettingsCard>
            <SettingsCard title="Invoices and receipts">
              <SettingsButton
                disabled={locked || !canOpenPortal}
                onClick={() => void action.run(portal, "Opening invoices…")}
              >
                View and download invoices
              </SettingsButton>
            </SettingsCard>
            <SettingsCard
              title="Cancel plan"
              description="Only authorized billing administrators can manage the plan."
              action={
                <SettingsButton
                  disabled={locked || !canOpenPortal}
                  onClick={() => setCancel(true)}
                >
                  Cancel plan
                </SettingsButton>
              }
            >
              <p className={styles.description}>
                The billing provider will show your cancellation terms and
                effective date.
              </p>
            </SettingsCard>
            <p className={styles.description}>
              AI usage is included in your plan.{" "}
              <Link href="/settings/ai-usage">See where it is being used.</Link>
            </p>
          </>
        )}
      </StatusPanel>
      {action.error && (
        <SettingsNotice title="Billing action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice {...mutation} busy={action.busy} />
      <SettingsDialog
        busy={action.busy}
        open={checkout && flow === "checkout"}
        onClose={() => setCheckout(false)}
        title="Start subscription"
        description="Choose the total profile capacity for a new subscription. Review pricing in hosted checkout before payment."
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setCheckout(false)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              form="billing-checkout"
              type="submit"
              disabled={locked}
            >
              Review checkout
            </SettingsButton>
          </>
        }
      >
        <form
          className={styles.stack}
          id="billing-checkout"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(
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
          }}
        >
          <SettingField label="Total profiles">
            <TextInput
              type="number"
              min={10}
              max={100000}
              step={1}
              required
              value={quantity}
              disabled={locked}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </SettingField>
          <SettingField label="Access or promotion code (optional)">
            <TextInput
              maxLength={64}
              value={promoCode}
              disabled={locked}
              onChange={(event) => setPromoCode(event.target.value)}
            />
          </SettingField>
          {action.error && (
            <SettingsNotice title="Checkout could not be opened" error>
              {action.error}
            </SettingsNotice>
          )}
        </form>
      </SettingsDialog>
      <SettingsDialog
        busy={action.busy}
        open={cancel && canOpenPortal}
        onClose={() => setCancel(false)}
        title="Cancel Capiro?"
        description="Review your cancellation terms with the billing provider."
        footer={
          <>
            <SettingsButton disabled={locked} onClick={() => setCancel(false)}>
              Keep my plan
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() =>
                void action.run(portal, "Opening cancellation settings…")
              }
            >
              Open billing portal
            </SettingsButton>
          </>
        }
      >
        <SettingsNotice title="Cancellation is managed in the billing portal">
          The existing service does not expose the in-app cancellation, exit
          survey or contract-window API. Your plan changes only after you
          complete the hosted billing flow.
        </SettingsNotice>
        {action.error && (
          <SettingsNotice title="Billing portal could not be opened" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
