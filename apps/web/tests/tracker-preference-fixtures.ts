import type { AlertPreferences } from "../src/features/portfolio/bill-tracker/alert-preferences/contracts";

// Deliberately distinct native database and Clerk identities, never a live account.
export const trackerClientId = "10000000-0000-4000-8000-000000000001";
export const trackerActor = {
  userId: "80000000-0000-4000-8000-000000000001",
  clerkUserId: "user_synthetic_tracker",
  tenantId: "90000000-0000-4000-8000-000000000001",
};
export const trackerIdentity = {
  user: {
    id: trackerActor.userId,
    clerkUserId: trackerActor.clerkUserId,
    email: "analyst@example.test",
  },
  tenant: { id: trackerActor.tenantId, name: "Synthetic tracker workspace" },
  role: "standard_user",
};
export const trackerPreferences: AlertPreferences = {
  clientId: trackerClientId,
  userId: trackerActor.clerkUserId,
  tenantId: trackerActor.tenantId,
  triggers: [
    "newMatch",
    "amendment",
    "hearing",
    "committeeVote",
    "floorVote",
    "enactedFailed",
    "fiscalNote",
    "sponsorMomentum",
    "companion",
    "deadline",
  ],
  materiality: "medium",
  emailEnabled: true,
  emailAddress: "analyst@example.test",
  emailCadence: "daily",
  smsEnabled: false,
  smsPhone: "+12025550123",
  smsPhoneVerified: true,
  smsCadence: "realtime",
  quietHoursStart: "22:00",
  quietHoursEnd: "7:00",
  jurisdictions: ["US", "VA"],
};
