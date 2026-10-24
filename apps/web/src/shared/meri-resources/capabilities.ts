/** Source reception is separate from deployment activation and current user authority. */
const contractSource = "c16bfbf1b9a2f8d075913ff1d362ad78e3043bcc";
const runtimeSource = "ae24d6815d8d685ec8e1bbe20c3a7a7684742a80";
const coreSource = "8d9958f75ba2fefe8edcf5e21a459ae97187ac8a";

type CapabilityDefinition = Readonly<{
  label: string;
  ordinaryRoute: string | null;
  deploymentFlag: string | null;
  publicContract: string;
  sourcePin: string;
  runtimeOwner: string;
  requiredReceipt: string;
  unavailableReason?: string;
  /** Existing connection-status destinations remain reachable while operations are off. */
  navigationWhenUnconfigured?: true;
}>;

/** Reviewed source inventory. These records never turn on a service or grant authority. */
export const meriCapabilityTable = {
  conversations: {
    label: "Conversations",
    ordinaryRoute: "/meri/conversations",
    navigationWhenUnconfigured: true,
    deploymentFlag: "MERI_CONVERSATION_WORKFLOW_ENABLED",
    publicContract:
      "conversation-application/0.1.0 + conversation-history/1.1.0",
    sourcePin: contractSource,
    runtimeOwner: "Meri conversation owner",
    requiredReceipt:
      "Accepted input identity, admitted history and ordered current-run events",
  },
  newConversation: {
    label: "New conversation",
    ordinaryRoute: "/meri",
    deploymentFlag: "MERI_FIRST_CHAT_BOOTSTRAP_ENABLED",
    publicContract:
      "Core meri.conversation.bootstrap/1 + conversation-initial-input/1.0.0",
    sourcePin: coreSource,
    runtimeOwner: "Core bootstrap and Meri admission owners",
    requiredReceipt:
      "Exact idempotent Core bootstrap and initial-input admission receipts",
  },
  files: {
    label: "Document files",
    ordinaryRoute: "/meri/files",
    navigationWhenUnconfigured: true,
    deploymentFlag: "MERI_DOCUMENT_WORKFLOW_ENABLED",
    publicContract: "document-application/0.1.0",
    sourcePin: contractSource,
    runtimeOwner: "Meri document owner",
    requiredReceipt:
      "Immutable version receipt and successful current inspect before download",
  },
  actions: {
    label: "Recommendation actions",
    ordinaryRoute: "/meri/actions",
    navigationWhenUnconfigured: true,
    deploymentFlag: "MERI_ACTION_WORKFLOW_ENABLED",
    publicContract: "action-application/0.1.0",
    sourcePin: contractSource,
    runtimeOwner: "Meri action owner",
    requiredReceipt:
      "Current approved action decision and durable execution receipt",
  },
  taskUpdates: {
    label: "Task updates",
    ordinaryRoute: "/meri/task-updates",
    navigationWhenUnconfigured: true,
    deploymentFlag: "MERI_TASK_COMMAND_WORKFLOW_ENABLED",
    publicContract: "task-command-application/0.1.0",
    sourcePin: "cc43d0004be59f315658207405ff1aea126adad5",
    runtimeOwner: "Meri task-command and Core task owners",
    requiredReceipt:
      "Exact prepared command and durable execution receipt or unresolved outcome",
  },
  conversationApprovals: {
    label: "Conversation approvals",
    ordinaryRoute: "/meri",
    deploymentFlag: "MERI_INTENT_APPROVALS_WORKFLOW_ENABLED",
    publicContract: "intents-application/0.1.0",
    sourcePin: "5ee2fd6e979dff1c2b111bd964c91aadab8357a5",
    runtimeOwner: "Meri intent and domain approval owners",
    requiredReceipt:
      "Current proposal, immutable decision identity and durable decision receipt",
  },
  memory: {
    label: "Personal memory review",
    ordinaryRoute: "/meri/memory",
    deploymentFlag: "MERI_MEMORY_OWNER_REVIEW_ENABLED",
    publicContract:
      "Core owner-memory review DTOs; full memory governance remains held",
    sourcePin: coreSource,
    runtimeOwner: "Core Memory owner",
    requiredReceipt:
      "Current owner candidate/item, revision and approved/rejected/pending receipt",
  },
  preferences: {
    label: "Personal Meri preferences",
    ordinaryRoute: "/settings/preferences",
    navigationWhenUnconfigured: true,
    deploymentFlag: "MERI_USER_PREFERENCES_ENABLED",
    publicContract: "user-preferences-application/0.1.0",
    sourcePin: "9fe0b0857f0284cf460effab34b17fda21c5621d",
    runtimeOwner: "Meri settings owner",
    requiredReceipt:
      "Current canonical preference document and revisioned save receipt",
  },
  runs: {
    label: "Runs",
    ordinaryRoute: null,
    deploymentFlag: null,
    publicContract: "conversation-lifecycle/0.1.0 exists; no public run index",
    sourcePin: runtimeSource,
    runtimeOwner: "Meri conversation lifecycle owner",
    requiredReceipt: "Current authorized run index (not published)",
    unavailableReason:
      "A run list is not available. Current runs can be reviewed within an enabled conversation.",
  },
  approvals: {
    label: "Approvals",
    ordinaryRoute: null,
    deploymentFlag: null,
    publicContract:
      "intents-application/0.1.0 exists; no workspace-wide approval inbox",
    sourcePin: "5ee2fd6e979dff1c2b111bd964c91aadab8357a5",
    runtimeOwner: "Meri intent owner",
    requiredReceipt: "Current authorized approval inbox (not published)",
    unavailableReason:
      "The approval center is not available. Enabled proposal decisions are reviewed within their conversation.",
  },
  routines: {
    label: "Routines",
    ordinaryRoute: null,
    deploymentFlag: null,
    publicContract: "No accepted browser routine-management consumer",
    sourcePin: runtimeSource,
    runtimeOwner: "Meri schedule owner",
    requiredReceipt:
      "Occurrence, consent and cancellation journal with current readback",
    unavailableReason:
      "Routine management is not available in this workspace yet.",
  },
  dataAccess: {
    label: "Data access",
    ordinaryRoute: null,
    deploymentFlag: null,
    publicContract: "No accepted browser source-coverage index",
    sourcePin: runtimeSource,
    runtimeOwner: "Meri gateway and source owners",
    requiredReceipt: "Current source coverage and access receipt",
    unavailableReason:
      "A source coverage and data access page is not available yet.",
  },
} as const satisfies Record<string, CapabilityDefinition>;

