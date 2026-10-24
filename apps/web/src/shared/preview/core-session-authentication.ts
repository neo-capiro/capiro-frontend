const nativeCoreBase = "https://first-chat-preview.app-dev.capiro.ai/api";
const clientId =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const nativeReads = new RegExp(
  `^/(?:me|clients(?:/${clientId}(?:/account-owners)?)?|client-account-owners(?:/options)?|billing/state|memory/(?:candidates/mine(?:/[^/?]+/status)?|owner/items))$`,
);
const nativeClientWrite = new RegExp(
  `^/clients/${clientId}(?:/account-owners)?$`,
);
const nativeClientDelete = new RegExp(`^/clients/${clientId}$`);

/** Match the existing Core native-session handlers on their configured origin.
 * This chooses a credential only; Core still validates route, membership and scope.
 * Nested client operations and all other origins keep their ordinary token.
 */
export function coreSessionAuthentication(
  service: string,
  base: string,
  method: string,
  path: string,
): "clerk-session" | undefined {
  if (service !== "core" || base !== nativeCoreBase) return undefined;
  const native =
    ((method === "GET" || method === "HEAD") && nativeReads.test(path)) ||
    (method === "POST" && path === "/clients") ||
    (method === "PUT" && nativeClientWrite.test(path)) ||
    (method === "DELETE" && nativeClientDelete.test(path));
  return native ? "clerk-session" : undefined;
}
