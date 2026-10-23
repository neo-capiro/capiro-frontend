"use client";
import { StatusPanel } from "../../shared/module-ui";
import { SettingsNotice } from "./components";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
import {
  BillingPlan,
  BillingServices,
  BillingStatus,
} from "./billing/BillingPlan";
import { BillingCancellation, BillingCheckout } from "./billing/BillingDialogs";
import { useBillingSettings } from "./billing/useBillingSettings";
import styles from "./styles";

export function BillingSettings() {
  const model = useBillingSettings();
  const { state, summary, action } = model;
  return (
    <div className={styles.stack} data-design-target="1064:246942">
      <StatusPanel
        loading={state.loading || summary.loading}
        error={state.error ?? summary.error}
        onRetry={model.refresh}
      >
        {model.plan && (
          <>
            <BillingStatus model={model} />
            <BillingPlan model={model} />
            <BillingServices model={model} />
          </>
        )}
      </StatusPanel>
      {action.error && (
        <SettingsNotice title="Billing action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice {...model} busy={action.busy} />
      <BillingCheckout model={model} />
      <BillingCancellation model={model} />
    </div>
  );
}