export type MeriCapabilityId = keyof typeof meriCapabilityTable;
export type MeriCapabilityState = Readonly<{
  status: "on" | "off" | "unavailable";
  reason: string;
  /** Page access is presentation only, never permission to call a service. */
  navigation: "on" | "off";
}>;
export type MeriCapabilities = Readonly<
  Record<MeriCapabilityId, MeriCapabilityState>
>;

/** Only server-derived serving checks may supply an on state; current requests still authorize. */
export function resolveMeriCapabilities(
  served: Partial<Record<MeriCapabilityId, boolean>>,
  held: Partial<Record<MeriCapabilityId, string>> = {},
): MeriCapabilities {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(meriCapabilityTable).map(([id, definition]) => {
        const key = id as MeriCapabilityId;
        const operation: Omit<MeriCapabilityState, "navigation"> =
          "unavailableReason" in definition
            ? { status: "unavailable", reason: definition.unavailableReason }
            : served[key] === true
              ? {
                  status: "on",
                  reason:
                    "Enabled for this workspace; current access is checked on each request.",
                }
              : {
                  status: "off",
                  reason:
                    held[key] ??
                    "Not enabled or not configured for this workspace.",
                };
        const state: MeriCapabilityState = {
          ...operation,
          navigation:
            definition.ordinaryRoute !== null &&
            (operation.status === "on" ||
              "navigationWhenUnconfigured" in definition)
              ? "on"
              : "off",
        };
        return [key, Object.freeze(state)];
      }),
    ) as Record<MeriCapabilityId, MeriCapabilityState>,
  );
}

export const heldMeriCapabilities = resolveMeriCapabilities({});

/** Existing destinations may explain connection holds without activating operations. */
export function meriCapabilityHref(
  id: MeriCapabilityId,
  state: MeriCapabilities,
) {
  return state[id].navigation === "on"
    ? (meriCapabilityTable[id].ordinaryRoute ?? undefined)
    : undefined;
}
