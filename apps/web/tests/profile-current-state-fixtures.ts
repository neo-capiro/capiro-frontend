import { client, clientId } from "./browser/fixtures";

export const profileClientId = clientId;
export const otherProfileClientId = "10000000-0000-4000-8000-000000000002";
export const profileIdentity = {
  user: { id: "profile-admin", email: "admin@example.test" },
  tenant: { id: "profile-tenant", name: "Synthetic profile tenant" },
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
    id: "member-owner",
    email: "owner@example.test",
    firstName: "Olivia",
    lastName: "Owner",
  },
  {
    id: "member-team",
    email: "team@example.test",
    firstName: "Terry",
    lastName: "Team",
  },
  {
    id: "member-new",
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
  addedAt: index === 0 ? null : "2026-10-01T12:00:00Z",
}));
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
