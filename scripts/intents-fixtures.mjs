import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const usage =
  "Usage: node scripts/intents-fixtures.mjs\nRequires MERI_INTENTS_QUALIFICATION_SOURCE, a reviewed Meri source checkout (the accepted intents contract commit). Generates synthetic intent list/decide HTTP wires using the actual intent mount, approval owner, command executor and product HTTP application over a synthetic decision owner; no native network or credentials. Exit0 success/help; exit1 invalid arguments/setup.";

/** Synthetic Core decision owner: one immutable decision per proposal; repeats answer the stored decision. */
function syntheticCore(clock, NOW) {
  const decisions = new Map(),
    state = { records: 0, loseRecordAck: false };
  async function call(operation, input) {
    if (operation === "approval/record") {
      state.records++;
      const p = input.proposal;
      if (!decisions.has(p.proposalId))
        decisions.set(p.proposalId, {
          proposalId: p.proposalId,
          commandSha256: p.commandSha256,
          decision: input.decision,
          decidedAt: new Date(clock()).toISOString(),
          expiresAt: new Date(
            Math.min(Date.parse(p.expiresAt), NOW + 40000),
          ).toISOString(),
          approver: input.approver,
          policyRevision: "p1",
        });
      const receipt = {
        decision: decisions.get(p.proposalId),
        checkedAtMs: clock(),
        revoked: false,
      };
      if (state.loseRecordAck) {
        state.loseRecordAck = false;
        throw Error("synthetic lost record ACK");
      }
      return structuredClone(receipt);
    }
    if (operation === "approval/decision")
      return structuredClone({
        decision: decisions.get(input.proposalId) ?? null,
        checkedAtMs: clock(),
        revoked: false,
      });
    throw Error("unexpected operation");
  }
  return { state, call };
}

