import { randomUUID } from "node:crypto";
const clientId = "30000000-0000-4000-8000-000000000001",
  mailbox = "40000000-0000-4000-8000-000000000001";
const now = () => new Date().toISOString();
const campaigns = new Map(),
  creates = new Map(),
  jobs = new Map(),
  intents = new Map(),
  drafts = new Map();
const calls = [];
const identity = {
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    clerkUserId: "test-user",
    email: "test@example.test",
    firstName: "Test",
    lastName: "User",
    title: "CTO",
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: true,
    legiwatchIntroSeen: true,
    legiwatchPrefs: null,
  },
  tenant: {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Test Firm",
    slug: "test-firm",
  },
  role: "user_admin",
  billingAdmin: true,
  entitlements: {
    memoryGovernance: true,
    peWatch: true,
    defenseBudgetIntel: true,
    complianceModule: true,
    dataExport: true,
    customConnectors: false,
  },
  features: {},
};
function units(state) {
  const out = [],
    copies = (role) =>
      state.recipients
        .filter((r) => r.kind === "individual" && r.role === role)
        .map((r) => r.email);
  const add = (key, name, to, members = [], inherited = []) =>
    out.push({
      key,
      name,
      to,
      cc: [
        ...copies("cc"),
        ...members.filter((r) => r.role === "cc").map((r) => r.email),
        ...inherited.flatMap((r) => r.cc ?? []),
      ],
      bcc: [
        ...copies("bcc"),
        ...members.filter((r) => r.role === "bcc").map((r) => r.email),
        ...inherited.flatMap((r) => r.bcc ?? []),
      ],
    });
  for (const r of state.recipients) {
    if (r.role !== "to") continue;
    if (r.kind === "individual")
      add(`individual:${r.id}`, r.name, [r], [], [r]);
    else if (r.kind === "group")
      add(
        `group:${r.id}`,
        r.name,
        r.members.filter((m) => m.role === "to"),
        r.members,
        [r, ...r.members],
      );
    else
      for (const m of r.members)
        if (m.role === "to")
          add(`list:${r.id}:${m.id}`, m.name, [m], r.members, [r, m]);
  }
  return out;
}
function publish(job, item) {
  const campaign = campaigns.get(job.job.outreachRecordId),
    unit = units(campaign.state).find((u) => u.key === item.recipientKey);
  const rows = drafts.get(campaign.id) ?? [];
  let artifact = rows.find((r) => r.generationKey === unit.key);
  if (!artifact) {
    artifact = {
      id: randomUUID(),
      outreachRecordId: campaign.id,
      generationKey: unit.key,
      recipientKey: unit.key,
      audienceKind: "individual",
      recipientSnapshot: {
        name: unit.name,
        email: unit.to[0]?.email,
        groupMembers: unit.to,
        cc: unit.cc,
        bcc: unit.bcc,
      },
      currentVersion: 0,
      current: null,
      history: [],
    };
    rows.push(artifact);
  }
  const version = {
    id: randomUUID(),
    artifactId: artifact.id,
    outreachRecordId: campaign.id,
    version: artifact.currentVersion + 1,
    sourceVersionId: artifact.current?.id ?? null,
    generationKey: unit.key,
    recipientKey: unit.key,
    audienceKind: artifact.audienceKind,
    subject: "A conversation about the community initiative",
    body: `Hello ${unit.name},\n\nI am reaching out about ${campaign.state.mainIdea}. The selected source and personal notes will guide a focused discussion.\n\nWould you have time for a short meeting next week?\n\nThank you,\nTest User`,
    contentHash: "a".repeat(64),
    generationStatus: "generated",
    auditStatus: "passed",
    approvalStatus: "not_required",
    auditDecision: null,
    auditChecks: [],
    reviewRequestId: null,
    provider: "synthetic-sdk-fixture",
    model: "Synthetic response — no model called",
    promptSpecVersion: "outreach-sdk",
    sendable: true,
    createdAt: now(),
  };
  artifact.current = version;
  artifact.currentVersion = version.version;
  artifact.history.push(version);
  drafts.set(campaign.id, rows);
  item.status = "done";
  job.job.status = "completed";
}
async function operation(key, input) {
  const p = input.params ?? {},
    b = input.body ?? {},
    q = input.query ?? {};
  switch (key) {
    case "me.read":
      return identity;
    case "clients.list":
      return [
        {
          id: clientId,
          name: "Community Alliance",
          profileStatus: "active",
          status: "active",
        },
      ];
    case "engagement.outreach":
      return [...campaigns.values()].map((c) => ({
        id: c.id,
        title: c.state.title,
        type: "campaign",
        status: c.status,
        subject: null,
        body: null,
        client: c.state.clientId
          ? { id: clientId, name: "Community Alliance" }
          : null,
      }));
    case "engagement.sessions":
      return [];
    case "engagement.campaign.templates":
      return [
        {
          id: "template-follow-up",
          name: "Meeting follow-up",
          source: "system",
          description: "Continue a conversation",
        },
      ];
    case "engagement.campaign.create": {
      const previous = creates.get(b.requestKey);
      if (previous) return campaigns.get(previous);
      const c = {
        id: randomUUID(),
        revision: 1,
        updatedAt: now(),
        status: "draft",
        state: b.state,
      };
      campaigns.set(c.id, c);
      creates.set(b.requestKey, c.id);
      return c;
    }
    case "engagement.campaign.save": {
      const c = campaigns.get(p.id);
      if (c.revision !== b.expectedRevision) throw Error("Stale revision");
      c.state = b.state;
      c.revision++;
      c.updatedAt = now();
      return c;
    }
    case "engagement.campaign":
      return campaigns.get(p.id);
    case "engagement.campaign.request":
      return creates.has(q.requestKey)
        ? [campaigns.get(creates.get(q.requestKey))]
        : [];
    case "engagement.campaign.editDraft": {
      const artifact = [...drafts.values()]
        .flat()
        .find((row) => row.id === p.id);
      if (!artifact?.current || artifact.current.id !== b.baseVersionId)
        throw Error("Stale draft version");
      const version = {
        ...artifact.current,
        id: randomUUID(),
        version: artifact.currentVersion + 1,
        sourceVersionId: artifact.current.id,
        subject: b.subject,
        body: b.body,
        generationStatus: "manually_authored",
        createdAt: now(),
      };
      artifact.current = version;
      artifact.currentVersion = version.version;
      artifact.history.push(version);
      return version;
    }
    case "engagement.campaign.drafts":
      return drafts.get(p.id) ?? [];
    case "engagement.campaign.generate": {
      const id = randomUUID(),
        items = b.generationKeys.map((key) => ({
          id: randomUUID(),
          recipientKey: key,
          status: "sdk_pending",
          result: null,
          error: null,
          attempt: 0,
        }));
      jobs.set(id, {
        job: {
          id,
          status: "running",
          outreachRecordId: p.id,
          params: { requestKey: b.requestKey },
        },
        items,
      });
      return {
        jobId: id,
        deduped: false,
        items: items.map((i) => ({
          id: i.id,
          generationKey: i.recipientKey,
          status: i.status,
        })),
      };
    }
    case "engagement.campaign.generationRequest": {
      const j = [...jobs.values()].find(
        (j) =>
          j.job.outreachRecordId === p.id &&
          j.job.params.requestKey === q.requestKey,
      );
      return j
        ? {
            jobId: j.job.id,
            deduped: true,
            items: j.items.map((i) => ({
              id: i.id,
              generationKey: i.recipientKey,
              status: i.status,
            })),
          }
        : null;
    }
    case "engagement.campaign.job":
      return jobs.get(p.id);
    case "engagement.campaign.cancelGeneration":
      jobs.get(p.id).job.status = "canceled";
      return { ok: true };
    case "engagement.campaign.library":
      return {
        documents: [
          {
            id: "doc-50000000-0000-4000-8000-000000000001",
            clientId,
            clientName: "Community Alliance",
            title: "Community program notes",
            body: "Synthetic capture source",
            tag: "Client file",
          },
        ],
        debriefs: [],
        preps: [],
      };
    case "engagement.campaign.attachments":
    case "engagement.campaign.audiences":
      return [];
    case "directory.contacts":
      return {
        contacts: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totals: { all: 0, house: 0, senate: 0, governors: 0, staff: 0 },
        availableStates: [],
        availableFilters: {
          chambers: [],
          parties: [],
          committees: [],
          issues: [],
          roles: [],
          states: [],
        },
      };
    case "engagement.newsletter.mailboxes":
      return [
        {
          id: mailbox,
          provider: "microsoft_365",
          accountEmail: "test@example.test",
          displayName: "Test mailbox",
          availability: "available",
          signaturePolicy: "actor",
        },
      ];
    case "engagement.campaign.send": {
      const id = randomUUID(),
        versions = (drafts.get(b.outreachRecordId) ?? [])
          .map((a) => ({ a, v: a.current }))
          .filter(({ v }) => b.draftVersionIds.includes(v.id));
      intents.set(id, {
        id,
        outreachRecordId: b.outreachRecordId,
        status: "complete",
        testMode: b.testMode,
        requestKey: b.requestKey,
        totals: { sent: versions.length },
        error: null,
        startedAt: now(),
        finishedAt: now(),
        createdAt: now(),
        deliveries: versions.map(({ a, v }) => ({
          id: randomUUID(),
          generationKey: a.generationKey,
          recipientKey: a.recipientKey,
          status: "sent",
          attempt: 1,
          provider: "synthetic",
          correlationId: randomUUID(),
          to: b.testMode
            ? [{ email: "test@example.test" }]
            : a.recipientSnapshot.groupMembers,
          cc: b.testMode ? [] : a.recipientSnapshot.cc,
          bcc: b.testMode ? [] : a.recipientSnapshot.bcc,
          subject: v.subject,
          providerMessageId: "synthetic-only",
          providerThreadId: null,
          providerDraftId: null,
          errorCode: null,
          errorMessage: null,
          acceptedAt: now(),
        })),
      });
      return { intentId: id, deduped: false };
    }
    case "engagement.campaign.sendStatus":
      return intents.get(p.id);
    case "engagement.campaign.sendRequest":
      return (
        [...intents.values()].find(
          (i) => i.outreachRecordId === p.id && i.requestKey === q.requestKey,
        ) ?? null
      );
    default:
      throw Error(`Unconfigured synthetic operation: ${key}`);
  }
}
export function syntheticOutreach() {
  return {
    name: "synthetic-outreach-only",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://127.0.0.1");
        if (!url.pathname.startsWith("/api/")) {
          if (url.pathname === "/modules/engagement")
            req.url = "/outreach-sdk/index.html" + url.search;
          return next();
        }
        try {
          let raw = "";
          for await (const chunk of req) raw += chunk;
          const input =
            req.method === "GET"
              ? JSON.parse(url.searchParams.get("input") ?? "{}")
              : JSON.parse(raw || "{}");
          calls.push({ path: url.pathname, input, at: now() });
          let result,
            status = 200;
          if (url.pathname === "/api/outreach-generation/start") {
            const j = jobs.get(input.generationJobId),
              item = j?.items.find((i) => i.id === input.itemId);
            if (!item) throw Error("Unknown unit");
            publish(j, item);
            const conversationId = randomUUID();
            result = {
              state: "requested",
              generationJobId: input.generationJobId,
              itemId: input.itemId,
              conversationId,
              requestId: randomUUID(),
              session: {
                credential: "action_session_" + "A".repeat(43),
                expiresAtMs: Date.now() + 300000,
                context: {
                  tenantId: identity.tenant.id,
                  actorId: identity.user.id,
                  conversationId,
                  runId: randomUUID(),
                  selectedClientId: campaigns.get(j.job.outreachRecordId).state
                    .clientId,
                },
              },
            };
            status = 202;
          } else if (url.pathname === "/api/synthetic-receipt")
            result = {
              calls,
              campaigns: [...campaigns.values()],
              jobs: [...jobs.values()],
              intents: [...intents.values()],
            };
          else
            result = await operation(
              decodeURIComponent(url.pathname.slice("/api/capiro/".length)),
              input,
            );
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: error.message }));
        }
      });
    },
  };
}
