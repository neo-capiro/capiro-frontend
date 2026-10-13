import { profileActorKey, type ProfileActor } from "./profile-access";
export const profileKey = (clientId: string, section: string) =>
  ["client-profile", clientId, section] as const;
export const profileReadKey = (
  clientId: string,
  section: string,
  actor?: ProfileActor,
) => [...profileKey(clientId, section), profileActorKey(actor)] as const;
