/**
 * Explicit external navigation policy, not invoice/payment authorization.
 * Native forwards hosted_invoice_url; Stripe documents this exact hosted path:
 * https://docs.stripe.com/invoicing/hosted-invoice-page#invoice-urls
 * Custom domains require their own configured policy before they are enabled.
 */
export function validateOnboardInvoiceUrl(value: string | null): string | null {
  if (!value || value.trim() !== value || /[\u0000-\u0020\u007f\\]/.test(value))
    return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://invoice.stripe.com" ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith("/i/") ||
      url.pathname.length <= 3
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

/** The native public config and callback builder share ONBOARD_API_PUBLIC_BASE_URL. */
export function validateOnboardConsentUrl(
  value: string,
  provider: "microsoft" | "google",
  apiBaseUrl: string,
): string | null {
  try {
    const base = new URL(apiBaseUrl);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
      base.hostname,
    );
    if (
      apiBaseUrl.trim() !== apiBaseUrl ||
      /[\u0000-\u0020\u007f\\]/.test(apiBaseUrl) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" && !(loopback && base.protocol === "http:"))
    )
      return null;
    const destination = new URL(value);
    const callback = `${apiBaseUrl.replace(/\/$/, "")}/onboard-api/it/${provider}/callback`;
    const expected =
      provider === "google"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : "https://login.microsoftonline.com/organizations/adminconsent";
    if (
      value.trim() !== value ||
      /[\u0000-\u0020\u007f\\]/.test(value) ||
      destination.username ||
      destination.password ||
      destination.hash ||
      `${destination.origin}${destination.pathname}` !== expected ||
      destination.searchParams.getAll("redirect_uri").length !== 1 ||
      destination.searchParams.get("redirect_uri") !== callback ||
      destination.searchParams.getAll("state").length !== 1 ||
      !destination.searchParams.get("state")
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
