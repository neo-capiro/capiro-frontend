const hosts = {
  microsoft: new Set(["login.microsoftonline.com"]),
  google: new Set(["accounts.google.com"]),
  billing: new Set(["billing.stripe.com", "checkout.stripe.com"]),
};

/** Redirect only to the verified provider's hosted account flow. */
export function settingsDestination(
  value: string,
  provider: keyof typeof hosts,
) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !hosts[provider].has(url.hostname)
  )
    throw new Error(
      "The service returned an unexpected destination. Contact your administrator.",
    );
  return url.href;
}
