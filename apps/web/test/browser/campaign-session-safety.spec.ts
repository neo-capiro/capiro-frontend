import { expect, test, type Route } from "@playwright/test";
import { session, sessionId } from "../../tests/newsletter-staging-fixtures";
import { assertNoEffects, setupOutreach } from "./core109-outreach-fixtures";

for (const mismatch of ["session", "state-version"] as const)
  test(`campaign ${mismatch} mismatch never admits a writable editor`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let invalid = true;
    await page.route("**/api/capiro/engagement.session?*", (route) =>
      route.fulfill({
        json: invalid
          ? {
              ...session,
              session: {
                ...session.session,
                ...(mismatch === "session"
                  ? { id: "80000000-0000-4000-8000-000000000099" }
                  : { currentStateVersion: session.currentStateVersion + 1 }),
              },
            }
          : session,
      }),
    );
    await page.goto(`/modules/engagement?session=${sessionId}`);
    await expect(page.getByRole("alert")).toContainText(
      "The campaign response does not match the selected campaign.",
    );
    await expect(page.getByLabel("Goal", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save campaign decisions" }),
    ).toHaveCount(0);
    assertNoEffects(observed);

    invalid = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByLabel("Goal", { exact: true })).toHaveValue(
      session.spec.goal.goal,
    );
    assertNoEffects(observed);
  });

const fields = [
  ["Topic", "Submitted campaign topic"],
  ["Goal", "Submitted campaign goal"],
  ["Objective", "Submitted campaign objective"],
  ["Why now", "Submitted campaign timing"],
  ["Campaign angle", "Submitted campaign angle"],
  ["Tone", "Submitted campaign tone"],
] as const;

for (const outcome of ["success", "rejection"] as const)
  test(`campaign ${outcome} keeps one submitted draft frozen until the write settles`, async ({
    page,
  }, info) => {
    const observed = await setupOutreach(page);
    let saved: unknown = session;
    let held: Route | undefined;
    const writes: {
      params: { sessionId: string };
      body: {
        batchId: string;
        expectedStateVersion: number;
        commands: unknown[];
      };
    }[] = [];
    await page.route("**/api/capiro/engagement.session?*", (route) =>
      route.fulfill({ json: saved }),
    );
    await page.route("**/api/capiro/engagement.session.commands", (route) => {
      writes.push(route.request().postDataJSON());
      held = route;
    });
    await page.goto(`/modules/engagement?session=${sessionId}`);
    for (const [label, value] of fields)
      await page.getByLabel(label, { exact: true }).fill(value);

    // Two submissions in one task exercise the guard before React paints busy.
    await page
      .getByRole("button", { name: "Save campaign decisions" })
      .evaluate((button) => {
        const form = button.closest("form")!;
        for (let count = 0; count < 2; count++)
          form.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
    await expect.poll(() => Boolean(held)).toBe(true);
    for (const [label] of fields)
      await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save campaign decisions" }),
    ).toBeDisabled();
    const back = page.getByRole("button", { name: "← All outreach" });
    await expect(back).toBeDisabled();
    await back.evaluate((button) =>
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      ),
    );
    await expect(page.getByLabel("Goal", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`campaign-${outcome}.png`) });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      params: { sessionId },
      body: {
        expectedStateVersion: session.currentStateVersion,
        commands: [
          { type: "SET_GOAL", payload: { value: fields[1][1] } },
          { type: "SET_OBJECTIVE", payload: { value: fields[2][1] } },
          { type: "SET_TOPIC", payload: { value: fields[0][1] } },
          { type: "SET_WHY_NOW", payload: { value: fields[3][1] } },
          { type: "SET_CAMPAIGN_ANGLE", payload: { value: fields[4][1] } },
          { type: "SET_TONE", payload: { value: fields[5][1] } },
        ],
      },
    });

    if (outcome === "success") {
      saved = {
        ...session,
        session: { ...session.session, currentStateVersion: 4 },
        currentStateVersion: 4,
        spec: {
          ...session.spec,
          goal: {
            ...session.spec.goal,
            topic: fields[0][1],
            goal: fields[1][1],
            objective: fields[2][1],
            whyNow: fields[3][1],
          },
          strategy: {
            ...session.spec.strategy,
            campaignAngle: fields[4][1],
            tone: fields[5][1],
          },
        },
      };
      await held!.fulfill({
        json: {
          status: "applied",
          batchId: writes[0]!.body.batchId,
          stateVersion: 4,
          specHash: "saved-campaign",
          changed: true,
          commandCount: 6,
          replayed: false,
        },
      });
      await expect(
        page.getByRole("heading", { name: fields[0][1], exact: true }),
      ).toBeVisible();
    } else {
      await held!.fulfill({
        status: 409,
        json: { message: "Synthetic campaign version conflict" },
      });
      await expect(page.getByRole("alert")).toContainText(
        "Synthetic campaign version conflict",
      );
    }
    for (const [label, value] of fields) {
      await expect(page.getByLabel(label, { exact: true })).toBeEnabled();
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    }
    await expect(back).toBeEnabled();
    expect(writes).toHaveLength(1);
    expect(observed.errors).toEqual([]);
    expect(observed.unexpected).toEqual([]);
  });
