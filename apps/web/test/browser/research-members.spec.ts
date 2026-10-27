import { expect, test, type Page } from "@playwright/test";
import { ids, portfolio, timestamp } from "./research-sharing-fixture";
import type { ResearchDetail } from "../../src/shared/capiro/operations/research-schemas";

type ObservedInput = {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};
const memberA = "30000000-0000-4000-8000-000000000001";
const memberB = "30000000-0000-4000-8000-000000000002";
const target = "30000000-0000-4000-8000-000000000003";
function receipt(outcomes: object[], replayed = false) {
  return {
    portfolioId: ids.portfolio,
    eventId: "synthetic-event",
    actorUserId: "owner",
    occurredAt: timestamp,
    resultingRevision: 2,
    replayed,
    outcomes,
  };
}
async function fixtures(
  page: Page,
  detail: () => ResearchDetail,
  handle: (
    key: string,
    input: ObservedInput,
  ) =>
    | { status?: number; body: unknown }
    | undefined
    | Promise<{ status?: number; body: unknown } | undefined>,
) {
  await page.route("**/api/capiro/**", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.split("/").at(-1) ?? "";
    const input =
      route.request().method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : route.request().postDataJSON();
    const custom = await handle(key, input);
    if (custom)
      return route.fulfill({ status: custom.status ?? 200, json: custom.body });
    return route.fulfill({
      json:
        key === "research.detail"
          ? detail()
          : key === "research.tour"
            ? {
                tourVersion: "research-portfolios-v1",
                status: "dismissed",
                completedAt: null,
              }
            : [],
    });
  });
}
const members: ResearchDetail["members"] = [memberA, memberB].map(
  (id, index) => ({
    id,
    targetKind: "program_element",
    targetId: `060123${index}A`,
    label: `Synthetic member ${index + 1}`,
    disposition: "included",
    reason: null,
    origin: "manual",
    unresolvedInput: null,
    revision: 1,
    updatedAt: timestamp,
  }),
);

