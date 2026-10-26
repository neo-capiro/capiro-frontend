import { createHash } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const binding = {
  tenantId: "synthetic",
  actorId: "actor",
  conversationId: id(1),
  runId: id(2),
  attemptId: id(3),
  workerId: id(4),
  writerFence: 1,
};
const scopes = [
  {
    tenantId: binding.tenantId,
    kind: "client",
    resourceId: id(5),
    policyRevision: "p1",
  },
];
const run = {
  binding,
  scopes,
  createdAt: "2026-10-24T00:00:00Z",
  policyRevision: "p1",
  versions: {
    imageDigest: `sha256:${"a".repeat(64)}`,
    sdk: "0.3.295",
    cli: "2.1.295",
    contracts: "0.1.0",
    skillsDigest: "b".repeat(64),
    checkpointFormat: "0.1.0",
  },
};
const hash = (input: object) =>
  createHash("sha256")
    .update(JSON.stringify(input, Object.keys(input).sort()))
    .digest("hex");
async function setup(page: Page, paused = false) {
  await page.route("**/api/conversations/history", (route) =>
    route.fulfill({
      json: {
        run: { ...run, state: paused ? "paused" : "running" },
        request: {
          requestId: id(6),
          prompt: "Reviewed",
          skill: null,
          window: null,
          windowRequest: null,
        },
        events: [
          {
            contractVersion: "0.1.0",
            eventId: id(10),
            binding,
            sequence: 1,
            createdAt: run.createdAt,
            scopes,
            type: "run.status",
            data: { state: paused ? "paused" : "running", reasonCode: null },
          },
          ...(paused
            ? [
                {
                  contractVersion: "0.1.0",
                  eventId: id(11),
                  binding,
                  sequence: 2,
                  createdAt: run.createdAt,
                  scopes,
                  type: "checkpoint.verified",
                  data: { checkpointId: id(8) },
                },
              ]
            : []),
        ],
        nextSequence: paused ? 2 : 1,
        hasMore: false,
        lastSequence: paused ? 2 : 1,
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByText("Port: ready", { exact: true })).toBeVisible();
  await page.getByText("Pause and recovery", { exact: true }).click();
}
function receipt(body: Record<string, unknown>, state = "APPLIED") {
  return {
    controlId: body.controlId,
    intent: body.intent,
    sourceBinding: binding,
    inputSha256: hash(body),
    state,
    checkpointId: null,
    targetBinding: null,
    admissionReceiptId: null,
    retirementReceiptId: null,
    replayed: false,
  };
}
test("lost steer response and reopening retain exact control without automatic replay", async ({
  page,
}) => {
  const commands: Record<string, unknown>[] = [];
  await page.route("**/api/conversations/control", async (route) => {
    const body = route.request().postDataJSON();
    commands.push(body);
    if (commands.length === 1) return route.abort("failed");
    return route.fulfill({ json: { ...receipt(body), replayed: true } });
  });
  await setup(page);
  await page
    .getByLabel("Steer this run")
    .fill("Keep the exact selected window");
  await page.getByRole("button", { name: "Send guidance" }).click();
  await expect(
    page.getByRole("button", { name: "Retry same control" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reopen source session" }).click();
  await expect(page.getByText("Port: ready", { exact: true })).toBeVisible();
  await page.getByText("Pause and recovery", { exact: true }).click();
  expect(commands).toHaveLength(1);
  await page.getByRole("button", { name: "Retry same control" }).click();
  await expect(
    page.getByRole("button", { name: "Retry same control" }),
  ).toHaveCount(0);
  expect(commands).toHaveLength(2);
  expect(commands[1]).toEqual(commands[0]);
});
test("a pending receipt permits only exact retry and session replacement retires it", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/conversations/control", (route) => {
    calls++;
    return route.fulfill({
      json: receipt(route.request().postDataJSON(), "PENDING"),
    });
  });
  await setup(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry same control" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Replace signed-in session" }).click();
  await expect(page.getByText("Port: ready", { exact: true })).toBeVisible();
  await page.getByText("Pause and recovery", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry same control" }),
  ).toHaveCount(0);
  expect(calls).toBe(1);
});
test("selected skill applies exact version and DST window to draft and survives reopening without submit", async ({
  page,
}) => {
  let submits = 0;
  await page.route("**/api/conversations/submit", (route) => {
    submits++;
    return route.abort();
  });
  await setup(page);
  await page.getByText("Skill · None", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Skill", exact: true })
    .selectOption("quick_skill.client_changes");
  await page
    .getByRole("combobox", { name: "Time window", exact: true })
    .selectOption("explicit");
  await page.getByLabel("Start, inclusive").fill("2026-10-31T00:00:00-04:00");
  await page.getByLabel("End, exclusive").fill("2026-11-02T00:00:00-05:00");
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await page.getByRole("button", { name: "Apply to draft" }).click();
  const expected = {
    skill: { skillId: "quick_skill.client_changes", skillVersion: "1.0.1" },
    windowRequest: {
      basis: "explicit",
      startInclusive: "2026-10-31T04:00:00.000Z",
      endExclusive: "2026-11-02T05:00:00.000Z",
      timezone: "America/New_York",
    },
  };
  await expect(page.getByLabel("Applied selection")).toHaveText(
    JSON.stringify(expected),
  );
  await page.getByRole("button", { name: "Reopen source session" }).click();
  await expect(page.getByLabel("Applied selection")).toHaveText(
    JSON.stringify(expected),
  );
  expect(submits).toBe(0);
});
test("reviewed client handoff needs explicit adoption and never sends the draft", async ({
  page,
}) => {
  let submits = 0;
  await page.route("**/api/conversations/submit", (route) => {
    submits++;
    return route.abort();
  });
  await setup(page);
  await page.getByRole("button", { name: "Prepare client draft" }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByRole("button", { name: "Use reviewed draft" }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue(
    "Reviewed synthetic initial message",
  );
  expect(submits).toBe(0);
});
for (const intent of ["resume", "fork"] as const)
  test(`${intent} requires inspected checkpoint and uses only its validated exact target`, async ({
    page,
  }) => {
    const calls: string[] = [];
    const target = {
      ...binding,
      conversationId: intent === "fork" ? id(90) : binding.conversationId,
      runId: id(91),
      attemptId: id(92),
      workerId: id(93),
      writerFence: 2,
    };
    await page.route("**/api/conversations/checkpoints/inspect", (route) => {
      calls.push("inspect");
      expect(route.request().postDataJSON()).toEqual({ checkpointId: id(8) });
      return route.fulfill({
        json: {
          checkpointId: id(8),
          checkpointSha256: "a".repeat(64),
          sourceBinding: binding,
          lastEventSequence: 2,
        },
      });
    });
    await page.route("**/api/conversations/control", (route) => {
      calls.push("control");
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        intent,
        checkpointId: id(8),
        checkpointSha256: "a".repeat(64),
      });
      return route.fulfill({
        json: {
          ...receipt(body),
          checkpointId: id(8),
          targetBinding: target,
          admissionReceiptId: id(94),
          retirementReceiptId: intent === "resume" ? id(95) : null,
        },
      });
    });
    await setup(page, true);
    await expect(
      page.getByRole("button", { name: "Resume", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Inspect latest checkpoint" })
      .click();
    await page
      .getByRole("button", {
        name: intent === "resume" ? "Resume" : "Fork into new chat",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Target")).toHaveText(JSON.stringify(target));
    expect(calls).toEqual(["inspect", "control"]);
  });
for (const clientId of [id(5), id(15)])
  test(`client profile ${clientId} revalidates before transferring reviewed draft`, async ({
    page,
    baseURL,
  }) => {
    const readPaths: string[] = [];
    let writes = 0;
    await page.route("**/api/backend/core/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "actor", email: null },
          tenant: { id: "synthetic", name: "Synthetic" },
        },
      }),
    );
    await page.route("**/api/backend/core/clients/*", (route) => {
      readPaths.push(new URL(page.url()).pathname);
      return route.fulfill({
        json: {
          id: clientId,
          name: "Synthetic client",
          status: "active",
          profileStatus: "ready",
        },
      });
    });
    await page.route("**/api/conversations/**", (route) => {
      writes++;
      return route.abort();
    });
    await page.goto(`/profile?clientId=${clientId}`);
    await expect(page.getByLabel("Your initial message")).toBeEnabled();
    await page
      .getByLabel("Your initial message")
      .fill("Reviewed profile question");
    await page.getByRole("button", { name: "Open draft in Meri" }).click();
    await expect(page).toHaveURL(
      new URL(`/meri?clientId=${clientId}`, baseURL).href,
    );
    // The destination may revalidate again; the profile must read before transfer.
    expect(readPaths.filter((path) => path === "/profile")).toHaveLength(2);
    expect(writes).toBe(0);
  });
test("client profile fresh archived refusal keeps reviewed text and does not navigate", async ({
  page,
}) => {
  let reads = 0;
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "actor", email: null },
        tenant: { id: "synthetic", name: "Synthetic" },
      },
    }),
  );
  await page.route("**/api/backend/core/clients/*", (route) => {
    reads++;
    return route.fulfill({
      json: {
        id: id(5),
        name: "Synthetic client",
        status: reads === 1 ? "active" : "archived",
        profileStatus: "ready",
      },
    });
  });
  await page.goto(`/profile?clientId=${id(5)}`);
  await expect(page.getByLabel("Your initial message")).toBeEnabled();
  await page.getByLabel("Your initial message").fill("Unsent review");
  await page.getByRole("button", { name: "Open draft in Meri" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be verified");
  await expect(page.getByLabel("Your initial message")).toHaveValue(
    "Unsent review",
  );
  await expect(page).toHaveURL(/\/profile\?/);
});

test("client profile revalidation releases an aborted verification while retaining the draft", async ({
  page,
  baseURL,
}) => {
  let reads = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backend/core/me", async (route) => {
    reads++;
    if (reads === 2) await held;
    await route
      .fulfill({
        json: {
          user: { id: "actor", email: null },
          tenant: { id: "synthetic", name: "Synthetic" },
        },
      })
      .catch(() => {});
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: {
        id: id(5),
        name: "Synthetic client",
        status: "active",
        profileStatus: "ready",
      },
    }),
  );
  await page.goto(`/profile?clientId=${id(5)}`);
  await expect(page.getByLabel("Your initial message")).toBeEnabled();
  await page
    .getByLabel("Your initial message")
    .fill("Retained reviewed question");
  await page.getByRole("button", { name: "Open draft in Meri" }).click();
  await expect.poll(() => reads).toBe(2);
  await page
    .getByRole("button", {
      name: "Revalidate current session",
      includeHidden: true,
    })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => reads).toBe(3);
  await expect(
    page.getByRole("button", { name: "Open draft in Meri" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Your initial message")).toHaveValue(
    "Retained reviewed question",
  );
  await expect(page).toHaveURL(/\/profile\?/);
  release();
  await page.getByRole("button", { name: "Open draft in Meri" }).click();
  await expect(page).toHaveURL(
    new URL(`/meri?clientId=${id(5)}`, baseURL).href,
  );
});
