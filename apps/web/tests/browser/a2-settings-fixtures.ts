import { expect, type Page, type Route } from "@playwright/test";
import type { CapiroMe } from "@/shared/capiro/operations/settings-schemas";

export const identity: CapiroMe = {
  user: {
    id: "00000071-1111-4111-8111-111111111111",
    clerkUserId: "test-user",
    email: "actor@example.test",
    firstName: "Synthetic",
    lastName: "Actor",
    title: "Original",
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: false,
    legiwatchIntroSeen: false,
  },
  tenant: { id: "synthetic-tenant", slug: "synthetic", name: "Synthetic" },
  role: "user_admin",
  billingAdmin: true,
  entitlements: {
    memoryGovernance: false,
    peWatch: false,
    defenseBudgetIntel: false,
    complianceModule: false,
    dataExport: false,
    customConnectors: false,
  },
  features: {},
};
export const member = {
  membershipId: "synthetic-member",
  userId: "00000072-1111-4111-8111-111111111111",
  email: "target@example.test",
  firstName: "Synthetic",
  lastName: "Target",
  role: "user_admin",
  status: "active",
  billingAdmin: false,
  joinedAt: null,
  lastSeenAt: null,
};
export const invitation = {
  id: "synthetic-invitation",
  email: "invite@example.test",
  role: "standard_user",
  createdAt: "2026-10-23T00:00:00.000Z",
  expiresAt: null,
};
export const billingState = {
  billingEnabled: true,
  status: "active",
  slots: 14,
  usedSlots: 12,
  trialEndsAt: null,
  onboardingFlowVersion: 2,
  locked: false,
};
export const billingSummary = {
  billingEnabled: true,
  status: "active",
  slots: 14,
  usedSlots: 12,
  pricePerSlotUsd: 217,
  llmAllowanceUsd: 11.25,
  llmUsedUsd: 9.34,
  llmOverageUsd: 1.19,
  llmWarn: false,
  llmHardCapUsd: null,
  currentPeriodEnd: null,
  hasSubscription: true,
};

export async function settingsFixture(page: Page) {
  const data = {
    identity: structuredClone(identity),
    members: [structuredClone(member)],
    invitations: [structuredClone(invitation)],
    state: structuredClone(billingState),
    summary: structuredClone(billingSummary),
    branding: {
      id: "synthetic-tenant",
      slug: "synthetic",
      name: "Synthetic organization",
      logoS3Key: null as string | null,
      logoContentType: null as string | null,
      logoUploadedAt: null as string | null,
      logoUrl: null as string | null,
    },
    signature: {
      html: "<p>Original signature</p>" as string | null,
      enabled: false,
    },
    contact: {
      name: "Synthetic organization",
      email: "office@example.test",
      phone: "5550100",
      mailingStreet1: "1 Synthetic Street",
      mailingStreet2: "",
      mailingCity: "Test City",
      mailingStateZip: "DC 00000",
      permanentStreet1: "2 Synthetic Street",
      permanentStreet2: "",
      permanentCity: "Test City",
      permanentStateZip: "DC 00000",
    },
  };
  const requests: { operation: string; method: string; input: unknown }[] = [];
  const unexpected: string[] = [];
  const handlers = new Map<string, (route: Route) => Promise<void>>();
  await page.route("http://127.0.0.1:5191/api/**", async (route) => {
    const request = route.request();
    const operation = new URL(request.url()).pathname.replace(
      "/api/capiro/",
      "",
    );
    requests.push({
      operation,
      method: request.method(),
      input: request.method() === "GET" ? undefined : request.postDataJSON(),
    });
    const handler = handlers.get(operation);
    if (handler) {
      await handler(route);
      return;
    }
    const reads: Record<string, unknown> = {
      "me.read": data.identity,
      "me.emailSignature.read": data.signature,
      "settings.contact.read": data.contact,
      "settings.branding.read": data.branding,
      "settings.team.list": data.members,
      "settings.team.invitations": data.invitations,
      "settings.billing.state": data.state,
      "settings.billing.summary": data.summary,
    };
    if (request.method() === "GET" && Object.hasOwn(reads, operation)) {
      await route.fulfill({ json: reads[operation] });
      return;
    }
    unexpected.push(`${request.method()} ${operation}`);
    await route.fulfill({
      status: 503,
      json: { message: "Unexpected synthetic request" },
    });
  });
  const writes = () => requests.filter((entry) => entry.method !== "GET");
  const open = async (section = "team") => {
    await page.goto(`/a2-settings.html?section=${section}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      (
        {
          team: "Team",
          billing: "Billing",
          personal: "Personal",
          branding: "Branding",
          "contact-info": "Contact info",
          "hq-ai-keys": "Tenants",
        } as Record<string, string>
      )[section] ?? "Settings",
    );
  };
  return { data, handlers, requests, writes, unexpected, open };
}