test("typed program discovery adds the canonical identity and retains exact request after lost ACK and reload", async ({
  page,
}) => {
  const requests: ObservedInput[] = [];
  const searchRequests: ObservedInput[] = [];
  let detail = { ...portfolio };
  await fixtures(
    page,
    () => detail,
    (key, input) => {
      if (key === "research.members.search") {
        searchRequests.push(input);
        const match = {
          subject: { type: "program", id: target, label: "Synthetic program" },
          secondaryLabel: null,
          matchKind: "canonical_name",
          score: null,
          explanation: {
            queryTerm: "synthetic",
            matchedFields: ["title"],
            rationale: "Matched title",
            negativeControls: [],
          },
          availability: "available",
          evidence: [],
        };
        return {
          body: {
            query: "synthetic",
            expansion: {
              original: "synthetic",
              normalized: "synthetic",
              terms: [],
              excludedTerms: [],
              applied: false,
            },
            exact: { status: "available", reason: null, items: [match] },
            capability: { status: "available", reason: null, items: [] },
            semantic: { status: "disabled", reason: null, items: [] },
            limitations: [],
          },
        };
      }
      if (key === "research.members.add") {
        requests.push(input);
        detail = {
          ...portfolio,
          revision: 2,
          members: [
            {
              ...members[0]!,
              id: memberA,
              targetKind: "program",
              targetId: target,
              label: "Synthetic program",
            },
          ],
        };
        return requests.length === 1
          ? { status: 503, body: { message: "Synthetic lost ACK" } }
          : {
              body: receipt(
                [
                  {
                    targetId: target,
                    targetType: "member",
                    status: "created",
                    id: memberA,
                  },
                ],
                true,
              ),
            };
      }
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page.getByRole("button", { name: "+ Add member", exact: true }).click();
  await page.getByLabel("Member type", { exact: true }).selectOption("program");
  await page
    .getByLabel("Find by name, code, alias or capability")
    .fill("synthetic");
  await page.getByRole("button", { name: "Find members", exact: true }).click();
  await page
    .getByRole("radio", { name: "Select Synthetic program", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Add selected member", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic lost ACK", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reload portfolio", exact: true })
    .click();
  await expect(page.getByLabel("Member type", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Member operation outcomes" }),
  ).toContainText("created");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0]?.body).toMatchObject({
    targetKind: "program",
    targetId: target,
    expectedRevision: 1,
  });
  expect(searchRequests[0]?.query.semanticEnabled).toBe(false);
});

test("award discovery uses canonical UUID and bounded paging", async ({
  page,
}) => {
  const writes: ObservedInput[] = [];
  const reads: ObservedInput[] = [];
  await fixtures(
    page,
    () => portfolio,
    (key, input) => {
      if (key === "research.members.awards") {
        reads.push(input);
        return {
          body: {
            total: 21,
            rows: [
              {
                id: target,
                piid: "EXTERNAL-PIID",
                contractorName: "Synthetic award contractor",
                awardingAgency: "Synthetic agency",
                description: "Synthetic award",
              },
            ],
          },
        };
      }
      if (key === "research.members.add") {
        writes.push(input);
        return {
          body: receipt([
            {
              targetId: target,
              targetType: "member",
              status: "created",
              id: memberA,
            },
          ]),
        };
      }
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page.getByRole("button", { name: "+ Add member", exact: true }).click();
  await page.getByLabel("Member type", { exact: true }).selectOption("award");
  await page
    .getByLabel("Find by contractor, PIID, agency or description")
    .fill("EXTERNAL-PIID");
  await page.getByRole("button", { name: "Find members", exact: true }).click();
  await page.getByRole("button", { name: "Next awards", exact: true }).click();
  await page
    .getByRole("radio", {
      name: "Select Synthetic award contractor",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Add selected member", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Member operation outcomes" }),
  ).toBeVisible();
  expect(reads.map((read) => read.query.page)).toEqual([1, 2]);
  expect(reads[1]?.query.pageSize).toBe(20);
  expect(writes[0]?.body).toMatchObject({
    targetKind: "award",
    targetId: target,
  });
});

test("bulk decisions retain exact lost-ACK request and display each returned row", async ({
  page,
}) => {
  const requests: ObservedInput[] = [];
  let detail = { ...portfolio, members, memberCount: 2 };
  await fixtures(
    page,
    () => detail,
    (key, input) => {
      if (key !== "research.members.decide") return;
      requests.push(input);
      detail = { ...detail, revision: 2 };
      return requests.length === 1
        ? { status: 503, body: { message: "Synthetic bulk lost ACK" } }
        : {
            body: receipt(
              members.map((member) => ({
                targetId: member.targetId,
                targetType: "member",
                status: "updated",
                id: member.id,
                message: "excluded",
              })),
              true,
            ),
          };
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page
    .getByRole("checkbox", { name: "Select member Synthetic member 1" })
    .check();
  await page
    .getByRole("checkbox", { name: "Select member Synthetic member 2" })
    .check();
  await page
    .getByRole("button", { name: "Exclude selected", exact: true })
    .click();
  await page
    .getByLabel("Reason for every selected member")
    .fill("Explicit synthetic batch decision");
  await page
    .getByRole("button", { name: "Confirm decisions", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic bulk lost ACK", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reload portfolio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry same decisions", exact: true })
    .click();
  const table = page.getByRole("table", { name: "Member operation outcomes" });
  await expect(table).toContainText("Synthetic member 1");
  await expect(table).toContainText("Synthetic member 2");
  await expect(table.getByRole("row")).toHaveCount(3);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0]?.body.decisions).toHaveLength(2);
  expect(requests[0]?.body.expectedRevision).toBe(1);
});

test("excluded unresolved members require resolution and viewer mutations remain disabled", async ({
  page,
}) => {
  let detail: ResearchDetail = {
    ...portfolio,
    members: [
      {
        ...members[0]!,
        disposition: "excluded",
        unresolvedInput: { label: "Imported unresolved" },
      },
    ],
  };
  const writes: unknown[] = [];
  await fixtures(
    page,
    () => detail,
    (key, input) => {
      if (key.startsWith("research.members.")) {
        writes.push(input);
        return { status: 403, body: { message: "Refused" } };
      }
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page
    .getByRole("checkbox", { name: "Select member Synthetic member 1" })
    .check();
  await expect(
    page.getByRole("button", { name: "Include selected", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Resolve", exact: true }),
  ).toBeEnabled();
  detail = { ...detail, myRole: "viewer" };
  await page.reload();
  await expect(
    page.getByRole("button", { name: "+ Add member", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Resolve", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});

test("same-portfolio refresh keeps unknown decisions mounted but disables writes until it finishes", async ({
  page,
}) => {
  let refreshing = false;
  let writes = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await fixtures(
    page,
    () => ({ ...portfolio, members }),
    async (key) => {
      if (key === "research.members.decide") {
        writes += 1;
        return { status: 503, body: { message: "Synthetic pending outcome" } };
      }
      if (key === "research.detail" && refreshing) {
        await gate;
        return { body: { ...portfolio, members, revision: 2 } };
      }
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page
    .getByRole("button", { name: "Exclude", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Reason for every selected member")
    .fill("Retain this exact decision");
  await page
    .getByRole("button", { name: "Confirm decisions", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic pending outcome", { exact: true }),
  ).toBeVisible();
  refreshing = true;
  await page
    .getByRole("button", { name: "Reload portfolio", exact: true })
    .click();
  const retry = page.getByRole("button", {
    name: "Retry same decisions",
    exact: true,
  });
  // This portalled control is outside the inert DOM subtree. React capture
  // blocks its handler without misrepresenting the user's actual grant.
  await retry.click();
  expect(writes).toBe(1);
  await expect(page.getByLabel("Reason for every selected member")).toHaveValue(
    "Retain this exact decision",
  );
  release();
  await expect(
    page.getByText("Refreshing portfolio. Changes are temporarily disabled.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await retry.click();
  await expect.poll(() => writes).toBe(2);
});

test("actual portfolio refusal clears retained child data and actions", async ({
  page,
}) => {
  let denied = false;
  await fixtures(
    page,
    () => ({ ...portfolio, members }),
    (key) => {
      if (key === "research.members.decide")
        return {
          status: 503,
          body: { message: "Synthetic lost decision response" },
        };
      if (key === "research.detail" && denied)
        return { status: 403, body: { message: "Synthetic access revoked" } };
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page
    .getByRole("button", { name: "Exclude", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Reason for every selected member")
    .fill("Private synthetic reason");
  await page
    .getByRole("button", { name: "Confirm decisions", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic lost decision response", { exact: true }),
  ).toBeVisible();
  denied = true;
  await page
    .getByRole("button", { name: "Reload portfolio", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic access revoked", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("table", { name: "Research portfolio members" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Synthetic research", exact: true }),
  ).toHaveCount(0);
});

test("portfolio and API scope changes clear prior member drafts and receipts", async ({
  page,
}) => {
  await fixtures(
    page,
    () => portfolio,
    (key, input) => {
      if (key === "research.detail")
        return {
          body: {
            ...portfolio,
            id: input.params.id,
            name:
              input.params.id === ids.portfolio
                ? "Synthetic first portfolio"
                : "Synthetic second portfolio",
          },
        };
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page.getByRole("button", { name: "+ Add member", exact: true }).click();
  await page
    .getByLabel("Find by name, code, alias or capability")
    .fill("First private draft");
  await page.evaluate((id) => {
    window.history.pushState(
      {},
      "",
      `/research-workflow.html?view=members&portfolioId=${id}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, target);
  await expect(
    page.getByRole("heading", {
      name: "Synthetic second portfolio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add member", exact: true }).click();
  await expect(
    page.getByLabel("Find by name, code, alias or capability"),
  ).toHaveValue("");
  await page
    .getByLabel("Find by name, code, alias or capability")
    .fill("Second private draft");
  await page.evaluate((id) => {
    window.history.pushState(
      {},
      "",
      `/research-workflow.html?view=members&portfolioId=${id}&scope=replacement-actor-client`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, target);
  await expect(
    page.getByRole("heading", {
      name: "Synthetic second portfolio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add member", exact: true }).click();
  await expect(
    page.getByLabel("Find by name, code, alias or capability"),
  ).toHaveValue("");
});

test("unresolved member selection submits the existing resolve endpoint with both canonical identities", async ({
  page,
}) => {
  const writes: ObservedInput[] = [];
  const detail: ResearchDetail = {
    ...portfolio,
    members: [
      {
        ...members[0]!,
        disposition: "excluded",
        unresolvedInput: { label: "Imported award" },
      },
    ],
  };
  await fixtures(
    page,
    () => detail,
    (key, input) => {
      if (key === "research.members.awards")
        return {
          body: {
            total: 1,
            rows: [
              {
                id: target,
                piid: "SYNTHETIC-PIID",
                contractorName: "Canonical synthetic award",
                awardingAgency: null,
                description: null,
              },
            ],
          },
        };
      if (key === "research.members.resolve") {
        writes.push(input);
        return {
          body: receipt([
            {
              id: memberA,
              targetType: "member",
              targetId: target,
              status: "updated",
            },
          ]),
        };
      }
    },
  );
  await page.goto("/research-workflow.html?view=members");
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByLabel("Member type", { exact: true }).selectOption("award");
  await page
    .getByLabel("Find by contractor, PIID, agency or description")
    .fill("SYNTHETIC-PIID");
  await page.getByRole("button", { name: "Find members", exact: true }).click();
  await page
    .getByRole("radio", {
      name: "Select Canonical synthetic award",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Resolve member", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Member operation outcomes" }),
  ).toContainText("updated");
  expect(writes).toHaveLength(1);
  expect(writes[0]?.params).toEqual({ id: ids.portfolio, memberId: memberA });
  expect(writes[0]?.body).toMatchObject({
    targetKind: "award",
    targetId: target,
    expectedRevision: 1,
  });
});
