import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { installPlatform } from "./command-recovery-platform";
import { RoutineWorkflow } from "../src/shared/meri-routines/workflow";
import {
  routineRecovery,
  routineContextSchema,
} from "../src/shared/meri-routines/recovery";
import { createRoutinesAccess } from "../src/shared/meri-routines/access";
installPlatform();
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/meri-routines/management.json", import.meta.url),
    "utf8",
  ),
);
const ordinary = JSON.parse(
  readFileSync(
    new URL("./fixtures/meri-routines/canonical.json", import.meta.url),
    "utf8",
  ),
);
function connection(fetcher: typeof fetch) {
  const life = new AbortController();
  return {
    life,
    port: new RoutineWorkflow({
      context: fixture.context,
      signal: life.signal,
      isCurrent: () => !life.signal.aborted,
      access: createRoutinesAccess(
        `routine_session_${"m".repeat(43)}`,
        life.signal,
        fetcher,
      ),
    }),
  };
}
const journal = () => routineRecovery(fixture.context, () => {});

it("run-free recovery survives expired access and lost preparation response without reminting or automatically approving", async () => {
  const calls: Array<{ route: string; body: unknown }> = [];
  const fetcher = vi.fn<typeof fetch>(async (path, init) => {
    const route = String(path).split("routine-")[1]!,
      body = JSON.parse(String(init?.body));
    calls.push({ route, body });
    expect(init?.headers).toMatchObject({
      "X-Meri-Action-Session": `routine_session_${"m".repeat(43)}`,
    });
    if (calls.length === 1)
      throw new Error("Synthetic lost preparation response");
    return Response.json(
      route === "prepare" ? fixture.prepared : fixture.approved,
    );
  });
  const first = connection(fetcher);
  await first.port.load();
  await first.port.prepare(fixture.request);
  expect(first.port.getSnapshot().saved?.prepare).toEqual(fixture.request);
  first.life.abort();
  expect(first.port.getSnapshot().saved).toBeNull();
  const next = connection(fetcher);
  await next.port.load();
  expect(calls).toHaveLength(1);
  expect(next.port.getSnapshot().saved?.context).toEqual(fixture.context);
  await next.port.retryPrepare();
  expect(calls[1]).toEqual(calls[0]);
  expect(next.port.getSnapshot().saved?.proposal).toEqual(
    fixture.prepared.proposal,
  );
  expect(calls.some((c) => c.route === "approve")).toBe(false);
  await next.port.approve();
  expect(calls).toHaveLength(3);
  expect(next.port.getSnapshot().saved?.result?.value).toEqual(
    fixture.approved,
  );
  next.life.abort();
  const reloaded = connection(fetcher);
  await reloaded.port.load();
  expect(calls).toHaveLength(3);
  expect(reloaded.port.getSnapshot().saved?.result?.value).toEqual(
    fixture.approved,
  );
  await reloaded.port.finish();
  expect(await journal().load()).toBeNull();
  reloaded.life.abort();
});

it.each(["create", "update", "current-work"])(
  "management refuses %s before journal custody or HTTP",
  async (mode) => {
    const fetcher = vi.fn<typeof fetch>(),
      c = connection(fetcher);
    await c.port.load();
    const request =
      mode === "current-work"
        ? {
            ...fixture.request,
            request: { ...fixture.request.request, running: "request_cancel" },
          }
        : mode === "update"
          ? {
              ...ordinary.request,
              operation: "update_scheduled_task",
              request: {
                ...ordinary.request.request,
                scheduleId: fixture.request.request.scheduleId,
              },
            }
          : ordinary.request;
    await c.port.prepare(request);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await journal().load()).toBeNull();
    expect(c.port.getSnapshot().message).toBeTruthy();
    c.life.abort();
  },
);

it("management and original execution recovery stay distinct and reject fabricated execution identifiers", async () => {
  expect(
    routineContextSchema.safeParse({
      ...fixture.context,
      conversationId: ordinary.context.conversationId,
      runId: ordinary.context.runId,
    }).success,
  ).toBe(false);
  await routineRecovery(ordinary.context, () => {}).reserve({
    requestId: ordinary.request.requestId,
    context: ordinary.context,
    prepare: ordinary.request,
    approving: false,
  });
  expect(await journal().load()).toBeNull();
  await journal().reserve({
    requestId: fixture.request.requestId,
    context: fixture.context,
    prepare: fixture.request,
    approving: false,
  });
  expect(
    (await routineRecovery(ordinary.context, () => {}).load())?.prepare,
  ).toEqual(ordinary.request);
  expect(
    await routineRecovery(
      { ...fixture.context, actorId: "different-actor" },
      () => {},
    ).load(),
  ).toBeNull();
  expect(
    await routineRecovery(
      { ...fixture.context, selectedClientId: null },
      () => {},
    ).load(),
  ).toBeNull();
});
