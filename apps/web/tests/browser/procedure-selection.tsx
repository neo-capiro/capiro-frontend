/**
 * SOURCE STAGE ONLY harness: mounts the real SessionComposer with the composer's own native procedure
 * control inside the product's own Capiro data provider. The provider builds its api from the real
 * operation registry, so the only synthetic part is the answer at the boundary for
 * `GET /clio/procedure-catalog`, stubbed on window.fetch before the composer mounts. No session, no
 * account, no network and no model call is used.
 *
 * Scenario (query string) selects the boundary answer:
 *   current            six built-ins and one eligible firm procedure, answered immediately
 *   retire-on-refresh  the same, then a refreshed catalog where one built-in carries a new version
 *                      and the firm procedure is gone
 *   foreign            the same shape, but for another tenant
 *   malformed          a payload that is not the reviewed shape at all
 *   late               the first read (the previous scope's lifetime) answers late, after the scope
 *                      switched, and the new lifetime's read answers with built-ins only
 */
import { useMemo, useState, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import {
  createConversationComposer,
  useLiveComposer,
} from "@/features/meri/conversation/conversation-composer";
import { SessionComposer } from "@/features/meri/conversation/ConversationView";
import { createInitialDraftOwner } from "@/features/meri/conversation/initial-draft";
import { CapiroDataProvider } from "@/shared/capiro/CapiroBoundary";
import type { MeriConversationPort } from "@/shared/meri-conversations/host-controller";
import type { ConversationSkillSelection } from "@/shared/meri-conversations/query-journal";
import type { ConversationContext } from "@/shared/meri-conversations/session";
import {
  requireMeriTabStorage,
  syncMeriTabIdentity,
} from "@/shared/meri-conversations/tab-journal";
import type { LiveComposer } from "@/features/meri/MeriComposer";
import "@/app/globals.css";
import { ALL_TYPED_SKILL_IDS } from "@/features/meri/conversation/quick-action-gate";

const scenario =
  new URLSearchParams(location.search).get("scenario") ?? "current";
const tenantId = "synthetic-tenant";
const otherTenant = "synthetic-other-tenant";
const firmRow = "0b7f0e2c-1a44-4c9b-9d2f-2a7b5c1e6f30";
/** Deterministic fixture digests in the reviewed shape; no canonical digest is restated anywhere. */
const digest = (seed: string) => {
  let hex = "";
  for (let index = 0; index < 64; index += 1)
    hex += ((seed.charCodeAt(index % seed.length) + index) % 16).toString(16);
  return hex;
};
const builtinIds = [
  "briefing",
  "draft",
  "bill_analysis",
  "hearing_prep",
  "coalition_letter",
  "amendment_tracker",
] as const;
function catalog(tenant: string, refreshed: boolean) {
  const entries = [
    ...builtinIds.map((id) => ({
      selector: {
        source: "builtin",
        id,
        version: refreshed && id === "briefing" ? 2 : 1,
        manifestDigest: digest(
          `builtin:${id}${refreshed && id === "briefing" ? ":v2" : ""}`,
        ),
      },
      display: {
        id,
        canonicalId: id,
        label: id,
        purpose: `Built-in ${id}`,
        scopes: ["general"],
      },
    })),
    ...(refreshed
      ? []
      : [
          {
            selector: {
              source: "firm",
              recordId: firmRow,
              version: 3,
              manifestDigest: digest("firm:case-brief"),
            },
            display: {
              id: firmRow,
              canonicalId: "firm.case_brief",
              label: "Case brief",
              purpose: "Drafts the case brief from the record",
              scopes: ["client"],
            },
          },
        ]),
  ];
  return {
    version: 1,
    tenantId: tenant,
    generatedAt: 1_780_000_000_000,
    entries,
    counts: {
      builtin: builtinIds.length,
      firm: refreshed ? 0 : 1,
      total: entries.length,
    },
  };
}

let reads = 0;
let answerFirstRead: (() => void) | undefined;
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
window.fetch = async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  // Nothing in this host may reach a real service.
  if (!url.includes("/api/capiro/")) return new Response(null, { status: 503 });
  if (!url.includes("meri.procedures.catalog"))
    return json({ synthetic: true });
  reads += 1;
  if (scenario === "foreign") return json(catalog(otherTenant, false));
  if (scenario === "malformed")
    return json({ version: 1, tenantId, entries: [] });
  if (scenario === "late" && reads === 1)
    return await new Promise<Response>((resolve) => {
      // The previous lifetime's answer arrives only after the scope has already changed.
      answerFirstRead = () => resolve(json(catalog(tenantId, false)));
    });
  // The refreshed catalog is what a later read answers with: after the first read on the
  // retire-on-refresh journey, and for the new lifetime on the late-answer journey.
  const refreshed =
    scenario === "late" || (scenario === "retire-on-refresh" && reads > 1);
  return json(catalog(tenantId, refreshed));
};

