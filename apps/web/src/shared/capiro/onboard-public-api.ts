import { CapiroApiError, type CapiroApi } from "./http";
import { validateOnboardConsentUrl } from "./onboard-navigation";
import type { publicOnboardOperations } from "./operations/onboard-public";

/** Revocable IT capability flow. No Clerk session or user-expiry callback. */
export function createOnboardPublicApi(
  api: CapiroApi<typeof publicOnboardOperations>,
  apiBaseUrl: string,
) {
  return {
    getInvite: (token: string) =>
      api.request("public-onboard.invite", { params: { token } }),
    async getConsentUrl(token: string, provider: "microsoft" | "google") {
      const result = await api.request("public-onboard.consent", {
        params: { token },
        body: { provider },
      });
      const url = validateOnboardConsentUrl(result.url, provider, apiBaseUrl);
      if (!url)
        throw new CapiroApiError(
          502,
          "The IT service returned an unexpected authorization destination.",
        );
      return { url };
    },
    skipGoogleVerification: (token: string) =>
      api.request("public-onboard.skipGoogle", { params: { token } }),
  };
}
