import { clientReadKey } from "../clients/public";
import { profileActorKey, type ProfileActor } from "./profile-access";
export const profileKey = (clientId: string, section: string) =>
  ["client-profile", clientId, section] as const;
export const profileReadKey = (
  clientId: string,
  section: string,
  actor?: ProfileActor,
) =>
  section === "saved-client"
    ? // The client-detail section resolves the ONE shared read key, so a caller reading
      // this section shares the entry with the catalogue hook.
      clientReadKey(clientId, actor as Parameters<typeof clientReadKey>[1])
    : [...profileKey(clientId, section), profileActorKey(actor)];
