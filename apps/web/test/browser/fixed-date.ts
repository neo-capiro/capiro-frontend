import type { Page } from "@playwright/test";

/** Freeze Date reads without replacing Intl, timers or animation frames. */
export async function installFixedDate(page: Page, epoch: number) {
  if (!Number.isFinite(epoch))
    throw new Error("A finite fixed date is required");
  await page.addInitScript((fixedEpoch) => {
    const NativeDate = Date;
    const fixedNow = () => fixedEpoch;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args, newTarget) {
        return Reflect.construct(
          target,
          args.length ? args : [fixedEpoch],
          newTarget,
        );
      },
      apply() {
        return new NativeDate(fixedEpoch).toString();
      },
      get(target, key, receiver) {
        return key === "now" ? fixedNow : Reflect.get(target, key, receiver);
      },
    });
  }, epoch);
}
