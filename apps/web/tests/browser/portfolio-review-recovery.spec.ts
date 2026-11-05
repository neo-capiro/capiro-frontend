import { test, expect } from "@playwright/test";
import {
  installRecovery,
  proposal,
  conflicts,
  factId,
} from "./portfolio-review-recovery-fixtures";
import { prospectId } from "./fixtures";

// One existing local server, browser context and page. No retries or live API.
test.use({ serviceWorkers: "block" });
test("PR564 mounted review recovery, bounded synthetic matrix", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(300_000);
  if (!baseURL)
    throw new Error("The existing local component baseURL is required");
  const fixture = await installRecovery(page, baseURL);
  const budget = { uiActions: 0, observations: 0 };
  const results: string[] = [];
  const action = async (work: () => Promise<unknown>) => {
    if (++budget.uiActions > 30)
      throw new Error(
        "30-action allocation exhausted; no further action dispatched",
      );
    await work();
  };
  const check = async (work: () => Promise<unknown> | void) => {
    if (++budget.observations > 60)
      throw new Error("60-observation allocation exhausted");
    await work();
  };
  const open = (mode: string) =>
    action(() => page.goto(`/portfolio-review-recovery.html?mode=${mode}`));
  const refresh = () =>
    action(() =>
      page.evaluate(() => window.dispatchEvent(new Event("recovery-refresh"))),
    );
  // These seven cases use exactly 30 UI actions. Other selectable cases are
  // prepared for a separately bound run, never silently added to this grant.
  const cases = (
    process.env.CAPIRO_RECOVERY_CASES ??
    "edit:changed,split:omitted,new:409,existing:409,existing:503,facts:409,facts:503"
  ).split(",");
  try {
    for (const scenario of cases) {
      await test.step(scenario, async () => {
        const state = fixture.reset();
        const [kind = "", change = ""] = scenario.split(":");
        if (kind === "edit" || kind === "split") {
          if (
            ![
              "omitted",
              "version",
              "evidence",
              "status",
              "changed",
              "403",
              "depth403",
            ].includes(change)
          )
            throw new Error(`Unknown proposal case: ${scenario}`);
          await open("discovery");
          await action(() =>
            page
              .getByRole("button", {
                name: kind === "edit" ? "Edit" : "Split",
                exact: true,
              })
              .click(),
          );
          const dialog = page.getByRole("dialog", {
            name:
              kind === "edit"
                ? "Edit capability proposal"
                : "Split distinct capabilities",
          });
          await check(() => expect(dialog).toBeVisible());
          if (change === "omitted") state.proposals = [];
          else if (change === "403") state.discoveryStatus = 403;
          else if (change === "depth403") state.depthStatus = 403;
          else {
            const next = proposal();
            if (["version", "changed"].includes(change)) next.version++;
            if (["evidence", "changed"].includes(change)) next.evidence = [];
            if (change === "status") next.status = "approved";
            state.proposals = [next];
          }
          await refresh();
          await check(() =>
            expect(page.getByTestId("refreshes")).toHaveText("1"),
          );
          await check(() => expect(dialog).toHaveCount(0));
          if (change !== "version" && change !== "status")
            await check(() =>
              expect(
                page.getByText("Synthetic original evidence passage", {
                  exact: true,
                }),
              ).toHaveCount(0),
            );
          if (change !== "changed")
            await check(() => expect(state.proposalWrites).toEqual([]));
          if (change === "changed") {
            // Whole-query denial control after retirement. Open-dialog denial is
            // a separate selectable case (edit:403 or split:403).
            state.discoveryStatus = 403;
            await refresh();
            await check(() =>
              expect(page.getByTestId("refreshes")).toHaveText("2"),
            );
            await check(() =>
              expect(
                page.getByRole("button", { name: "Edit", exact: true }),
              ).toHaveCount(0),
            );
            await check(() => expect(state.proposalWrites).toEqual([]));
          }
        } else if (kind === "new" || kind === "existing") {
          if (!["409", "503"].includes(change))
            throw new Error(`Unknown prospect case: ${scenario}`);
          state.refusal = Number(change);
          await open(kind);
          await action(() =>
            page
              .getByRole("textbox", { name: "Company name", exact: false })
              .fill("Synthetic reviewed company"),
          );
          const save = page.getByRole("button", {
            name: kind === "new" ? "Create prospect" : "Save company details",
            exact: true,
          });
          await action(() => save.click());
          if (kind === "new") {
            await action(() =>
              page
                .getByRole("radio", {
                  name: "Create a profile with the company details I entered",
                })
                .check(),
            );
            await action(() => save.click());
          }
          await check(() =>
            expect(
              page.getByText("Synthetic profile refusal", { exact: true }),
            ).toBeVisible(),
          );
          const original = structuredClone(state.profileWrites[0]!);
          if (change === "503")
            await check(() =>
              expect(original.expectedVersion).toBe("a".repeat(64)),
            );
          if (change === "409") {
            const confirm = page.getByRole("button", {
              name: "Save reviewed profile details",
            });
            await check(() => expect(confirm).toBeDisabled());
            await action(() =>
              page
                .getByRole("button", {
                  name: "Review current profile details",
                  exact: true,
                })
                .click(),
            );
            await check(() =>
              expect(
                page.getByText("Current: Synthetic current B", { exact: true }),
              ).toBeVisible(),
            );
            await check(() => expect(state.profileWrites).toHaveLength(1));
            await action(() => confirm.click());
          } else {
            await check(() =>
              expect(
                page.getByRole("button", {
                  name: "Review current profile details",
                  exact: true,
                }),
              ).toHaveCount(0),
            );
            await action(() =>
              page
                .getByRole("button", {
                  name: "Retry profile details",
                  exact: true,
                })
                .click(),
            );
          }
          await check(() =>
            expect(page.getByTestId("saved")).toHaveText(
              `Saved prospect: ${prospectId}`,
            ),
          );
          await check(() => expect(state.firstWrites).toHaveLength(1));
          await check(() => expect(state.profileWrites).toHaveLength(2));
          if (change === "409") {
            await check(() =>
              expect(state.profileWrites[1]).toEqual({
                ...original,
                expectedVersion: "b".repeat(64),
                requestId: expect.any(String),
              }),
            );
            await check(() =>
              expect(state.profileWrites[1]!.requestId).not.toBe(
                original.requestId,
              ),
            );
          } else {
            await check(() => expect(state.profileWrites[1]).toEqual(original));
            await check(() => expect(state.reads).toBe(1));
          }
        } else if (kind === "facts") {
          if (!["409", "503"].includes(change))
            throw new Error(`Unknown fact case: ${scenario}`);
          state.profile = conflicts();
          state.refusal = Number(change);
          await open("facts");
          const decisions = page.getByRole("button", {
            name: "Accept proposed",
            exact: true,
          });
          await action(() => decisions.first().click());
          await check(() =>
            expect(
              page.getByText("Synthetic fact refusal", { exact: true }),
            ).toBeVisible(),
          );
          await check(() => expect(decisions.nth(1)).toBeDisabled());
          const original = structuredClone(state.factWrites[0]);
          if (change === "409") {
            await action(() =>
              page
                .getByRole("button", {
                  name: "Refresh current conflicts",
                  exact: true,
                })
                .click(),
            );
            await check(() => expect(decisions).toHaveCount(1));
            await check(() => expect(decisions).toBeEnabled());
            await check(() => expect(state.factWrites).toHaveLength(1));
            await action(() => decisions.click());
          } else {
            await check(() =>
              expect(
                page.getByRole("button", {
                  name: "Refresh current conflicts",
                  exact: true,
                }),
              ).toHaveCount(0),
            );
            await action(() =>
              page
                .getByRole("button", {
                  name: "Check or retry this decision",
                  exact: true,
                })
                .click(),
            );
          }
          await check(() => expect(decisions).toHaveCount(0));
          await check(() => expect(state.factWrites).toHaveLength(2));
          if (change === "409") {
            await check(() =>
              expect(state.factWrites[1]).toEqual({
                path: expect.stringContaining(`/facts/${factId(4)}/resolve`),
                body: {
                  expectedVersion: 3,
                  resolution: "accept_proposed",
                  requestId: expect.any(String),
                },
              }),
            );
          } else
            await check(() => expect(state.factWrites[1]).toEqual(original));
        } else throw new Error(`Unknown recovery case: ${scenario}`);
        await check(() => expect(state.unexpected).toEqual([]));
        await page.evaluate(() => document.fonts.ready);
        await testInfo.attach(`recovery-${scenario.replace(":", "-")}`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
        results.push(scenario);
      });
    }
  } finally {
    await testInfo.attach("recovery-budget-and-cases", {
      body: JSON.stringify({ cases, completed: results, ...budget }, null, 2),
      contentType: "application/json",
    });
  }
});
