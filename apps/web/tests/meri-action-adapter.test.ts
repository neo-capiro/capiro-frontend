import { describe, it, expect } from "vitest";
import { receiveActionResponse } from "@capiro/meri-contracts/action-application";
import {
  accepted,
  archivedFixture,
  canonicalSha256,
  context,
  fixture,
  harness,
  prepared,
} from "./meri-action-fixtures";

describe("current query fixtures preserve archived-wire refusal", () => {
  it.each([
    "query",
    "query-interleaved-sequence",
    "query-foreign-intent-limit",
    "query-foreign-intent-page",
  ])(
    "derives only the closed subject and real observation hash for %s",
    async (name) => {
      const archived = archivedFixture(name);
      const current = fixture(name);
      await expect(
        receiveActionResponse("query", 200, JSON.stringify(archived.response)),
      ).rejects.toMatchObject({ code: "ACTION_RESPONSE_SHAPE" });
      const admitted = await receiveActionResponse(
        "query",
        200,
        JSON.stringify(current.response),
      );
      expect(admitted).toEqual(current.response);
      const prior = archived.response as Extract<
        typeof admitted,
        { observation: unknown }
      >;
      const derived = structuredClone(prior);
      Reflect.deleteProperty(
        derived.observation.subject,
        "authorizationDecisionId",
      );
      Reflect.deleteProperty(
        derived.observation.result.subject,
        "authorizationDecisionId",
      );
      expect(current.response).toEqual({
        ...derived,
        resultSha256: expect.any(String),
      });
      expect(archivedFixture(name)).toEqual(archived);
      await expect(
        receiveActionResponse(
          "query",
          200,
          JSON.stringify({
            ...(current.response as object),
            resultSha256: prior.resultSha256,
          }),
        ),
      ).rejects.toMatchObject({ code: "ACTION_RESPONSE_CORRELATION" });
    },
  );

  it.each(["subject", "result"])(
    "refuses the retired field in the %s subject independently",
    async (branch) => {
      const query = fixture("query").response as {
        resultSha256: string;
        observation: { subject: object; result: { subject: object } };
      };
      Object.assign(
        branch === "subject"
          ? query.observation.subject
          : query.observation.result.subject,
        {
          authorizationDecisionId: "00000000-0000-4000-8000-000000000099",
        },
      );
      query.resultSha256 = canonicalSha256(query.observation);
      await expect(
        receiveActionResponse("query", 200, JSON.stringify(query)),
      ).rejects.toMatchObject({ code: "ACTION_RESPONSE_SHAPE" });
    },
  );
});

describe("governed action intent and retained wires", () => {
  it("preserves the exact canonical chain, separate approver, pending refusal and explicit same-proposal replay", async () => {
    const h = harness();
    const { page, proposal } = await prepared(h);
    expect(proposal.approverLabel).toBe("reviewer");
    expect(page.coverageNotes.join("\n")).toMatch(/unknown/);
    expect(page.coverageNotes.join("\n")).toMatch(/unsupported/);
    expect(page.coverageNotes.join("\n")).toMatch(/absence supported: false/);
    expect(page.coverageNotes.join("\n")).toMatch(/Evidence ready: false/);
    expect(page.coverageNotes.join("\n")).toMatch(/partial; freshness unknown/);
    h.queue.push(
      "execute-approval-pending",
      "execute-observed",
      "execute-replay",
    );
    expect(accepted(await h.port.execute(proposal.handle, h.signal()))).toEqual(
      { status: "approval-pending" },
    );
    expect(
      accepted(await h.port.execute(proposal.handle, h.signal())),
    ).toMatchObject({ status: "observed", outcome: "succeeded" });
    expect(
      accepted(await h.port.execute(proposal.handle, h.signal())),
    ).toMatchObject({ status: "observed", outcome: "succeeded" });
    expect(h.requests.slice(3).map((x) => x.body)).toEqual(
      Array(3).fill({ proposal: context.proposal }),
    );
    expect(
      h.requests.every(
        (x) =>
          x.init.method === "POST" &&
          x.init.redirect === "error" &&
          x.init.cache === "no-store",
      ),
    ).toBe(true);
    expect(h.requests.map((x) => x.url)).not.toContain(
      "/api/action-followthrough/approve",
    );
  });
  it("refuses fabricated, copied and foreign handles before dispatch", async () => {
    const h = harness(),
      other = harness();
    h.queue.push("query");
    const page = accepted(await h.port.query(h.signal()));
    const edits = { title: context.task.title, dueDate: null };
    expect(
      await h.port.draft({ ...page.items[0]!.selection }, edits, h.signal()),
    ).toEqual({ ok: false, problem: "not-dispatched" });
    expect(
      await other.port.draft(page.items[0]!.selection, edits, other.signal()),
    ).toEqual({ ok: false, problem: "not-dispatched" });
    expect(await h.port.prepare({}, h.signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(await h.port.execute({}, h.signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(h.requests).toHaveLength(1);
    expect(other.requests).toHaveLength(0);
  });
  it("captures editor intent before request awaits and retains exact reviewed draft", async () => {
    const h = harness();
    h.queue.push("query", "draft", "prepare");
    const page = accepted(await h.port.query(h.signal()));
    const edits = { title: context.task.title, dueDate: null };
    const pending = h.port.draft(page.items[0]!.selection, edits, h.signal());
    edits.title = "later edit";
    const draft = accepted(await pending);
    accepted(await h.port.prepare(draft.handle, h.signal()));
    expect(h.requests[1]!.body).toEqual({
      selection: context.selection,
      edits: { title: context.task.title, dueDate: null },
    });
    expect(h.requests[2]!.body).toEqual({ draft: fixture("draft").response });
  });
});

describe("response correlation outside the public receiver", () => {
  for (const name of ["draft-foreign-query-handle"]) {
    it(`rejects receiver-valid ${name} and fences the write`, async () => {
      const h = harness();
      h.queue.push("query", name);
      const page = accepted(await h.port.query(h.signal()));
      const reply = await h.port.draft(
        page.items[0]!.selection,
        { title: context.task.title, dueDate: null },
        h.signal(),
      );
      expect(reply).toEqual({ ok: false, problem: "unknown" });
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
    });
  }
});
