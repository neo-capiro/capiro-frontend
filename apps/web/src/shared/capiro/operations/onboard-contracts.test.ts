import { describe, expect, it } from "vitest";
import {
  funnelSessionSchema,
  orgProfileSchema,
} from "./onboard-funnel-schemas";
import { onboardFunnelOperations } from "./onboard-funnel";
import { onboardSetupOperations } from "./onboard-setup";
import { publicOnboardOperations } from "./onboard-public";

const session = {
  sessionId: "session-1",
  state: "registered",
  plan: null,
  payMethod: null,
  profiles: null,
  roleMode: null,
  roleDesignations: [],
  importMode: null,
  itAdminEmails: [],
  orgProfile: {},
  slugFinal: null,
  tenantId: null,
  failureReason: null,
  email: "person@example.test",
  firstName: null,
  lastName: null,
  orgName: null,
  stripe: {},
};

describe("native Onboard receiving contracts", () => {
  it("accepts a newly registered purchaser before organization or Stripe setup", () => {
    expect(funnelSessionSchema.parse(session)).toEqual(session);
  });
  it.each(["a", ""])(
    "accepts native trimmed organization name %j in a stored session",
    (legalName) => {
      expect(
        funnelSessionSchema.parse({ ...session, orgProfile: { legalName } })
          .orgProfile,
      ).toEqual({ legalName });
      expect(orgProfileSchema.safeParse({ legalName }).success).toBe(false);
    },
  );
  it("strips retained JSON fields without permitting them in the organization edit DTO", () => {
    expect(
      funnelSessionSchema.parse({
        ...session,
        orgProfile: { legalName: "Firm", retained: true },
      }).orgProfile,
    ).toEqual({ legalName: "Firm" });
    expect(
      orgProfileSchema.safeParse({ legalName: "Firm", retained: true }).success,
    ).toBe(false);
  });
  it("requires native availability metadata instead of enabling an omitted provider", () => {
    expect(
      publicOnboardOperations["public-onboard.invite"].response.safeParse({
        orgName: "Firm",
        email: "it@example.test",
        status: "pending",
        provider: null,
        googleClientId: null,
      }).success,
    ).toBe(false);
  });
  it("accepts optional provisioning failure reason but requires it for current status", () => {
    const receipt = {
      state: "provisioned",
      tenantId: "tenant-1",
      slug: "firm",
    };
    expect(
      onboardFunnelOperations["onboard.funnel.provision"].response.safeParse(
        receipt,
      ).success,
    ).toBe(true);
    expect(
      onboardFunnelOperations["onboard.funnel.status"].response.safeParse(
        receipt,
      ).success,
    ).toBe(false);
  });
  it("retains nullable payment secrets and invoice URLs", () => {
    expect(
      onboardFunnelOperations["onboard.funnel.setupIntent"].response.parse({
        clientSecret: null,
      }),
    ).toEqual({ clientSecret: null });
    expect(
      onboardFunnelOperations["onboard.funnel.subscribe"].response.parse({
        subscriptionId: "sub-1",
        status: "incomplete",
        clientSecret: null,
        hostedInvoiceUrl: null,
      }).hostedInvoiceUrl,
    ).toBeNull();
  });
  it("does not permit skipped as a setup transition request", () => {
    const operation = onboardSetupOperations["onboard.setup.transition"];
    expect(
      operation.request.safeParse({
        params: { task: "it_email" },
        body: { from: "skipped", to: "done" },
      }).success,
    ).toBe(false);
    expect(
      operation.request.safeParse({
        params: { task: "it_email" },
        body: { from: "waiting", to: "done" },
      }).success,
    ).toBe(true);
  });
  it.each([
    "https://evil.test/o/oauth2/v2/auth",
    "https://accounts.google.com/other",
    "https://user@accounts.google.com/o/oauth2/v2/auth",
  ])("rejects unrelated IT consent destination %s", (url) => {
    expect(
      publicOnboardOperations["public-onboard.consent"].response.safeParse({
        url,
      }).success,
    ).toBe(false);
  });
  it("keeps default-session operands confined to purchaser and setup contracts", () => {
    for (const operation of [
      ...Object.values(onboardFunnelOperations),
      ...Object.values(onboardSetupOperations),
    ]) {
      expect(operation.authentication).toBe("clerk-session");
      expect(operation.service).toBe("onboard");
    }
  });
});
