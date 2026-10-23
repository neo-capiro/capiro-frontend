import { z } from "zod";
import { broadcastAcknowledgementSchema } from "../capiro/operations/settings-schemas";

const pendingSchema = z
  .object({ version: z.literal(1), broadcastId: z.uuid() })
  .strict();
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readBroadcastAttempt(storage: StoragePort, key: string) {
  const value = storage.getItem(key);
  return value === null ? undefined : pendingSchema.parse(JSON.parse(value));
}
export function retainBroadcastAttempt(
  storage: StoragePort,
  key: string,
  broadcastId: string,
) {
  storage.setItem(
    key,
    JSON.stringify(pendingSchema.parse({ version: 1, broadcastId })),
  );
}
export function clearBroadcastAttempt(
  storage: StoragePort,
  key: string,
  broadcastId: string,
) {
  if (readBroadcastAttempt(storage, key)?.broadcastId === broadcastId)
    storage.removeItem(key);
}
export function requireBroadcastReceipt(broadcastId: string, value: unknown) {
  const receipt = broadcastAcknowledgementSchema.parse(value);
  if (receipt.broadcastId !== broadcastId)
    throw new Error("The response did not confirm this notice.");
  return receipt;
}
