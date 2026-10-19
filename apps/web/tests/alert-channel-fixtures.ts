import {
  trackerActor,
  trackerClientId,
  trackerIdentity,
  trackerPreferences,
} from "./tracker-preference-fixtures";
import type { PreferenceActor } from "../src/features/portfolio/bill-tracker/alert-preferences/personal-access";
import type { CorePreferences } from "../src/features/portfolio/bill-tracker/alert-preferences/core-contracts";
export const alertClient = {
  id: trackerClientId,
  name: "Synthetic Tracker client",
  tenantId: trackerActor.tenantId,
  profileType: "CLIENT",
  profileStatus: "ACTIVE",
  status: "ACTIVE",
  sectorTag: "Aerospace",
  description: null,
  website: null,
  intakeData: {},
  setAsideCertifications: [],
};
export const corePreferenceOwner: PreferenceActor = {
  backend: "core",
  actor: {
    userId: trackerActor.userId,
    tenantId: trackerActor.tenantId,
    role: "standard_user",
  },
};
export const intelPreferenceOwner: PreferenceActor = {
  backend: "intelligence",
  actor: {
    ...corePreferenceOwner.actor,
    clerkUserId: trackerActor.clerkUserId,
  },
};
export const corePreferences: CorePreferences = {
  triggers: [...trackerPreferences.triggers, "core_native_extra"],
  materiality: "medium",
  emailEnabled: true,
  emailAddress: "core@example.test",
  emailCadence: "daily",
  smsEnabled: false,
  smsPhone: "+12025550123",
  smsPhoneVerified: false,
  smsCadence: "realtime",
  quietHoursStart: "22:00",
  quietHoursEnd: "7:00",
};
export const intelPreferences = {
  ...trackerPreferences,
  smsPhoneVerified: false,
};
export { trackerActor, trackerClientId, trackerIdentity };
