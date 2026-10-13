import type { OperationRequest } from "./contracts";
import { CapiroApiError, type CapiroApi } from "./http";
import type { capiroOperations } from "./registry";

type Registry = typeof capiroOperations;
type Body<Key extends keyof Registry> =
  OperationRequest<Registry[Key]> extends { body: infer T } ? T : never;

/** Purchaser workflow over fixed operations; no implicit writes or retries. */
export function createOnboardFunnelApi(api: CapiroApi<Registry>) {
  return {
    register: (body: Body<"onboard.funnel.register">) =>
      api.request("onboard.funnel.register", { body }),
    getSession: () => api.request("onboard.funnel.session", {}),
    verifyCheck: () => api.request("onboard.funnel.verify", {}),
    setPlan: (plan: Body<"onboard.funnel.plan">["plan"]) =>
      api.request("onboard.funnel.plan", { body: { plan } }),
    getLegal: () => api.request("onboard.funnel.legal", {}),
    acceptLegal: (body: Body<"onboard.funnel.legalAccept">) =>
      api.request("onboard.funnel.legalAccept", { body }),
    downloadSigned: (docType: "tos" | "sa") =>
      api.download(
        docType === "tos"
          ? "onboard.funnel.signedTos"
          : "onboard.funnel.signedSa",
        {},
      ),
    createSetupIntent: (method: "card" | "ach") =>
      api.request("onboard.funnel.setupIntent", { body: { method } }),
    async trialComplete(body: Body<"onboard.funnel.trialComplete">) {
      const method = body.method;
      const receipt = await api.request("onboard.funnel.trialComplete", {
        body,
      });
      if (receipt.method !== method)
        throw new CapiroApiError(
          502,
          "The payment-method response does not match this request.",
        );
      return receipt;
    },
    subscribe: (body: Body<"onboard.funnel.subscribe">) =>
      api.request("onboard.funnel.subscribe", { body }),
    paidStatus: () => api.request("onboard.funnel.paidStatus", {}),
    setRoles: (body: Body<"onboard.funnel.roles">) =>
      api.request("onboard.funnel.roles", { body }),
    setImportPref: (
      importMode: Body<"onboard.funnel.importPref">["importMode"],
    ) => api.request("onboard.funnel.importPref", { body: { importMode } }),
    setOrg: (body: Body<"onboard.funnel.org">) =>
      api.request("onboard.funnel.org", { body }),
    provision: () => api.request("onboard.funnel.provision", {}),
    getStatus: () => api.request("onboard.funnel.status", {}),
  };
}