export async function generateIntentsFixtures(source) {
  if (!source || !path.isAbsolute(source))
    throw Error("Set absolute MERI_INTENTS_QUALIFICATION_SOURCE");
  const load = (file) => import(pathToFileURL(path.join(source, file)).href);
  const { commandComposition, mount, delivery, NOW } = await load(
    "apps/control/intents/test/fixture.mjs",
  );
  const { createIntentApprovalOwner } = await load(
    "apps/control/intents/approval.mjs",
  );
  const { createIntentApplication, INTENT_PATHS } = await load(
    "apps/control/intents/http.mjs",
  );
  const { createNativeIntentApprovals, createCommandJournalOutcomes } =
    await load("apps/control/intents/native-approvals.mjs");
  // The fixture's mount helper returns its journal store separately; compose the owner over that store.
  function compose() {
    let c;
    const clock = () => c.f.state.now,
      core = syntheticCore(clock, NOW);
    const native = createNativeIntentApprovals({
      call: core.call,
      now: clock,
      maxFactBytes: 65536,
    });
    c = commandComposition({
      approverActorId: "actor",
      approvalStore: { getCurrent: (value) => native.getCurrent(value) },
    });
    const { store, mount: m } = mount({
      binding: c.binding,
      preparers: [c.preparer()],
      now: clock,
    });
    const owner = createIntentApprovalOwner({
      journal: store.port,
      decisions: native,
      commandOptionsFor: async () => c.commandOptions,
      issueExecution: async ({ proposal }) => ({
        execution: {
          ...c.f.execution,
          proposalId: proposal.proposalId,
          commandSha256: proposal.commandSha256,
          idempotencyKey: proposal.command.idempotencyKey,
        },
        credential: "synthetic",
        checkedAtMs: clock(),
        expiresAtMs: NOW + 30000,
      }),
      outcomes: createCommandJournalOutcomes({
        journal: c.f.journal,
        contextFor: () => c.f.context,
      }),
      now: clock,
      limits: { maxRequestMs: 5000 },
      enabled: true,
    });
    const principal = {
      tenantId: c.binding.tenantId,
      actorId: c.binding.actorId,
      role: "member",
      permissions: [],
      clientIds: [],
      membershipRevision: "m1",
    };
    const app = createIntentApplication({
      owner,
      gate: {
        async admit() {
          return { principal, expiresAtMs: NOW + 60000 };
        },
        async recheck({ principal: p }) {
          return p;
        },
      },
      now: clock,
      limits: {
        maxRequestMs: 5000,
        maxRequestBytes: 4096,
        maxResponseBytes: 262144,
      },
    });
    const call = async (route, request) => {
      const response = await app.handle(
        new Request(`https://meri.invalid${INTENT_PATHS[route]}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer synthetic-session",
          },
          body: JSON.stringify(request),
        }),
      );
      return {
        route,
        request,
        httpStatus: response.status,
        response: JSON.parse(await response.text()),
      };
    };
    const prepare = (n) =>
      m.prepare({
        operation: { id: "create_task", version: "0.2.0" },
        arguments: { title: "Task" },
        deliveryId: delivery(n),
      });
    return { c, core, call, prepare, conversationId: c.binding.conversationId };
  }
  const fixtures = {};
  // Approved path: awaiting -> executed -> completed history -> identical repeat.
  {
    const s = compose();
    await s.prepare(1);
    fixtures.listAwaiting = await s.call("list", {
      conversationId: s.conversationId,
    });
    const proposal = fixtures.listAwaiting.response.intents[0].proposal;
    const approve = {
      conversationId: s.conversationId,
      deliveryId: delivery(1),
      proposalId: proposal.proposalId,
      commandSha256: proposal.commandSha256,
      decision: "approved",
    };
    fixtures.decideExecuted = {
      ...(await s.call("decide", approve)),
      proposal,
    };
    fixtures.listCompleted = await s.call("list", {
      conversationId: s.conversationId,
    });
    fixtures.decideRepeat = { ...(await s.call("decide", approve)), proposal };
    if (
      fixtures.decideExecuted.httpStatus !== 200 ||
      fixtures.decideRepeat.httpStatus !== 200 ||
      s.c.f.state.fetches !== 1
    )
      throw Error(
        `Synthetic approval path failed: ${fixtures.decideExecuted.httpStatus} ${JSON.stringify(fixtures.decideExecuted.response).slice(0, 200)} repeat ${fixtures.decideRepeat.httpStatus} fetches ${s.c.f.state.fetches}`,
      );
    fixtures.context = {
      tenantId: s.c.binding.tenantId,
      actorId: s.c.binding.actorId,
      conversationId: s.conversationId,
      runId: s.c.binding.runId,
      syntheticNow: s.c.f.state.now,
    };
  }
  // Rejected path.
  {
    const s = compose();
    await s.prepare(1);
    const proposal = (
      await s.call("list", { conversationId: s.conversationId })
    ).response.intents[0].proposal;
    fixtures.decideRejected = {
      ...(await s.call("decide", {
        conversationId: s.conversationId,
        deliveryId: delivery(1),
        proposalId: proposal.proposalId,
        commandSha256: proposal.commandSha256,
        decision: "rejected",
      })),
      proposal,
    };
    fixtures.listRejected = await s.call("list", {
      conversationId: s.conversationId,
    });
  }
  // Lost decision acknowledgement: UNKNOWN, then the identical request recovers the durable outcome.
  {
    const s = compose();
    await s.prepare(1);
    const proposal = (
      await s.call("list", { conversationId: s.conversationId })
    ).response.intents[0].proposal;
    const approve = {
      conversationId: s.conversationId,
      deliveryId: delivery(1),
      proposalId: proposal.proposalId,
      commandSha256: proposal.commandSha256,
      decision: "approved",
    };
    s.core.state.loseRecordAck = true;
    fixtures.decideUnknown = { ...(await s.call("decide", approve)), proposal };
    fixtures.decideRecovered = {
      ...(await s.call("decide", approve)),
      proposal,
    };
    if (
      fixtures.decideUnknown.httpStatus !== 502 ||
      fixtures.decideRecovered.httpStatus !== 200
    )
      throw Error("Synthetic unknown path failed");
  }
  // Expired before a decision.
  {
    const s = compose();
    await s.prepare(1);
    const proposal = (
      await s.call("list", { conversationId: s.conversationId })
    ).response.intents[0].proposal;
    s.c.f.state.now = NOW + 50000;
    fixtures.decideExpired = {
      ...(await s.call("decide", {
        conversationId: s.conversationId,
        deliveryId: delivery(1),
        proposalId: proposal.proposalId,
        commandSha256: proposal.commandSha256,
        decision: "approved",
      })),
      proposal,
    };
    fixtures.listExpired = await s.call("list", {
      conversationId: s.conversationId,
    });
    if (fixtures.decideExpired.httpStatus !== 409)
      throw Error("Synthetic expiry path failed");
  }
  const directory = new URL(
    "../apps/web/tests/fixtures/meri-intents/",
    import.meta.url,
  );
  await mkdir(directory, { recursive: true });
  for (const [name, value] of Object.entries(fixtures))
    await writeFile(
      new URL(`${name}.json`, directory),
      JSON.stringify(value, null, 2) + "\n",
    );
  return {
    synthetic: true,
    files: Object.keys(fixtures).length,
    nativeRequests: 0,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.slice(2).length === 1 && process.argv[2] === "--help")
    console.log(usage);
  else if (process.argv.length !== 2) {
    console.error(usage);
    process.exitCode = 1;
  } else
    generateIntentsFixtures(process.env.MERI_INTENTS_QUALIFICATION_SOURCE)
      .then((value) => console.log(JSON.stringify(value)))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
