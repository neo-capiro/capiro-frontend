import "server-only";
import { PRICE_LOCK_COPY, PRICE_CHANGE_COPY } from "@capiro/shared";

/** Project two public presentation strings; keep the broad CJS owner off the client. */
export const onboardPricingCopy = Object.freeze({
  lock: PRICE_LOCK_COPY,
  change: PRICE_CHANGE_COPY,
});
