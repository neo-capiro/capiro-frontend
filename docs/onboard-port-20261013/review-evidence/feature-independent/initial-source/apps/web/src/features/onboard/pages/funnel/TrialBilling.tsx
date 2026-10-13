import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { preparedStripeIntentId } from "../../lib/stripe-confirmation";
import { routeForState } from "../../lib/funnel-routes";
import React from "react";
import { useNavigate } from "../../navigation";
import { StripePayment, STRIPE_PAYMENT_AVAILABLE } from "./StripePayment";
import {
  Btn,
  Card,
  Field,
  FunnelShell,
  Icon,
  ScreenTitle,
  TextInput,
} from "../../ui/primitives";
import { useConfig } from "../../useConfig";
import {
  useAdvanceSession,
  useFunnelApi,
  type FunnelSession,
  type PayMethod,
} from "../../lib/funnel";
import { ErrorText, errorMessage } from "./shared";
import { EMAIL_RE, notConfiguredNote, TabBtn } from "./BillingControls";

export function TrialBilling({ session }: { session: FunnelSession }) {
  const config = useConfig();
  const navigate = useNavigate();
  const api = useFunnelApi();
  const advanceSession = useAdvanceSession();
  const prepare = useOnboardAttempt(api, "trial-setup-intent");
  const write = useOnboardAttempt(api, "trial-complete");
  const stripeConfirmation = useOnboardAttempt(
    api,
    "trial-stripe-confirmation",
  );
  const stripePk = STRIPE_PAYMENT_AVAILABLE
    ? config.stripePublishableKey
    : null;

  const [tab, setTabState] = React.useState<PayMethod>(
    session.payMethod ?? "card",
  );
  const [secrets, setSecrets] = React.useState<
    Partial<Record<"card" | "ach", string>>
  >({});
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [wireBusy, setWireBusy] = React.useState(false);
  const [wireError, setWireError] = React.useState<string | null>(null);
  const [billingContact, setBillingContact] = React.useState(session.email);

  const billingContactTrimmed = billingContact.trim();
  const billingContactInvalid =
    billingContactTrimmed.length > 0 && !EMAIL_RE.test(billingContactTrimmed);

  const setTab = (id: PayMethod) => {
    if (prepare.blocked() || write.blocked() || stripeConfirmation.read())
      return;
    setSecrets({});
    setTabState(id);
    setSetupError(null);
    setWireError(null);
  };

  const prepareMethod = async () => {
    if (
      tab === "wire" ||
      !stripePk ||
      prepare.blocked() ||
      stripeConfirmation.read()
    )
      return;
    const method = tab;
    try {
      await prepare.run(`Prepare ${method} for the trial`, async (guard) => {
        const result = await guard.wait(() => api.createSetupIntent(method));
        if (!result.clientSecret)
          throw new Error(
            "A payment confirmation was not returned. Check current setup before starting another attempt.",
          );
        setSecrets({ [method]: result.clientSecret });
      });
    } catch (err) {
      setSetupError(errorMessage(err));
    }
  };
  const completeTrial = async (method: PayMethod) => {
    if (method !== tab)
      throw new Error("The payment method changed. Review the current method.");
    const secret = method === "wire" ? undefined : secrets[method];
    if (method !== "wire" && !secret)
      throw new Error("Prepare the current payment method first.");
    const setupIntentId = secret
      ? preparedStripeIntentId(secret, "setup")
      : undefined;
    if (secret && !setupIntentId)
      throw new Error("The current payment intent is unavailable.");
    await write.run(`Confirm ${method} for this trial`, async (guard) => {
      await guard.wait(() =>
        api.trialComplete({
          method,
          ...(setupIntentId ? { setupIntentId } : {}),
          ...(method === "wire" &&
          billingContactTrimmed &&
          !billingContactInvalid
            ? { billingContact: billingContactTrimmed }
            : {}),
        }),
      );
      const current = await guard.wait(() => advanceSession(guard));
      navigate(routeForState(current.state));
    });
  };
  const checkCurrent = async () => {
    const guard = write.guard();
    try {
      const current = await guard.wait(() => advanceSession(guard));
      navigate(routeForState(current.state));
    } catch (err) {
      if (guard.current()) setWireError(errorMessage(err));
    }
  };

  const completeWire = async () => {
    if (wireBusy || write.blocked()) return;
    setWireBusy(true);
    setWireError(null);
    try {
      await completeTrial("wire");
    } catch (err) {
      setWireError(errorMessage(err));
      setWireBusy(false);
    }
  };

  const cardNote = (
    <div
      style={{
        marginTop: 12,
        fontSize: 11.5,
        color: "var(--ink-3)",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon name="Lock" size={11} />
      Card stored securely — no charge until day 31.
    </div>
  );

  const achNote = (
    <div
      style={{ fontSize: 11.5, color: "var(--ink-3)", display: "flex", gap: 6 }}
    >
      <Icon name="Clock" size={12} style={{ marginTop: 1 }} />
      No charge today. If your trial converts on day 31, your bank account is
      debited then — ACH takes 1–3 business days to clear.
    </div>
  );

  return (
    <FunnelShell step={4} maxWidth={520}>
      <AttemptStatus
        record={prepare.record}
        check={() => void checkCurrent()}
      />
      <AttemptStatus record={write.record} check={() => void checkCurrent()} />
      <AttemptStatus
        record={stripeConfirmation.record}
        check={() => void checkCurrent()}
      />
      {stripeConfirmation.record?.phase === "confirmed" && (
        <div role="status">
          <p>
            Payment confirmation returned. Check current setup if the next step
            is unavailable.
          </p>
          <Btn onClick={() => void checkCurrent()}>Check current setup</Btn>
        </div>
      )}
      <PendingFields
        disabled={
          prepare.locked ||
          write.locked ||
          stripeConfirmation.locked ||
          stripeConfirmation.record?.phase === "confirmed"
        }
      >
        <ScreenTitle
          kicker="Free trial"
          title="Add a payment method to start your trial"
          sub={
            <span>
              You won&apos;t be charged today. Your trial converts to a paid
              subscription on <b style={{ color: "var(--ink-1)" }}>day 31</b>{" "}
              unless you cancel — that&apos;s when your selected method is first
              charged.
            </span>
          }
        />
        <Card pad={0}>
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-1)",
              padding: "0 12px",
            }}
          >
            <TabBtn id="card" label="Card" tab={tab} setTab={setTab} />
            <TabBtn id="wire" label="Wire" tab={tab} setTab={setTab} />
            <TabBtn id="ach" label="ACH" tab={tab} setTab={setTab} />
          </div>
          <div style={{ padding: 20 }}>
            {tab === "card" &&
              (stripePk && secrets.card ? (
                <StripePayment
                  publishableKey={stripePk}
                  clientSecret={secrets.card}
                  mode="setup"
                  method="card"
                  attemptName="trial-stripe-confirmation"
                  label="Start Free Trial"
                  onDone={() => completeTrial("card")}
                  note={cardNote}
                />
              ) : (
                <>
                  {stripePk ? (
                    <>
                      <Btn
                        disabled={prepare.locked}
                        onClick={() => void prepareMethod()}
                      >
                        Prepare payment method
                      </Btn>
                      {setupError && <ErrorText>{setupError}</ErrorText>}
                    </>
                  ) : (
                    notConfiguredNote
                  )}
                  {cardNote}
                  <Btn
                    variant="primary"
                    disabled
                    style={{ width: "100%", marginTop: 18 }}
                  >
                    Start Free Trial
                  </Btn>
                </>
              ))}
            {tab === "wire" && (
              <>
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      background: "var(--accent-soft)",
                      borderRadius: 6,
                      padding: "12px 14px",
                      fontSize: 12.5,
                      color: "var(--accent-ink)",
                      lineHeight: 1.55,
                      display: "flex",
                      gap: 9,
                    }}
                  >
                    <Icon name="Landmark" size={16} style={{ marginTop: 1 }} />
                    <span>
                      No charge today. If your trial converts on day 31, bank
                      wire instructions and an invoice are emailed to{" "}
                      <b>{session.email}</b>. Cancel before then and nothing is
                      billed.
                    </span>
                  </div>
                  <Field label="Billing contact (for invoice)">
                    <>
                      <TextInput
                        value={billingContact}
                        onChange={(e) => setBillingContact(e.target.value)}
                      />
                      {billingContactInvalid && (
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "var(--critical)",
                            lineHeight: 1.45,
                          }}
                        >
                          Enter a valid email address for the invoice recipient.
                        </span>
                      )}
                    </>
                  </Field>
                </div>
                {wireError && <ErrorText>{wireError}</ErrorText>}
                <Btn
                  variant="primary"
                  disabled={wireBusy || billingContactInvalid}
                  onClick={() => void completeWire()}
                  style={{ width: "100%", marginTop: 18 }}
                >
                  Start Free Trial
                </Btn>
              </>
            )}
            {tab === "ach" &&
              (stripePk && secrets.ach ? (
                <StripePayment
                  publishableKey={stripePk}
                  clientSecret={secrets.ach}
                  mode="setup"
                  method="ach"
                  attemptName="trial-stripe-confirmation"
                  label="Start Free Trial"
                  onDone={() => completeTrial("ach")}
                  note={achNote}
                />
              ) : (
                <>
                  <div style={{ display: "grid", gap: 12 }}>
                    {stripePk ? (
                      <>
                        <Btn
                          disabled={prepare.locked}
                          onClick={() => void prepareMethod()}
                        >
                          Prepare payment method
                        </Btn>
                        {setupError && <ErrorText>{setupError}</ErrorText>}
                      </>
                    ) : (
                      notConfiguredNote
                    )}
                    {achNote}
                  </div>
                  <Btn
                    variant="primary"
                    disabled
                    style={{ width: "100%", marginTop: 18 }}
                  >
                    Start Free Trial
                  </Btn>
                </>
              ))}
          </div>
        </Card>
      </PendingFields>
    </FunnelShell>
  );
}
