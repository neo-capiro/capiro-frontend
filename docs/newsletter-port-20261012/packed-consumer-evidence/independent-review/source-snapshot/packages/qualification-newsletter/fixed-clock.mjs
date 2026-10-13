/** Synthetic qualification clock only; no application ID or authority semantics. */
export function withFixedClock(action) {
  const OriginalDate = globalThis.Date;
  const originalRandom = Math.random;
  const milliseconds = OriginalDate.parse("2026-10-12T12:00:00.000Z");
  class FixedDate extends OriginalDate {
    constructor(...args) {
      super(...(args.length ? args : [milliseconds]));
    }
    static now() {
      return milliseconds;
    }
  }
  try {
    globalThis.Date = FixedDate;
    Math.random = () => 0.125;
    return action();
  } finally {
    globalThis.Date = OriginalDate;
    Math.random = originalRandom;
  }
}
