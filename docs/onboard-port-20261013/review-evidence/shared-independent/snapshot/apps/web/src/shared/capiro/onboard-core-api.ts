import { z } from "zod";
import type { OperationRequest } from "./contracts";
import { CapiroApiError, type CapiroApi } from "./http";
import type { capiroOperations } from "./registry";

type Registry = typeof capiroOperations;
type Body<Key extends keyof Registry> =
  OperationRequest<Registry[Key]> extends { body: infer T } ? T : never;
type MemoryType = OperationRequest<
  Registry["onboard.core.memoryRead"]
>["params"]["type"];
const nativeClientId = z.uuid();

/** Onboard-specific receipt bindings; existing me/client/invitation owners survive. */
export function createOnboardCoreApi(api: CapiroApi<Registry>) {
  return {
    me: () => api.request("me.read", {}),
    searchLdaRegistrants: (q: string) =>
      api.request("onboard.core.registrants", { query: { q } }),
    getRegistrant: () => api.request("onboard.core.registrant", {}),
    async setRegistrant(registrantId: number) {
      const result = await api.request("onboard.core.setRegistrant", {
        body: { registrantId },
      });
      if (result.ldaRegistrantId !== registrantId)
        throw new CapiroApiError(
          502,
          "The firm response does not match the selected registrant.",
        );
      return result;
    },
    getImportCandidates: () => api.request("onboard.core.importCandidates", {}),
    async createClient(body: Body<"settings.profiles.create">) {
      const submitted = { ...body };
      const result = await api.request("settings.profiles.create", {
        body: submitted,
      });
      // Native Core creates a UUID and stores the submitted name unchanged.
      // This receipt binds observation, never backend tenant authorization.
      if (
        !nativeClientId.safeParse(result.id).success ||
        result.name !== submitted.name
      )
        throw new CapiroApiError(
          502,
          "The creation response does not match the submitted client.",
        );
      return result;
    },
    async importClientChunk(ldaClientIds: number[]) {
      const submitted = [...ldaClientIds];
      const expected = new Set(submitted);
      const result = await api.request("onboard.core.import", {
        body: { ldaClientIds: submitted },
      });
      const outcomes = [...result.items, ...result.skipped].map(
        (item) => item.ldaClientId,
      );
      if (
        result.created !== result.items.length ||
        outcomes.length !== expected.size ||
        new Set(outcomes).size !== outcomes.length ||
        outcomes.some((id) => !expected.has(id))
      )
        throw new CapiroApiError(
          502,
          "The import response does not account for the submitted client selection.",
        );
      return result;
    },
    getMemoryCatalog: () => api.request("onboard.core.memoryCatalog", {}),
    async getFirmMemorySections(type: MemoryType) {
      const result = await api.request("onboard.core.memoryRead", {
        params: { type },
      });
      if (
        result.type !== type ||
        result.slug !== "firm" ||
        result.clientId !== null
      )
        throw new CapiroApiError(
          502,
          "The memory response does not match the requested firm file.",
        );
      return result;
    },
    putFirmMemorySections: (
      type: MemoryType,
      sections: Body<"onboard.core.memoryWrite">["sections"],
    ) =>
      api.request("onboard.core.memoryWrite", {
        params: { type },
        body: { sections },
      }),
    async inviteTeamMember(
      body: Omit<Body<"settings.team.invite">, "redirectUrl">,
    ) {
      const submitted = {
        email: body.email,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
      };
      const receipt = await api.request("settings.team.invite", {
        body: submitted,
      });
      if (
        receipt.invitation.email.toLowerCase() !==
          submitted.email.toLowerCase() ||
        receipt.invitation.role !== submitted.role
      )
        throw new CapiroApiError(
          502,
          "The invitation response does not match the intended recipient and role.",
        );
      return receipt;
    },
  };
}
