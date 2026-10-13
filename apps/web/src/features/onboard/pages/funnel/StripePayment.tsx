import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Appearance, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useFunnelApi } from "../../lib/funnel";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import {
  confirmPreparedStripe,
  preparedStripeIntentId,
  type StripeConfirmationMode,
} from "../../lib/stripe-confirmation";
import { Btn, Spinner } from "../../ui/primitives";
import { ErrorText, errorMessage } from "./shared";

export const STRIPE_PAYMENT_AVAILABLE = true;
const appearance: Appearance = {
  variables: {
    colorPrimary: "#2A57CE",
    colorText: "#15161A",
    colorDanger: "#B5301B",
    colorBackground: "#ffffff",
    borderRadius: "6px",
    fontSizeBase: "13.5px",
  },
};
type PaymentProps = {
  publishableKey: string;
  clientSecret: string;
  mode: StripeConfirmationMode;
  method: "card" | "ach";
  attemptName: "trial-stripe-confirmation" | "paid-stripe-confirmation";
  label: string;
  note: ReactNode;
  onDone: () => Promise<void>;
};

/** Rendered only after the user explicitly prepared this native intent. */
export function StripePayment(props: PaymentProps) {
  const intentId = preparedStripeIntentId(props.clientSecret, props.mode);
  if (!intentId)
    return (
      <ErrorText>
        The current payment intent is unavailable. Check current setup before
        starting another attempt.
      </ErrorText>
    );
  return (
    <PreparedPayment
      key={`${props.publishableKey}:${props.mode}:${intentId}`}
      {...props}
      intentId={intentId}
    />
  );
}

function PreparedPayment(props: PaymentProps & { intentId: string }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef<{
    key: string;
    promise: Promise<Stripe | null>;
  } | null>(null);
  useEffect(() => {
    let current = true;
    // This promise belongs only to this mounted public key/intent. The pure
    // public entry has no import-time provider load, and secrets are not keys.
    if (!loading.current || loading.current.key !== props.publishableKey)
      loading.current = {
        key: props.publishableKey,
        promise: loadStripe(props.publishableKey),
      };
    void loading.current.promise.then(
      (value) => {
        if (!current) return;
        if (value) setStripe(value);
        else
          setError(
            "The payment form is unavailable. Check current setup before trying again.",
          );
      },
      () => {
        if (current)
          setError(
            "The payment form could not load. Check current setup before trying again.",
          );
      },
    );
    return () => {
      current = false;
    };
  }, [props.publishableKey]);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!stripe)
    return (
      <div
        role="status"
        style={{ display: "grid", placeItems: "center", padding: "26px 0" }}
      >
        <Spinner size={18} />
        <span>Loading payment form</span>
      </div>
    );
  return (
    <Elements
      key={props.intentId}
      stripe={stripe}
      options={{ clientSecret: props.clientSecret, appearance }}
    >
      <PaymentConfirmation {...props} />
    </Elements>
  );
}

function PaymentConfirmation({
  mode,
  method,
  intentId,
  attemptName,
  label,
  note,
  onDone,
}: PaymentProps & { intentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const api = useFunnelApi();
  const attempt = useOnboardAttempt(api, attemptName);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sealed = attempt.locked || attempt.record?.phase === "confirmed";
  const submit = async () => {
    if (!stripe || !elements || !ready || sealed) return;
    const current = attempt.guard();
    setError(null);
    try {
      await confirmPreparedStripe(attempt, {
        mode,
        intentId,
        confirm: () =>
          mode === "setup"
            ? stripe.confirmSetup({ elements, redirect: "if_required" })
            : stripe.confirmPayment({ elements, redirect: "if_required" }),
        onDone,
      });
    } catch (cause) {
      if (current.current()) setError(errorMessage(cause));
    }
  };
  return (
    <>
      <div style={method === "ach" ? { display: "grid", gap: 12 } : undefined}>
        <PaymentElement
          onReady={() => setReady(true)}
          onLoadError={() => {
            setReady(false);
            setError("The payment form is unavailable. Check current setup.");
          }}
        />
        {note}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Btn
        variant="primary"
        disabled={!stripe || !elements || !ready || sealed}
        onClick={() => void submit()}
        style={{ width: "100%", marginTop: 18 }}
      >
        {attempt.pending ? "Confirming…" : label}
      </Btn>
    </>
  );
}
