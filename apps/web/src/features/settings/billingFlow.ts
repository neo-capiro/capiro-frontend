import type {
  OperationRequest,
  OperationResponse,
} from "../../shared/capiro/contracts";
import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import { settingsDestination } from "./externalNavigation";

type Registry = typeof capiroOperations;
type Summary = OperationResponse<Registry["settings.billing.summary"]>;
type State = OperationResponse<Registry["settings.billing.state"]>;
export type BillingAction =
  | { kind: "portal" }
  | {
      kind: "checkout";
      body: OperationRequest<Registry["settings.billing.checkout"]>["body"];
    };

/** Presentation eligibility only. The existing service authorizes every request. */
export function billingFlow(summary?: Summary, state?: State) {
  if (
    !summary?.billingEnabled ||
    !state?.billingEnabled ||
    summary.status !== state.status
  )
    return "unavailable";
  if (summary.hasSubscription) return "portal";
  return summary.status === "none" || summary.status === "trialing"
    ? "checkout"
    : "unavailable";
}

export class BillingStateChanged extends Error {
  constructor() {
    super(
      "Billing details changed or this action is unavailable. Refresh billing before continuing.",
    );
  }
}

/** Revalidate the chosen flow before opening a hosted session, never change flows implicitly. */
export async function requestBillingDestination(
  api: CapiroApi<Registry>,
  action: BillingAction,
  signal: AbortSignal,
) {
  const [summary, state] = await Promise.all([
    api.request("settings.billing.summary", {}, { signal }),
    api.request("settings.billing.state", {}, { signal }),
  ]);
  signal.throwIfAborted();
  if (billingFlow(summary, state) !== action.kind)
    throw new BillingStateChanged();
  const result =
    action.kind === "portal"
      ? await api.request("settings.billing.portal", {}, { signal })
      : await api.request(
          "settings.billing.checkout",
          { body: action.body },
          { signal },
        );
  signal.throwIfAborted();
  const destination = settingsDestination(result.url, "billing");
  const expectedOrigin =
    action.kind === "portal"
      ? "https://billing.stripe.com"
      : "https://checkout.stripe.com";
  if (new URL(destination).origin !== expectedOrigin)
    throw new Error(
      "The service returned an unexpected billing destination. Contact your administrator.",
    );
  return destination;
}
