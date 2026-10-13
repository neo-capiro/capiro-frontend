// A fixture must opt into this explicit synthetic error vocabulary.
export function isClerkAPIResponseError(error: unknown): error is {
  errors: { code: string; message: string; longMessage?: string }[];
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "syntheticClerkError" in error &&
    error.syntheticClerkError === true &&
    "errors" in error &&
    Array.isArray(error.errors)
  );
}
