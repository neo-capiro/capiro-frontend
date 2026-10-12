import { z } from "zod";
import {
  clientSchema,
  memberSchema,
} from "@/features/portfolio/index/contracts-public";
import { facilitySchema, teamMemberSchema } from "./contracts";

// These optional fields are returned by native Client/ClientFacility records.
// Roster and owner DTOs do not return them; their context is the captured request.
export const profileClientSchema = (clientId: string, tenantId: string) =>
  clientSchema
    .extend({ tenantId: z.string().min(1).optional() })
    .refine(
      (client) =>
        client.id === clientId &&
        (!client.tenantId || client.tenantId === tenantId),
    );
export const profileNotesReceipt = (
  clientId: string,
  tenantId: string,
  notes: string,
) =>
  profileClientSchema(clientId, tenantId).refine(
    (client) => client.intakeData?.profileNotes === notes,
  );
export const profileMemberOptionsSchema = z
  .array(memberSchema)
  .refine(
    (members) =>
      members.every((member) => Boolean(member.id.trim())) &&
      new Set(members.map((member) => member.id)).size === members.length,
  );
export const profileTeamSchema = z
  .array(teamMemberSchema)
  .refine(
    (team) =>
      team.every((member) => Boolean(member.userId.trim())) &&
      new Set(team.map((member) => member.userId)).size === team.length &&
      team.filter((member) => member.isOwner).length <= 1,
  );
export type TeamChange =
  | { kind: "add"; userId: string; role: string }
  | { kind: "remove"; userId: string };
export function teamRosterReceipt(change: TeamChange) {
  return profileTeamSchema.refine((team) => {
    const member = team.find((row) => row.userId === change.userId);
    return change.kind === "remove"
      ? !member
      : Boolean(member && member.role === (change.role.trim() || null));
  });
}
export const profileFacilityReceipt = (
  clientId: string,
  tenantId: string,
  facilityId?: string,
) =>
  facilitySchema
    .extend({ tenantId: z.string().min(1).optional() })
    .refine(
      (facility) =>
        Boolean(facility.id.trim()) &&
        facility.clientId === clientId &&
        (!facility.tenantId || facility.tenantId === tenantId) &&
        (!facilityId || facility.id === facilityId),
    );
export const profileFacilityList = (clientId: string, tenantId: string) =>
  z
    .array(profileFacilityReceipt(clientId, tenantId))
    .refine(
      (facilities) =>
        new Set(facilities.map((facility) => facility.id)).size ===
        facilities.length,
    );
export const facilityRemovedReceipt = z.object({ deleted: z.literal(true) });
