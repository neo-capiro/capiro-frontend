/**
 * User-facing text for a read or action failure.
 *
 * An AbortError is produced by the app's own deadline and unmount signals, not
 * by the service, so its raw message ("signal is aborted without reason") must
 * never reach a person. Everything else keeps the message the gateway already
 * wrote for that status.
 */
export function errorText(error: Error | string): string {
  if (typeof error === "string") return error;
  if (error.name === "AbortError") return abortedText;
  const message = error.message.trim();
  if (
    /signal is aborted|aborted without reason|The operation was aborted/i.test(
      message,
    )
  )
    return abortedText;
  return message;
}

export const abortedText =
  "The request was interrupted before it finished. Try again.";
