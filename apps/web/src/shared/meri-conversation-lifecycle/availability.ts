/** Source reception is separate from activation. Fable qualifies the runtime and recovery gates. */
export const lifecycleAvailability = Object.freeze({
  enabled: false,
  wireContractVersion: "0.1.0",
  reason:
    "Pause and checkpoint recovery are not available for this conversation yet.",
  releaseHold:
    "Runtime continuation composition and durable receipt-status recovery require qualification before lifecycle controls activate.",
});
