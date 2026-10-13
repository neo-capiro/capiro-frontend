import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { ConfirmedInputRefusal } from "./attempt-journal";

// Explicit form refusals from the installed Clerk public error vocabulary.
// A transport error or arbitrary Clerk error remains an unknown outcome.
const inputRefusals = new Set([
  "form_password_pwned",
  "form_password_length_too_short",
  "form_code_incorrect",
  "form_identifier_exists",
  "form_param_format_invalid",
  "form_param_nil",
]);
export async function clerkInputAttempt<T>(
  effect: () => Promise<T>,
): Promise<T> {
  try {
    return await effect();
  } catch (error) {
    if (
      isClerkAPIResponseError(error) &&
      error.errors.length > 0 &&
      error.errors.every((item) => inputRefusals.has(item.code))
    )
      throw new ConfirmedInputRefusal(
        error.errors.map((item) => item.longMessage || item.message).join(" "),
        { cause: error },
      );
    throw error;
  }
}
