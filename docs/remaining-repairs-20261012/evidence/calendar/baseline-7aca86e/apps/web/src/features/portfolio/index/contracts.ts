import { safeWebsite } from "@/shared/portfolio/domain/website";
import { z } from "zod";
import { sectorLabel } from "@/shared/portfolio/domain/sector";
import { type Client } from "@/shared/session/client-contract";
export { clientSchema, type Client } from "@/shared/session/client-contract";
export function clientSectors(client: Client): string[] {
  const stored = client.intakeData?.sectors;
  const sectors = Array.isArray(stored)
    ? stored
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const fallback = client.sectorTag?.trim();
  return [...new Set(sectors.length ? sectors : fallback ? [fallback] : [])];
}
export function clientSectorLabel(client: Client): string | null {
  const primary = clientSectors(client)[0];
  return primary ? sectorLabel(primary) : null;
}
export function clientLocation(client: Client): string | null {
  const city = client.intakeData?.city;
  const state = client.intakeData?.state;
  const parts = [city, state]
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
export const memberSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});
export type Member = z.infer<typeof memberSchema>;
export const ownerSchema = z.object({
  accountOwnerUserId: z.string().nullable(),
  accountOwner: memberSchema.nullable(),
});
export const ownersSchema = z.record(z.string(), ownerSchema);
export const memberName = (member: Member | undefined | null) =>
  member
    ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
      member.email
    : "Unassigned";
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
export { safeWebsite } from "@/shared/portfolio/domain/website";
export const createProfileSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required.").max(200),
  website: z
    .string()
    .trim()
    .refine(
      (value) => !value || Boolean(safeWebsite(value)),
      "Enter a valid website.",
    ),
  description: z.string().trim(),
  sectorTag: z.string().trim(),
  primaryContactName: z.string().trim(),
  primaryContactEmail: z.union([z.email(), z.literal("")]),
  primaryContactPhone: z.string().trim(),
  profileType: z.literal("CLIENT"),
});
export type CreateProfile = z.infer<typeof createProfileSchema>;