syncMeriTabIdentity("synthetic-session");
const storage = requireMeriTabStorage();
const scope = {
  tenantId,
  actorId: "synthetic-actor",
  clientId: "synthetic-client",
  conversationId: "synthetic-conversation",
};
const controls: LiveComposer = {
  onSend: () => undefined,
  onStop: () => undefined,
  scope: "Synthetic client",
  attachUnavailable: "Attachments unavailable",
};
type Session = ComponentProps<typeof SessionComposer>["session"];

function Harness() {
  const [selection, setSelection] = useState<ConversationSkillSelection>({});
  const [draft, setDraft] = useState("Summarise the hearing");
  const [client, setClient] = useState(scope.clientId);
  const [channel] = useState(createConversationComposer);
  const [owner] = useState(() => createInitialDraftOwner(scope, storage));
  const context: ConversationContext = {
    tenantId,
    actorId: scope.actorId,
    selectedClientId: client,
    conversationId: scope.conversationId,
    runId: "synthetic-run",
  };
  const port = useMemo(
    () =>
      ({
        context: {
          tenantId,
          actorId: scope.actorId,
          selectedClientId: client,
          conversationId: scope.conversationId,
          runId: "synthetic-run",
        },
      }) as unknown as MeriConversationPort,
    [client],
  );
  useLiveComposer(channel, { port, running: false, controls });
  /** The product's own boundary: the draft owner admits and retains the whole selection. */
  const retainSelection = (value: ConversationSkillSelection) => {
    owner.selectSkill(value);
    setSelection(owner.selection() ?? {});
  };
  const session = {
    selectedId: context.conversationId,
    accessLost: false,
    connection: { state: { status: "ready" } },
    ready: { port, lifetimeKey: JSON.stringify(context) },
    draft,
    setDraft,
    textarea: { current: null },
    skillSelection: selection,
    setSkillSelection: retainSelection,
    initialDraft: owner,
    continuation: {
      intent: undefined,
      busy: false,
      failed: false,
      notReady: false,
      storageError: undefined,
      start: async () => false,
      retry: async () => false,
      readMapping: async () => false,
    },
  } as unknown as Session;
  return (
    <main style={{ padding: 24 }}>
      <h1>Synthetic native procedure composer</h1>
      <SessionComposer
        channel={channel}
        session={session}
        scope="Synthetic client"
        gate={{ status: "on", available: ALL_TYPED_SKILL_IDS }}
      />
      <button
        type="button"
        onClick={() => {
          setClient("synthetic-other-client");
          // The retired lifetime answers now: it may never restore the scope it belonged to.
          setTimeout(() => answerFirstRead?.(), 50);
        }}
      >
        Switch scope
      </button>
      <output aria-label="Applied selection">
        {JSON.stringify(selection)}
      </output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <CapiroDataProvider onSessionExpired={() => undefined}>
    <Harness />
  </CapiroDataProvider>,
);
