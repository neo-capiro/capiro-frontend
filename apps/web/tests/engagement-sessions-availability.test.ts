import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_API_BASE_URL_VARIABLE,
  ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE,
  resolveEngagementSessionsAvailability,
} from "../src/shared/capiro/engagement-sessions-availability";
import { publicCapiroConfig, readCapiroConfig } from "../src/shared/capiro/config";
import { campaignSessionsQueryEnabled } from "../src/features/modules/engagement/outreach/outreach-list-model";

/**
 * The cohort availability contract for the ancillary campaign-session read.
 *
 * These assertions bind the three documented states, the fail-closed configuration rules and the
 * single query-admission rule the Outreach list uses, so a disabled cohort cannot dispatch the
 * request through any render, search, pagination or retry path.
 */
const ENGAGEMENT_URL = "https://engagement.example.test/api";

const resolve = (
  availability: string | undefined,
  engagementUrl?: string,
) => {
  const issues: string[] = [];
  const state = resolveEngagementSessionsAvailability(
    { [ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE]: availability },
    engagementUrl,
    issues,
  );
  return { state, issues };
};

describe("engagement sessions availability contract", () => {
  it("is unknown when the cohort states nothing", () => {
    expect(resolve(undefined)).toEqual({ state: "unknown", issues: [] });
    expect(resolve("   ")).toEqual({ state: "unknown", issues: [] });
  });

  it("is disabled when the cohort explicitly disables the surface", () => {
    expect(resolve("disabled")).toEqual({ state: "disabled", issues: [] });
    expect(resolve("DISABLED")).toEqual({ state: "disabled", issues: [] });
  });

  it("is enabled only when enabled is stated AND the engagement service is configured", () => {
    expect(resolve("enabled", ENGAGEMENT_URL)).toEqual({
      state: "enabled",
      issues: [],
    });
  });

  it("fails closed to disabled when enabled is stated without the engagement service", () => {
    const result = resolve("enabled", undefined);
    expect(result.state).toBe("disabled");
    expect(result.issues.join(" ")).toContain(ENGAGEMENT_API_BASE_URL_VARIABLE);
  });

  it("fails closed to disabled for a value that is neither enabled nor disabled", () => {
    for (const value of ["maybe", "true", "0", "on"]) {
      const result = resolve(value);
      expect(result.state).toBe("disabled");
      expect(result.issues.length).toBe(1);
    }
  });

  it("reads the switch through the existing server configuration path", () => {
    const disabled = readCapiroConfig({
      [ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE]: "disabled",
    });
    expect(disabled.engagementSessions).toBe("disabled");
    expect(
      disabled.issues.filter((issue) =>
        issue.includes(ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE),
      ),
    ).toEqual([]);

    const enabled = readCapiroConfig({
      [ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE]: "enabled",
      [ENGAGEMENT_API_BASE_URL_VARIABLE]: ENGAGEMENT_URL + "/",
    });
    expect(enabled.engagementSessions).toBe("enabled");
    expect(enabled.services.engagement).toBe(ENGAGEMENT_URL);

    const enabledWithoutService = readCapiroConfig({
      [ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE]: "enabled",
    });
    expect(enabledWithoutService.engagementSessions).toBe("disabled");
    expect(enabledWithoutService.services.engagement).toBeUndefined();
  });

  it("publishes only the resolved capability, never service URLs", () => {
    const publicConfig = publicCapiroConfig(
      readCapiroConfig({
        [ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE]: "enabled",
        [ENGAGEMENT_API_BASE_URL_VARIABLE]: ENGAGEMENT_URL,
        CORE_API_BASE_URL: "https://core.example.test/api",
      }),
    );
    expect(publicConfig.capabilities).toEqual({ campaignSessions: "enabled" });
    expect(JSON.stringify(publicConfig)).not.toContain("engagement.example.test");
  });
});

describe("campaign session query admission", () => {
  const base = { clientId: "", deleted: false, invalid: false };

  it.each(["enabled", "unknown"] as const)(
    "admits the request when the cohort is %s",
    (capability) => {
      expect(campaignSessionsQueryEnabled({ ...base, capability })).toBe(true);
    },
  );

  it("never admits the request when the cohort explicitly disables it", () => {
    expect(campaignSessionsQueryEnabled({ ...base, capability: "disabled" })).toBe(
      false,
    );
    // Neither a search term nor pagination is an input to the rule, so neither can re-enable it.
    expect(
      campaignSessionsQueryEnabled({
        ...base,
        capability: "disabled",
        clientId: "",
        deleted: false,
        invalid: false,
      }),
    ).toBe(false);
  });

  it.each([
    ["a selected client", { clientId: "cl-1" }],
    ["the deleted-only view", { deleted: true }],
    ["an invalid date range", { invalid: true }],
  ])("keeps the existing gate for %s", (_label, override) => {
    expect(
      campaignSessionsQueryEnabled({
        ...base,
        capability: "enabled",
        ...override,
      }),
    ).toBe(false);
  });
});
