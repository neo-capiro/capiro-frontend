const nativeCoreBase = "https://first-chat-preview.app-dev.capiro.ai/api";
const clientId =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const reportId =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const nativeReads = new RegExp(
  `^/(?:me|clients(?:/(?:metrics|${clientId}(?:/account-owners)?))?|client-account-owners(?:/options)?|billing/state|memory/(?:candidates/mine(?:/[^/?]+/status)?|owner/items)|clio/completed-reports(?:/${reportId})?)$`,
);
const nativeClientWrite = new RegExp(
  `^/clients/${clientId}(?:/account-owners)?$`,
);
const nativeClientDelete = new RegExp(`^/clients/${clientId}$`);
// Core handlers that bind its application-authority session (Clerk `sid`). The
// capiro template token carries no `sid`, so Core refuses it on every
// deployment, not only the preview target: site workflows and analyst links
// answer 401, governed Objective generation answers NOT_AVAILABLE.
// Either hex case, as the operations' z.uuid() admits; Core validates the value.
const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const objectiveGeneration = `clients/${uuid}/objectives/${uuid}/generation`;
const authorityReads = new RegExp(
  `^/(?:clio/site-workflows|capiro-admin/analyst-links/(?:(?:provision|sam)(?:/${uuid})?|receipts/${uuid})|${objectiveGeneration}(?:/outputs)?)$`,
);
const authorityWrites = new RegExp(
  `^/(?:clio/site-workflows(?:/catalog|/requests/read)?|capiro-admin/analyst-links/(?:provision|sam)/${uuid}/decision|${objectiveGeneration}/(?:commands|strategy-commands))$`,
);

/** Match the existing Core native-session handlers on their configured origin.
 * This chooses a credential only; Core still validates route, membership and scope.
 * Callers validate the configured target before selecting its credential.
 */
export function coreSessionAuthentication(
  service: string,
  base: string,
  method: string,
  path: string,
): "clerk-session" | undefined {
  // The strategy aggregate binds the caller's current session (`scope: actor`, asOf/observedAt
  // from the request) and the strategy service answers 503 to the capiro template credential,
  // which carries no Clerk session id. Measured against the preview strategy service: the same
  // GET is 200 with the session credential and 503 with the template one, while the plan list
  // accepts both — so this is the one strategy path that needs the session.
  if (
    service === "strategy" &&
    method === "GET" &&
    path === "/strategies/metrics/active"
  )
    return "clerk-session";
  if (service !== "core") return undefined;
  if (
    /^\/capiro-admin\/impersonate(?:\/(?:end|[0-9a-f-]{36})(?:\/workspace)?)?$/.test(
      path,
    )
  )
    return "clerk-session";
  // Saved layouts require Core's current-session proof on every configured target.
  if (path === "/me/portfolio-layout" && (method === "GET" || method === "PUT"))
    return "clerk-session";
  if (
    (method === "GET" && authorityReads.test(path)) ||
    (method === "POST" && authorityWrites.test(path))
  )
    return "clerk-session";
  if (base !== nativeCoreBase) return undefined;
  const native =
    ((method === "GET" || method === "HEAD") && nativeReads.test(path)) ||
    (method === "POST" && path === "/clients") ||
    (method === "PUT" && nativeClientWrite.test(path)) ||
    (method === "DELETE" && nativeClientDelete.test(path));
  return native ? "clerk-session" : undefined;
}
