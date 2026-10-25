import { installPlatform } from "./command-recovery-platform";
installPlatform();
import { describe, it, expect } from "vitest";
import {
  accepted,
  context,
  fixture,
  harness,
  prepared,
} from "./meri-action-fixtures";

describe("Meri current intent correlation", () => {
  for (const name of [
    "prepare-foreign-supporting-draft",
    "prepare-coherent-task-substitution",
  ]) {
    it(`refuses receiver-valid ${name}`, async () => {
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
      await expect(h.receive(name)).resolves.not.toHaveProperty("error");
      expect(await h.port.prepare(draft.handle, h.signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(h.requests).toHaveLength(3);
    });
  }
  for (const suffix of [
    "command",
    "command-hash",
    "idempotency",
    "actor",
    "task-title",
    "task-client",
    "task-date",
  ]) {
    it(`refuses coherent foreign execute ${suffix} instead of reporting task success`, async () => {
      const h = harness();
      const { proposal } = await prepared(h);
      const name = `execute-foreign-${suffix}`;
      await expect(h.receive(name)).resolves.not.toHaveProperty("error");
      h.queue.push(name);
      expect(await h.port.execute(proposal.handle, h.signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(h.requests).toHaveLength(4);
    });
  }
});

describe("canonical Meri recovery and dates", () => {
  it("accepts recovered worker/fence and interleaved event sequence without weakening stable context", async () => {
    const h = harness();
    const { proposal } = await prepared(h, [
      "query-interleaved-sequence",
      "draft",
      "prepare-recovered-worker",
    ]);
    h.queue.push("execute-recovered-worker");
    expect(
      accepted(await h.port.execute(proposal.handle, h.signal())),
    ).toMatchObject({ status: "observed", outcome: "succeeded" });
    expect(h.journal.read()).toEqual({ status: "idle" });
  });
  it("converts an HTML day to canonical UTC midnight and displays the same reviewed date", async () => {
    const h = harness();
    h.queue.push(
      "query",
      "draft-canonical-date",
      "prepare-canonical-date",
      "execute-canonical-date",
    );
    const expected = (
      fixture("draft-canonical-date").response as { task: { dueDate: string } }
    ).task.dueDate;
    const day = expected.slice(0, 10);
    const page = accepted(await h.port.query(h.signal()));
    const draft = accepted(
      await h.port.draft(
        page.items[0]!.selection,
        { title: context.task.title, dueDate: day },
        h.signal(),
      ),
    );
    expect(draft.dueDate).toBe(day);
    expect(h.requests[1]!.body).toMatchObject({
      edits: { dueDate: `${day}T00:00:00.000Z` },
    });
    const proposal = accepted(await h.port.prepare(draft.handle, h.signal()));
    expect(proposal.dueDate).toBe(day);
    expect(
      accepted(await h.port.execute(proposal.handle, h.signal())),
    ).toMatchObject({ status: "observed" });
  });
  for (const date of ["2026-02-30", "2026-10-13T00:00:00.000Z", "10/13/2026"]) {
    it(`refuses invalid HTML date ${date} before transport`, async () => {
      const h = harness();
      h.queue.push("query");
      const page = accepted(await h.port.query(h.signal()));
      expect(
        await h.port.draft(
          page.items[0]!.selection,
          { title: context.task.title, dueDate: date },
          h.signal(),
        ),
      ).toEqual({ ok: false, problem: "not-dispatched" });
      expect(h.requests).toHaveLength(1);
    });
  }
});

describe("Meri captured query intent", () => {
  for (const name of [
    "query-foreign-intent-limit",
    "query-foreign-intent-page",
  ]) {
    it(`refuses receiver-valid ${name} rather than claiming the requested first page`, async () => {
      const h = harness();
      await expect(h.receive(name)).resolves.not.toHaveProperty("error");
      h.queue.push(name);
      expect(await h.port.query(h.signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(h.journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(h.requests).toHaveLength(1);
    });
  }
});
