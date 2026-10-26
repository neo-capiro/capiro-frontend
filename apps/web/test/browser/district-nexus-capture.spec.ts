import { test } from "./runtime-observed-test";
import { onlyLocalRequests } from "./fixtures";
import { setup } from "./next-modules-fixtures";

/**
 * Capture the District Nexus view for review against Figma 3.4 1064:241658.
 *
 * The district reads are stubbed with rows shaped like the live preview's
 * response (same field names and realistic magnitudes) so the chrome can be
 * compared with the mockup without pretending the figures are the mockup's.
 */

const district = (
  key: string,
  name: string,
  score: number | null,
  coverage: number,
  contracts: number | null,
  employees: number | null,
) => ({
  districtKey: key,
  state: key.slice(0, 2),
  districtCode: key.slice(3),
  name,
  status: "C" as const,
  awarded: {
    contractObligations: contracts,
    grantObligations: null,
    grantOutlays: null,
  },
  opportunities: {
    opportunityEstimatedFunding: null,
    opportunityAwardCeiling: null,
  },
  clientCount: 1,
  score,
  coveragePercent: coverage,
  employeeCount: employees,
  employeesUnreported: employees == null,
  warnings: [],
});

test.setTimeout(120_000);

test("capture: district nexus 1440", async ({ page }) => {
  await onlyLocalRequests(page);
  await setup(page, {
    "clients.list": [
      { id: "11111111-1111-1111-1111-111111111111", name: "Anduril", profileStatus: "active" },
      { id: "22222222-2222-2222-2222-222222222222", name: "Kratos", profileStatus: "active" },
    ],
    "intelligence.district.map": {
      districts: [
        district("FL-08", "Melbourne", 35, 35, 1953112113, null),
        district("CA-12", "Oakland", 25, 25, null, null),
        district("TX-03", "Plano", null, 10, 8836796600, 3400),
        district("NH-02", "Nashua", null, 10, 1887755719, 2100),
        district("NY-25", "Rochester", null, 10, 1728989702, 900),
        district("OH-02", "Cincinnati", null, 10, 1242079888, 760),
        district("CA-47", "Costa Mesa", null, 10, 312550571, 410),
        district("VA-03", "Newport News", null, 10, 168834655, 320),
      ],
      freshness: [
        {
          source: "directory",
          label: "Client facilities and geocoding",
          lastSyncedAt: "2026-10-22T04:16:30.087Z",
          neverSynced: false,
        },
        {
          source: "acs",
          label: "District demographics (ACS 5-year)",
          lastSyncedAt: null,
          neverSynced: false,
          freshnessUnavailable: true,
        },
      ],
      warnings: [
        {
          code: "UNMAPPED_FUNDING",
          message:
            "Some funding could not be attributed to a district — see the unmapped totals.",
        },
      ],
      generatedAt: "2026-10-26T12:00:00Z",
    },
  });
  await page.goto("/modules/intelligence?view=district-nexus");
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: "test-results/district-nexus-1440.png",
    fullPage: true,
  });
});
