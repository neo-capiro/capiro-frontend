import { expect, type Page, type TestInfo } from "@playwright/test";
import { observeHomeIsolation } from "../../test/accessibility-interaction";
import { client, installFixtures, json } from "./fixtures";

export { client };
export const metadataClients = [
  { ...client, intakeData: { city: "Austin", state: "TX" } },
  {
    ...client,
    id: "10000000-0000-4000-8000-000000000002",
    name: "North Coast Energy",
    sectorTag: "Energy",
  },
  {
    ...client,
    id: "10000000-0000-4000-8000-000000000003",
    name: "Sector Pending",
    sectorTag: "",
  },
];
export const suppliedOwner = {
  accountOwnerUserId: "owner-test",
  accountOwner: {
    id: "owner-test",
    firstName: "Taylor",
    lastName: "Owner",
    email: "owner@example.test",
  },
};

export async function portfolioAccessibilityFixture(
  page: Page,
  testInfo: TestInfo,
  records = [client],
  owners: Record<string, typeof suppliedOwner> = {},
) {
  const unexpected = await installFixtures(page);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      request.method() !== "GET"
    )
      mutations.push(`${request.method()} ${request.url()}`);
  });
  await page.route("**/api/backend/core/clients", (route) =>
    route.request().method() === "GET"
      ? json(route, records)
      : route.fallback(),
  );
  await page.route("**/api/backend/core/client-account-owners", (route) =>
    route.request().method() === "GET" ? json(route, owners) : route.fallback(),
  );
  const assertIsolation = await observeHomeIsolation(page, testInfo);
  return () => {
    expect(unexpected).toEqual([]);
    expect(mutations).toEqual([]);
    assertIsolation();
  };
}
