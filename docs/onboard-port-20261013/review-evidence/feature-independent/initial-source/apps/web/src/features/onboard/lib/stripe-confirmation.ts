import type {
  PaymentIntent,
  SetupIntent,
  StripeError,
} from "@stripe/stripe-js";
import {
  ConfirmedInputRefusal,
  type createOnboardAttempt,
} from "./attempt-journal";

export type StripeConfirmationMode = "setup" | "payment";
type ConfirmationResult = {
  error?: StripeError;
  setupIntent?: Pick<SetupIntent, "id" | "status">;
  paymentIntent?: Pick<PaymentIntent, "id" | "status">;
};

/** A non-secret ID binds the receipt/journal; the secret stays in Elements. */
export function preparedStripeIntentId(
  secret: string,
  mode: StripeConfirmationMode,
) {
  const match = /^(seti_[A-Za-z0-9]+|pi_[A-Za-z0-9]+)_secret_.+$/.exec(secret);
  const id = match?.[1];
  return id?.startsWith(mode === "setup" ? "seti_" : "pi_") ? id : null;
}

/** The SDK receipt is sealed before the separate native follow-up is attempted. */
export async function confirmPreparedStripe(
  attempt: ReturnType<typeof createOnboardAttempt>,
  options: {
    mode: StripeConfirmationMode;
    intentId: string;
    confirm: () => Promise<ConfirmationResult>;
    onDone: () => Promise<void>;
  },
) {
  if (attempt.read()?.phase === "confirmed")
    throw new Error(
      "This payment confirmation already returned. Check current setup instead of confirming again.",
    );
  const guard = attempt.guard();
  await attempt.run(
    `Confirm ${options.mode} intent ${options.intentId}`,
    async (current) => {
      const result = await current.wait(options.confirm);
      if (result.error?.type === "validation_error")
        throw new ConfirmedInputRefusal(
          "Review the payment details before confirming again.",
        );
      if (result.error)
        throw new Error(
          "Payment confirmation was not established. Check current setup before another attempt.",
        );
      const intent =
        options.mode === "setup" ? result.setupIntent : result.paymentIntent;
      if (
        intent?.id !== options.intentId ||
        !["succeeded", "processing"].includes(intent.status)
      )
        throw new Error(
          "A matching completed or processing confirmation was not returned. Check current setup.",
        );
    },
  );
  // A lost/rejected native follow-up must never reopen the SDK confirmation.
  await guard.wait(options.onDone);
}
