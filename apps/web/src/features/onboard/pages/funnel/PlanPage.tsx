import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { routeForState } from "../../lib/funnel-routes";
// 1.4 Plan Selection — F1Plan (prototype/02-flow1.jsx). Subscribe is the main
// CTA; trial is a quiet nudge below. Paid bullets carry the price-lock copy
// (decision Q2); root projects the public package copy from the server.
// Bullet variants remove only the final period.
import React from "react";
import { useConfig } from "../../useConfig";
import { useNavigate } from "../../navigation";
import {
  Btn,
  FunnelShell,
  OptionCard,
  ScreenTitle,
  Tag,
} from "../../ui/primitives";
import {
  useAdvanceSession,
  useFunnelApi,
  useFunnelSession,
  type FunnelSession,
  type PlanChoice,
} from "../../lib/funnel";
import { ErrorText, errorMessage } from "./shared";

export function PlanPage() {
  const session = useFunnelSession();
  if (!session.data) return null;
  return <PlanForm session={session.data} />;
}

function PlanForm({ session }: { session: FunnelSession }) {
  const { pricingCopy } = useConfig();
  const navigate = useNavigate();
  const api = useFunnelApi();
  const write = useOnboardAttempt(api, "plan");
  const advanceSession = useAdvanceSession();
  const [plan, setPlan] = React.useState<PlanChoice | null>(
    session.plan ?? null,
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Once payment is committed the plan is FROZEN (the backend rejects a
  // change too): the Back button may revisit this step, but flipping the plan
  // after a real charge would corrupt billing vs. what the customer paid.
  const paymentCommitted = session.payMethod !== null;
  const pick = (choice: PlanChoice) => {
    if (paymentCommitted || write.locked) return;
    setPlan(choice);
  };

  const submit = async () => {
    if (!plan || busy) return;
    // Nothing to change — just move forward (avoids a needless POST and the
    // server-side 409 that a frozen plan would return).
    if (paymentCommitted || session.plan === plan) {
      navigate("/legal");
      return;
    }
    if (write.blocked()) return;
    setBusy(true);
    setError(null);
    try {
      await write.run("Save the reviewed plan", async (guard) => {
        await guard.wait(() => api.setPlan(plan));
        const current = await guard.wait(() => advanceSession(guard));
        navigate(routeForState(current.state));
      });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const checkCurrent = async () => {
    const guard = write.guard();
    try {
      const current = await guard.wait(() => advanceSession(guard));
      // An unresolved prior write remains blocked; route only from this read.
      navigate(routeForState(current.state));
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
    }
  };

  return (
    <FunnelShell step={2} maxWidth={560}>
      <AttemptStatus record={write.record} check={() => void checkCurrent()} />
      <PendingFields disabled={write.locked}>
        <ScreenTitle title="Choose how to start" />
        {paymentCommitted && (
          <div
            style={{
              marginBottom: 14,
              fontSize: 12.5,
              color: "var(--ink-2)",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-1)",
              borderRadius: 6,
              padding: "10px 14px",
              lineHeight: 1.5,
            }}
          >
            Your payment is already set up for this plan, so it can no longer be
            changed here. Contact{" "}
            <a
              href="mailto:support@capiro.ai"
              style={{ color: "var(--accent)" }}
            >
              support@capiro.ai
            </a>{" "}
            to switch plans.
          </div>
        )}
        <OptionCard
          disabled={write.locked}
          selected={plan === "paid"}
          onClick={() => pick("paid")}
          title="Subscribe Now"
          badge={<Tag tone="blue">Recommended</Tag>}
          price="$200 / profile · billed monthly · 10-profile minimum ($2,000/month)"
        >
          Choose your client profile tier and get started with your full
          portfolio from day one.
          <ul
            style={{
              margin: "10px 0 0",
              padding: "0 0 0 16px",
              display: "grid",
              gap: 4,
            }}
          >
            <li>{pricingCopy.lock.replace(/\.$/, "")}</li>
            <li>Pay by card, wire, or ACH</li>
            <li>
              Volume discounts available for large accounts — contact sales
            </li>
            <li>{pricingCopy.change.replace(/\.$/, "")}</li>
          </ul>
        </OptionCard>
        <div
          role="button"
          tabIndex={write.locked || paymentCommitted ? -1 : 0}
          aria-pressed={plan === "trial"}
          aria-disabled={write.locked || paymentCommitted}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              pick("trial");
            }
          }}
          onClick={() => pick("trial")}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            cursor: "pointer",
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 8,
            border:
              plan === "trial"
                ? "1.5px solid var(--border-strong)"
                : "1px dashed var(--border-2)",
            background:
              plan === "trial" ? "var(--bg-surface-2)" : "transparent",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              flexShrink: 0,
              marginTop: 2,
              border:
                plan === "trial"
                  ? "4.5px solid var(--ink-2)"
                  : "1.5px solid var(--border-strong)",
              background: "#fff",
            }}
          ></span>
          <div
            style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}
          >
            <b style={{ color: "var(--ink-1)" }}>
              Just exploring? Start with a 30-day free trial.
            </b>
            <br />
            $0 today · 10 client profile limit · no user cap · converts to a
            subscription on day 31 unless you cancel.
          </div>
        </div>
        {error && <ErrorText style={{ textAlign: "right" }}>{error}</ErrorText>}
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
        >
          <Btn
            variant="primary"
            disabled={!plan || busy}
            onClick={() => void submit()}
          >
            Continue
          </Btn>
        </div>
      </PendingFields>
    </FunnelShell>
  );
}
