import { CapiroApiError, type CapiroApi } from "./http";
import type { SetupTaskKey, SetupTransitionStatus } from "./onboard-contracts";
import type { capiroOperations } from "./registry";

/** Current membership/admin authority stays in the existing setup service. */
export function createOnboardSetupApi(api: CapiroApi<typeof capiroOperations>) {
  return {
    getState: () => api.request("onboard.setup.state", {}),
    async transitionTask(
      task: SetupTaskKey,
      from: SetupTransitionStatus,
      to: SetupTransitionStatus,
    ) {
      const receipt = await api.request("onboard.setup.transition", {
        params: { task },
        body: { from, to },
      });
      if (receipt.task !== task || receipt.status !== to)
        throw new CapiroApiError(
          502,
          "The setup response does not match this task transition.",
        );
      return receipt;
    },
    createItInvite: (email: string) =>
      api.request("onboard.setup.itInvite", { body: { email } }),
    resendItInvite: (inviteId: string) =>
      api.request("onboard.setup.itResend", { params: { inviteId } }),
    async completeSetup() {
      const receipt = await api.request("onboard.setup.complete", {});
      // Legacy tenants can validly be complete with none/skipped task states.
      if (!receipt.complete)
        throw new CapiroApiError(
          502,
          "The setup service did not confirm completion.",
        );
      return receipt;
    },
  };
}
