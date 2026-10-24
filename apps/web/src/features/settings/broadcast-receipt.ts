/** A dismissed view, an empty pending read or a generic 2xx is not an acknowledgment receipt. */
export function requireBroadcastAcknowledgment(id: string, result: unknown) {
  if (!result || typeof result !== "object")
    throw new Error(
      "Acknowledgment was not confirmed. Refresh updates before trying again.",
    );
  const receipt = result as Record<string, unknown>;
  if (
    receipt.ok !== true ||
    receipt.broadcastId !== id ||
    typeof receipt.acknowledgedAt !== "string" ||
    !Number.isFinite(Date.parse(receipt.acknowledgedAt))
  )
    throw new Error(
      "Acknowledgment was not confirmed. Refresh updates before trying again.",
    );
}
