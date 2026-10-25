import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  readRecoveryDisposition,
} from "../src/shared/session/recovery/journal";
import {
  prepareProspectFileCopy,
  prospectFileCopyScope,
} from "../src/features/portfolio/files/upload-copy/command";
import {
  prospectFileCopyRecoveryContract,
  type ProspectFileCopyAttempt,
} from "../src/features/portfolio/files/upload-copy/contracts";
import {
  runProspectFileCopy,
  type ProspectFileCopyAction,
} from "../src/features/portfolio/files/upload-copy/recovery";
import {
  actor,
  id,
  review,
  fixture,
  receiptFor,
  copyCalls,
  source,
} from "./prospect-file-copy-fixtures";
import {
  barrier,
  db,
  installPlatform,
  local,
} from "./command-recovery-platform";
installPlatform();
const guard = () => {},
  scope = prospectFileCopyScope(actor, id(3));
const submit: ProspectFileCopyAction = {
  kind: "submit",
  review,
  folder: "Private",
};
const run = (
  f: ReturnType<typeof fixture>,
  action: ProspectFileCopyAction,
  observe: (saved: ProspectFileCopyAttempt | null) => void = () => {},
) =>
  runProspectFileCopy(
    f.api,
    actor,
    id(3),
    id(4),
    action,
    guard,
    new AbortController().signal,
    observe,
  );
const held = () => readRecovery(scope, prospectFileCopyRecoveryContract, guard);
async function retain() {
  const saved = await prepareProspectFileCopy(actor, review, "Private", id(50));
  await reserveRecovery(
    scope,
    saved.command.requestId,
    saved,
    prospectFileCopyRecoveryContract,
    guard,
  );
  return saved;
}
it("persists encrypted reviewed intent before POST; lost ACK recovers history after source deletion", async () => {
  let saved: ProspectFileCopyAttempt | null = null;
  const f = fixture({
    copy: async () => {
      expect(await held()).toEqual(saved);
      expect([...local.values()].join("")).not.toContain(source.fileName);
      expect(JSON.stringify([...db.records.values()])).not.toContain(
        source.fileName,
      );
      throw new TypeError("lost acknowledgement");
    },
  });
  await expect(
    run(f, submit, (value) => {
      saved = value;
    }),
  ).rejects.toThrow("lost acknowledgement");
  const original = (await held())!;
  const recovered = fixture({
    files: [],
    copy: () => receiptFor(original, "completed", false),
  });
  expect(
    (await run(recovered, { kind: "check", expected: original })).available,
  ).toBe(false);
  expect(
    recovered.calls.some((call) => call.path.includes("attachments?")),
  ).toBe(false);
  await run(recovered, { kind: "acknowledge", expected: original });
  expect(copyCalls(recovered).map((call) => call.method)).toEqual([
    "GET",
    "GET",
  ]);
  expect(await held()).toBeNull();
  expect(
    await readRecoveryDisposition(scope, original.command.requestId, guard),
  ).toMatchObject({ state: "acknowledged" });
});
it.each([true, false])(
  "completed available=%s suppresses explicit retry POST",
  async (available) => {
    const saved = await retain(),
      f = fixture({ copy: () => receiptFor(saved, "completed", available) });
    await run(f, { kind: "retry", expected: saved });
    expect(copyCalls(f).map((call) => call.method)).toEqual(["GET"]);
    expect(await held()).toEqual(saved);
  },
);
it.each(["pending", "missing"])(
  "only explicit retry resumes %s with identical command",
  async (state) => {
    const saved = await retain(),
      f = fixture({
        copy: (method) =>
          method === "POST"
            ? receiptFor(saved)
            : state === "pending"
              ? receiptFor(saved, "pending")
              : Response.json({ message: "Missing" }, { status: 404 }),
      });
    await expect(run(f, submit)).rejects.toThrow("earlier upload copy");
    await run(f, { kind: "retry", expected: saved });
    expect(copyCalls(f).map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(copyCalls(f)[1]!.body).toEqual(saved.command);
    expect(await held()).toEqual(saved);
  },
);
it("pending GET cannot acknowledge or release its saved command", async () => {
  const saved = await retain(),
    f = fixture({ copy: () => receiptFor(saved, "pending") });
  await expect(
    run(f, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow("still pending");
  expect(await held()).toEqual(saved);
});
it.each([401, 403, 404, 409, 503])(
  "GET%s never establishes completion or retires intent",
  async (status) => {
    const saved = await retain(),
      f = fixture({
        copy: () => Response.json({ message: "Unavailable" }, { status }),
      });
    await expect(run(f, { kind: "check", expected: saved })).rejects.toThrow();
    await expect(
      run(f, { kind: "acknowledge", expected: saved }),
    ).rejects.toThrow();
    expect(copyCalls(f).every((call) => call.method === "GET")).toBe(true);
    expect(await held()).toEqual(saved);
  },
);
it("rechecks current authority after a receipt and keeps encrypted intent on late wall404", async () => {
  const saved = await retain();
  let revoked = false;
  const f = fixture({
    copy: () => {
      revoked = true;
      return receiptFor(saved);
    },
    override: (path) =>
      revoked && path.includes("/clients/")
        ? Response.json({ message: "Unavailable" }, { status: 404 })
        : undefined,
  });
  await expect(
    run(f, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow("access");
  expect(await held()).toEqual(saved);
});
it("a 404 followed by current access denial never replays the retained POST", async () => {
  const saved = await retain();
  let revoked = false;
  const f = fixture({
    copy: () => {
      revoked = true;
      return Response.json({ message: "Missing" }, { status: 404 });
    },
    override: (path) =>
      revoked && path.includes("/clients/")
        ? Response.json({ message: "Unavailable" }, { status: 404 })
        : undefined,
  });
  await expect(run(f, { kind: "retry", expected: saved })).rejects.toThrow(
    "access",
  );
  expect(copyCalls(f).map((call) => call.method)).toEqual(["GET"]);
  expect(await held()).toEqual(saved);
});
it("freezes review and destination before awaiting current authority", async () => {
  const entered = barrier(),
    release = barrier();
  let first = true;
  let observed: ProspectFileCopyAttempt | null = null;
  const input = structuredClone(submit),
    f = fixture({
      override: async (path) => {
        if (first && path.endsWith("/me")) {
          first = false;
          entered.resolve();
          await release.promise;
        }
        return undefined;
      },
      copy: () => receiptFor(observed!),
    });
  const pending = run(f, input, (saved) => {
    observed = saved;
  });
  await entered.promise;
  if (input.kind === "submit") {
    input.folder = "Changed";
    input.review.selection.fileName = "Changed name";
  }
  release.resolve();
  await pending;
  expect(copyCalls(f)[0]!.body).toMatchObject({
    folder: "Private",
    sourceId: source.id,
  });
  expect((await held())?.fileName).toBe(source.fileName);
});
it("storage failure prevents any POST", async () => {
  db.failWrite = true;
  const f = fixture();
  await expect(run(f, submit)).rejects.toThrow("storage");
  expect(copyCalls(f)).toHaveLength(0);
});
