import { client, clientId } from "./browser/fixtures";

export const profileClientId = clientId;
export const otherProfileClientId = "10000000-0000-4000-8000-000000000002";
export const profileIdentity = {
  user: {
    id: "81000000-0000-4000-8000-000000000004",
    email: "admin@example.test",
  },
  tenant: {
    id: "81000000-0000-4000-8000-000000000005",
    name: "Synthetic profile tenant",
  },
  role: "user_admin",
};
export const profileClient = {
  ...client,
  tenantId: profileIdentity.tenant.id,
  intakeData: {
    profileNotes: "Saved profile notes",
    retained: "Sibling field",
  },
};
export const profileMembers = [
  {
    id: "81000000-0000-4000-8000-000000000001",
    email: "owner@example.test",
    firstName: "Olivia",
    lastName: "Owner",
  },
  {
    id: "81000000-0000-4000-8000-000000000002",
    email: "team@example.test",
    firstName: "Terry",
    lastName: "Team",
  },
  {
    id: "81000000-0000-4000-8000-000000000003",
    email: "new@example.test",
    firstName: "Nora",
    lastName: "New",
  },
];
export const profileTeam = profileMembers.slice(0, 2).map((member, index) => ({
  ...member,
  id: index === 0 ? null : "membership-team",
  userId: member.id,
  role: index === 0 ? null : "Analyst",
  isOwner: index === 0,
  ownerRank: index === 0 ? 1 : null,
  ownerAvailable: index === 0 ? true : null,
  addedAt: index === 0 ? null : "2026-10-01T12:00:00Z",
}));
export const profileOwners = {
  tenantId: profileIdentity.tenant.id,
  clientId: profileClientId,
  version: 3,
  owners: [
    {
      userId: profileMembers[0]!.id,
      rank: 1,
      label: "Primary" as const,
      available: true,
      person: profileMembers[0]!,
    },
  ],
};
export const profileFacility = {
  id: "facility-profile",
  clientId,
  tenantId: profileIdentity.tenant.id,
  name: "Synthetic profile lab",
  addressLine: null,
  city: "Austin",
  state: "TX",
  zip: null,
  congressionalDistrict: null,
  employeeCount: 12,
  notes: "Saved facility notes",
  stateHouseDistrict: null,
  stateSenateDistrict: null,
  geocodeStatus: "unresolved",
};
