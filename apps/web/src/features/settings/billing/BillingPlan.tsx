import { ScopedLink as Link } from "../../../shared/shell/ScopedLink";
import { Badge } from "../../../shared/module-ui";
import {
  SettingFacts,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import type { BillingModel } from "./useBillingSettings";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export function BillingStatus({ model }: { model: BillingModel }) {
  const { plan, state, action, portal, locked, canOpenPortal } = model;
  if (!plan) return null;
  return (
    <>
      {plan.status === "past_due" && (
        <SettingsNotice title="Payment needs attention" error>
          Your payment failed. Update the payment method to keep your workspace
          available.
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
          Your workspace is locked for non-payment. The billing portal shows the
          outstanding amount and payment options.
        </SettingsNotice>
      )}
      {plan.status === "canceled" && (
        <SettingsNotice title="Plan cancelled">
          Your subscription is cancelled. Contact your account manager about
          continuing access.
        </SettingsNotice>
      )}
      {!plan.billingEnabled && (
        <SettingsNotice title="Billing is unavailable">
          Billing has not been enabled for this workspace. Contact your account
          manager.
        </SettingsNotice>
      )}
    </>
  );
}

export function BillingPlan({ model }: { model: BillingModel }) {
  const { plan, state, flow, locked, canOpenPortal } = model;
  if (!plan) return null;
  return (
    <>
      <SettingsCard
        title="Your plan"
        description="Your current subscription and profile capacity."
        action={
          <SettingsButton
            primary
            disabled={locked || flow === "unavailable"}
            onClick={model.openPlan}
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
            Trial ends {new Date(state.data.trialEndsAt).toLocaleDateString()}.
          </p>
        )}
      </SettingsCard>
    </>
  );
}

export function BillingServices({ model }: { model: BillingModel }) {
  const { action, portal, locked, canOpenPortal, setCancel } = model;
  return (
    <>
      <SettingsCard
        title="Payment method"
        description="View and update your payment method through the billing provider."
        action={
          <SettingsButton
            disabled={locked || !canOpenPortal}
            onClick={() => void action.run(portal, "Opening billing portal…")}
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
          The billing provider will show your cancellation terms and effective
          date.
        </p>
      </SettingsCard>
      <p className={styles.description}>
        AI usage is included in your plan.{" "}
        <Link href="/settings/ai-usage">See where it is being used.</Link>
      </p>
    </>
  );
}
