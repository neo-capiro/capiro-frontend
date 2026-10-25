import { installPlatform } from "./command-recovery-platform";
installPlatform();
import { describe, it, expect, vi } from "vitest";
import {
  accepted,
  context,
  fixture,
  harness,
  prepared,
  clock,
} from "./meri-action-fixtures";

describe("Meri attempt outcomes retain their exact meaning", () => {
  const outcomes = [
    ["prepare-unknown", "unknown"],
    ["prepare-stored_not_released", "stored-withheld"],
    ["prepare-result_not_released", "result-withheld"],
    ["prepare-not_stored", "not-stored"],
    ["prepare-read_unavailable", "read-unavailable"],
  ] as const;
  for (const [name, problem] of outcomes) {
    it(`retains ${problem} through a new view without granting a retry`, async () => {
      const h = harness();
      h.queue.push("query", "draft", name);
      const page = accepted(await h.port.query(h.signal()));
      const draft = accepted(
        await h.port.draft(
          page.items[0]!.selection,
          { title: context.task.title, dueDate: null },
          h.signal(),
        ),
      );
      expect(await h.port.prepare(draft.handle, h.signal())).toEqual({
        ok: false,
        problem,
      });
      h.port.dispose();
      const reopened = harness(h.journal);
      reopened.queue.push("query");
      expect(await reopened.port.query(reopened.signal())).toEqual({
        ok: false,
        problem,
      });
      expect(reopened.requests).toHaveLength(0);
    });
  }
  for (const name of [
    "execute-indeterminate",
    "approval-refused-but-unknown",
  ]) {
    it(`cannot turn ${name} into pending approval or a replay grant`, async () => {
      const h = harness();
      const { proposal } = await prepared(h);
      h.queue.push(name);
      const reply = await h.port.execute(proposal.handle, h.signal());
      expect(reply).toEqual(
        name === "execute-indeterminate"
          ? { ok: true, value: { status: "indeterminate" } }
          : { ok: false, problem: "unknown" },
      );
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(h.requests).toHaveLength(4);
    });
  }
});

describe("Meri disposal, expiry and held observations", () => {
  it("disposal during a held write clears handles and retains uncertainty without late publication", async () => {
    const h = harness();
    const { proposal } = await prepared(h);
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const pending = h.port.execute(proposal.handle, h.signal());
    await vi.waitFor(() => expect(h.requests).toHaveLength(4));
    expect(h.journal.read()).toEqual({ status: "pending" });
    h.port.dispose();
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    release(
      new Response(JSON.stringify(fixture("execute-observed").response), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await Promise.resolve();
    expect(h.journal.read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(h.requests).toHaveLength(4);
  });
  it("prevents duplicate dispatch while the same explicit intent is pending", async () => {
    const h = harness();
    const { proposal } = await prepared(h);
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const pending = h.port.execute(proposal.handle, h.signal());
    await vi.waitFor(() => expect(h.requests).toHaveLength(4));
    expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    release(
      new Response(JSON.stringify(fixture("execute-observed").response), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(accepted(await pending)).toMatchObject({ status: "observed" });
    expect(h.requests).toHaveLength(4);
  });
  it("expired session loses access before another query and never reuses an opaque credential", async () => {
    const h = harness();
    h.setNow(clock + 60_000);
    expect(await h.port.query(h.signal())).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.lost()).toBe(1);
    expect(h.requests).toHaveLength(0);
  });
  it("a validated401 purges access and keeps its execution uncertainty separate", async () => {
    const h = harness();
    const { proposal } = await prepared(h);
    h.queue.push("error-unauthenticated");
    expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.lost()).toBe(1);
    expect(h.requests).toHaveLength(4);
  });
});

describe("durable lookup attempt ownership", () => {
  it("retains an interrupted lookup through a reopened view without issuing a replacement", async () => {
    const h = harness();
    h.queue.push(() => new Promise<Response>(() => undefined));
    const pending = h.port.query(h.signal());
    h.port.dispose();
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    expect(h.journal.read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    const reopened = harness(h.journal);
    reopened.queue.push("query");
    expect(await reopened.port.query(reopened.signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(reopened.requests).toHaveLength(0);
  });
});

describe("unadmitted unauthorized responses", () => {
  for (const media of ["application/json", "text/html"]) {
    it(`clears local access on a malformed 401 ${media} without inventing a dispatch outcome`, async () => {
      const h = harness();
      const { proposal } = await prepared(h);
      h.queue.push(
        async () =>
          new Response("untrusted body", {
            status: 401,
            headers: { "Content-Type": media },
          }),
      );
      expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
        ok: false,
        problem: "access-lost",
      });
      expect(h.lost()).toBe(1);
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(h.requests).toHaveLength(4);
    });
  }
});
