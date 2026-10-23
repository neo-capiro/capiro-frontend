import { TextInput } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import type { BillingModel } from "./useBillingSettings";
export function BillingCheckout({ model }: { model: BillingModel }) {
  const {
    action,
    locked,
    checkout,
    flow,
    setCheckout,
    quantity,
    setQuantity,
    promoCode,
    setPromoCode,
  } = model;
  return (
    <SettingsDialog
      busy={action.busy}
      open={checkout && flow === "checkout"}
      onClose={() => setCheckout(false)}
      title="Start subscription"
      description="Choose the total profile capacity for a new subscription. Review pricing in hosted checkout before payment."
      footer={
        <>
          <SettingsButton disabled={locked} onClick={() => setCheckout(false)}>
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
          void model.submitCheckout();
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
  );
}
export function BillingCancellation({ model }: { model: BillingModel }) {
  const { action, locked, cancel, canOpenPortal, setCancel, portal } = model;
  return (
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
        Review and confirm cancellation in the billing portal. Your plan changes
        only after you complete that flow.
      </SettingsNotice>
      {action.error && (
        <SettingsNotice title="Billing portal could not be opened" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
