import { z } from "zod";
import { resolveFirstChatConversation } from "../meri-conversations/first-chat-bootstrap";
import type { FirstChatScope } from "../meri-conversations/first-chat-intent";
import type { FirstChatV2Request } from "../capiro/operations/meri-first-chat";
import type { Client } from "../session/client-contract";

/**
 * Seed material the person provides before Meri drafts a profile. These are navigation hints,
 * never client-record authority. Core still prepares and validates the proposal.
 */
export const profileStarterSeedSchema = z.strictObject({
  website: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(8_000).optional(),
});
export type ProfileStarterSeed = z.infer<typeof profileStarterSeedSchema>;

/**
 * Read-only preflight computed from the existing owners. A denied preflight refuses the handoff
 * before any conversation or proposal is created.
 */
export const profileStarterPreflightSchema = z.strictObject({
  role: z.enum(["permitted", "denied"]),
  capacity: z.enum(["allowed", "denied", "unknown"]),
  duplicate: z.enum(["clear", "possible", "unknown"]),
});
export type ProfileStarterPreflight = z.infer<
  typeof profileStarterPreflightSchema
>;

export const profileStarterDraftSchema = z.strictObject({
  seed: profileStarterSeedSchema,
  preflight: profileStarterPreflightSchema,
});
export type ProfileStarterDraft = z.infer<typeof profileStarterDraftSchema>;

/** Form guidance only; Core and the conversation host still validate the request. */
export function profileStarterProblem(seed: ProfileStarterSeed): string | null {
  if (!seed.website && !seed.notes)
    return "Add a website or notes so Meri has something to draft from.";
  if (seed.website) {
    const website = seed.website;
    if (!/^https?:\/\//i.test(website) && !/^[\w.-]+\.[a-z]{2,}/i.test(website))
      return "Enter a valid website address.";
  }
  return null;
}

export function profileStarterPreflightProblem(
  preflight: ProfileStarterPreflight,
): string | null {
  if (preflight.role === "denied")
    return "Your role does not allow creating profiles.";
  if (preflight.capacity === "denied")
    return "Your plan does not allow another profile right now.";
  if (preflight.duplicate === "possible")
    return "A client with this website may already exist. Review the roster before continuing.";
  return null;
}

/**
 * True while an owner has not answered yet. An unresolved preflight is reported as `unknown` and
 * must never be presented or treated as a clear preflight.
 */
export function profileStarterPreflightUnresolved(
  preflight: ProfileStarterPreflight,
): boolean {
  return preflight.capacity === "unknown" || preflight.duplicate === "unknown";
}

/** Compare websites by bare domain so a scheme, `www.` or path cannot hide a duplicate. */
function websiteDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]!;
}

/** Roster-based duplicate hint. An unloaded roster is `unknown`; no website to compare is `clear`. */
export function profileStarterDuplicate(
  website: string,
  clients: readonly Client[] | undefined,
): ProfileStarterPreflight["duplicate"] {
  const domain = websiteDomain(website);
  if (!domain) return "clear";
  if (!clients) return "unknown";
  return clients.some(
    (client) => websiteDomain(client.website ?? "") === domain,
  )
    ? "possible"
    : "clear";
}

/** Derive the preflight from the existing owners' real loading/unavailable state, never a guess. */
export function profileStarterPreflight({
  permitted,
  capacity,
  clients,
  website,
}: {
  permitted: boolean;
  capacity: { ready: boolean; allowed: boolean };
  clients: readonly Client[] | undefined;
  website: string;
}): ProfileStarterPreflight {
  return {
    role: permitted ? "permitted" : "denied",
    capacity: capacity.ready
      ? capacity.allowed
        ? "allowed"
        : "denied"
      : "unknown",
    duplicate: profileStarterDuplicate(website, clients),
  };
}

/**
 * The typed message handed to the general conversation. It asks Meri to prepare a reviewable
 * client-record proposal, not to create the client. Sending remains the person's explicit action.
 */
export function profileStarterMessage(seed: ProfileStarterSeed): string {
  const lines = [
    "Draft a new client profile for me. Do not create the client yet; prepare a reviewable proposal.",
  ];
  if (seed.website) lines.push(`Website: ${seed.website}`);
  if (seed.notes) lines.push(`Notes:\n${seed.notes}`);
  lines.push(
    "Use the client-record preparation tool. Include the exact fields, provenance and any duplicate or capacity concerns so I can review and approve them.",
  );
  return lines.join("\n\n");
}

type IntentStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Resolve the general conversation and leave the typed message as an unsent draft. This function
 * performs no submit, no client write and no proposal preparation. The caller navigates to the
 * resolved conversation, where the person sends the draft explicitly.
 */
export async function continueProfileStarter({
  seed,
  preflight,
  scope,
  storage,
  signal,
  createOrReuse,
  editDraft,
}: {
  seed: ProfileStarterSeed;
  preflight: ProfileStarterPreflight;
  scope: FirstChatScope;
  storage: IntentStorage;
  signal: AbortSignal;
  createOrReuse: (
    body: FirstChatV2Request,
    signal: AbortSignal,
  ) => Promise<unknown>;
  editDraft: (conversationId: string, message: string) => void;
}): Promise<{ conversationId: string }> {
  const seedProblem = profileStarterProblem(seed);
  if (seedProblem) throw new Error(seedProblem);
  const preflightProblem = profileStarterPreflightProblem(preflight);
  if (preflightProblem) throw new Error(preflightProblem);
  if (profileStarterPreflightUnresolved(preflight))
    throw new Error(
      "Your plan and the client roster are still loading. Try again in a moment.",
    );
  if (scope.clientId !== null)
    throw new Error("Profile drafting starts in General scope.");
  const resolved = await resolveFirstChatConversation({
    scope,
    storage,
    signal,
    // The General scope check above means the resolver only ever builds the v2 General request.
    createOrReuse: (body, requestSignal) => {
      if (!("scopeKind" in body))
        throw new Error("Profile drafting starts in General scope.");
      return createOrReuse(body, requestSignal);
    },
  });
  editDraft(resolved.conversationId, profileStarterMessage(seed));
  return { conversationId: resolved.conversationId };
}
