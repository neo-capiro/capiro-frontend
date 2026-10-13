import { validateOnboardInvoiceUrl } from "@/shared/capiro/onboard-navigation";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
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

export function PaidBilling({ session }: { session: FunnelSession }) {
  const config = useConfig();
  const navigate = useNavigate();
  const api = useFunnelApi();
  const advanceSession = useAdvanceSession();
  const write = useOnboardAttempt(api, "paid-subscription");
  const check = useOnboardAttempt(api, "paid-status-check");
  const stripeConfirmation = useOnboardAttempt(api, "paid-stripe-confirmation");
  const stripePk = STRIPE_PAYMENT_AVAILABLE
    ? config.stripePublishableKey
    : null;

  const [profiles, setProfiles] = React.useState<number>(
    Math.max(10, session.profiles ?? 10),
  );
  const [tab, setTabState] = React.useState<PayMethod>(
    session.payMethod ?? "card",
  );
  const [confirm, setConfirm] = React.useState<{
    method: "card" | "ach";
    clientSecret: string;
  } | null>(null);
  const [invoiceUrl, setInvoiceUrl] = React.useState<string | null>(null);
  const [billingContact, setBillingContact] = React.useState(session.email);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const n = Math.max(10, profiles || 10);
  const price = (n * 200).toLocaleString();

  const billingContactTrimmed = billingContact.trim();
  const billingContactInvalid =
    billingContactTrimmed.length > 0 && !EMAIL_RE.test(billingContactTrimmed);

  const setTab = (id: PayMethod) => {
    if (write.blocked() || check.blocked() || !!write.record || confirm) return;
    setTabState(id);
    setError(null);
  };

  const finish = async (method: PayMethod) => {
    if (method !== tab || check.blocked()) return;
    await check.run(
      `Check the current ${method} subscription`,
      async (guard) => {
        const status = await guard.wait(() => api.paidStatus());
        if (!status.advanced) {
          setError(
            "Payment is not yet confirmed. Check current payment status when ready.",
          );
          return;
        }
        const current = await guard.wait(() => advanceSession(guard));
        navigate(routeForState(current.state));
      },
    );
  };
  const checkCurrent = async () => {
    const guard = write.guard();
    try {
      const current = await guard.wait(() => advanceSession(guard));
      navigate(routeForState(current.state));
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
    }
  };
  const subscribe = async (method: "card" | "ach") => {
    if (busy || write.blocked() || !!write.record || !stripePk) return;
    setBusy(true);
    setError(null);
    try {
      await write.run(
        `Subscribe with ${method} for ${n} profiles`,
        async (guard) => {
          const result = await guard.wait(() =>
            api.subscribe({ profiles: n, method }),
          );
          if (result.clientSecret)
            setConfirm({ method, clientSecret: result.clientSecret });
          else
            setError(
              "Subscription response received. Check current payment status before continuing.",
            );
        },
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const subscribeWire = async () => {
    if (busy || billingContactInvalid || write.blocked() || !!write.record)
      return;
    setBusy(true);
    setError(null);
    try {
      await write.run(`Subscribe by wire for ${n} profiles`, async (guard) => {
        const result = await guard.wait(() =>
          api.subscribe({
            profiles: n,
            method: "wire",
            ...(billingContactTrimmed
              ? { billingContact: billingContactTrimmed }
              : {}),
          }),
        );
        const invoice = validateOnboardInvoiceUrl(
          result.hostedInvoiceUrl ?? null,
        );
        setInvoiceUrl(invoice);
        setError(
          invoice
            ? "Invoice available. Check current payment status to continue."
            : "An approved invoice link is unavailable. Check current payment status or contact support.",
        );
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cardNote = (
    <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
      Your card is charged <b>${price}</b> immediately on subscribe.
    </div>
  );

  const achNote = (
    <div
      style={{ fontSize: 11.5, color: "var(--ink-3)", display: "flex", gap: 6 }}
    >
      <Icon name="Clock" size={12} style={{ marginTop: 1 }} />
      ACH debits take 1–3 business days to clear. Your workspace provisions
      immediately.
    </div>
  );

  return (
    <FunnelShell step={4} maxWidth={860}>
      <AttemptStatus record={write.record} check={() => void checkCurrent()} />
      <AttemptStatus record={check.record} check={() => void checkCurrent()} />
      <AttemptStatus
        record={stripeConfirmation.record}
        check={() => void checkCurrent()}
      />
      <Btn
        disabled={check.locked || write.pending}
        onClick={() =>
          void finish(tab).catch((err) => setError(errorMessage(err)))
        }
      >
        Check current payment status
      </Btn>
      <PendingFields
        disabled={
          write.locked ||
          check.locked ||
          stripeConfirmation.locked ||
          stripeConfirmation.record?.phase === "confirmed"
        }
      >
        <ScreenTitle
          kicker="Subscription"
          title="Choose your tier and payment method"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <Card>
            <b style={{ fontSize: 13.5 }}>Client profile tier</b>
            <div style={{ margin: "14px 0 10px" }}>
              <Field
                label="Number of client profiles"
                hint="Minimum 10 profiles."
              >
                <TextInput
                  type="number"
                  min={10}
                  value={profiles}
                  disabled={!!confirm || busy}
                  onChange={(e) => setProfiles(parseInt(e.target.value) || 10)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: 0,
                    width: 120,
                  }}
                />
              </Field>
            </div>
            <div
              style={{
                background: "var(--bg-sunken)",
                border: "1px solid var(--border-1)",
                borderRadius: 6,
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                letterSpacing: 0,
                color: "var(--ink-1)",
              }}
            >
              {n} profiles × $200 = <b>${price}/month</b>
            </div>
            {n < 10 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11.5,
                  color: "var(--critical)",
                }}
              >
                Minimum is 10 profiles.
              </div>
            )}
            <div
              style={{
                marginTop: 12,
                fontSize: 11.5,
                color: "var(--ink-3)",
                lineHeight: 1.5,
              }}
            >
              {config.pricingCopy.lock} Volume discounts for large accounts —{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{ color: "var(--accent)" }}
              >
                contact sales
              </a>
              . {config.pricingCopy.change}
            </div>
          </Card>
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
                (confirm && confirm.method === "card" && stripePk ? (
                  <StripePayment
                    publishableKey={stripePk}
                    clientSecret={confirm.clientSecret}
                    mode="payment"
                    method="card"
                    attemptName="paid-stripe-confirmation"
                    label="Confirm payment"
                    onDone={() => finish("card")}
                    note={cardNote}
                  />
                ) : (
                  <>
                    {!stripePk && notConfiguredNote}
                    {cardNote}
                    {error && <ErrorText>{error}</ErrorText>}
                    <Btn
                      variant="primary"
                      disabled={n < 10 || busy || !stripePk || !!write.record}
                      onClick={() => void subscribe("card")}
                      style={{ width: "100%", marginTop: 18 }}
                    >
                      Subscribe — ${price}/month
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
                      <Icon
                        name="Landmark"
                        size={16}
                        style={{ marginTop: 1 }}
                      />
                      <span>
                        Bank wire instructions will be emailed to{" "}
                        <b>{session.email}</b> and an invoice for{" "}
                        <b>${price}</b> is generated on submit. Your workspace
                        provisions immediately; access locks if the invoice goes
                        unpaid.
                        {invoiceUrl && (
                          <>
                            <br />
                            <a
                              href={invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "var(--accent-ink)",
                                fontWeight: 600,
                              }}
                            >
                              View your invoice
                            </a>
                          </>
                        )}
                      </span>
                    </div>
                    <Field label="Billing contact (for invoice)">
                      <>
                        <TextInput
                          disabled={!!write.record}
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
                            Enter a valid email address for the invoice
                            recipient.
                          </span>
                        )}
                      </>
                    </Field>
                  </div>
                  {error && <ErrorText>{error}</ErrorText>}
                  <Btn
                    variant="primary"
                    disabled={
                      n < 10 || busy || billingContactInvalid || !!write.record
                    }
                    onClick={() => void subscribeWire()}
                    style={{ width: "100%", marginTop: 18 }}
                  >
                    Subscribe — ${price}/month
                  </Btn>
                </>
              )}
              {tab === "ach" &&
                (confirm && confirm.method === "ach" && stripePk ? (
                  <StripePayment
                    publishableKey={stripePk}
                    clientSecret={confirm.clientSecret}
                    mode="payment"
                    method="ach"
                    attemptName="paid-stripe-confirmation"
                    label="Confirm payment"
                    onDone={() => finish("ach")}
                    note={achNote}
                  />
                ) : (
                  <>
                    <div style={{ display: "grid", gap: 12 }}>
                      {!stripePk && notConfiguredNote}
                      {achNote}
                    </div>
                    {error && <ErrorText>{error}</ErrorText>}
                    <Btn
                      variant="primary"
                      disabled={n < 10 || busy || !stripePk || !!write.record}
                      onClick={() => void subscribe("ach")}
                      style={{ width: "100%", marginTop: 18 }}
                    >
                      Subscribe — ${price}/month
                    </Btn>
                  </>
                ))}
            </div>
          </Card>
        </div>
      </PendingFields>
    </FunnelShell>
  );
}
