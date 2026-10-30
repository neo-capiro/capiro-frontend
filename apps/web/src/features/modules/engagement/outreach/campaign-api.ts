import type { CapiroApi } from "../../../../shared/capiro/http";
import type { capiroOperations } from "../../../../shared/capiro/registry";
import type {
  OutreachCampaignState,
  OutreachCampaign,
  OutreachDraftArtifact,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { sameId, sameCampaignContent } from "./campaign-model";
const mismatch = () =>
  new Error(
    "The response does not match this campaign. Refresh before continuing.",
  );
export function createCampaignApi(api: CapiroApi<typeof capiroOperations>) {
  const drafts = async (
    id: string,
    signal: AbortSignal,
  ): Promise<OutreachDraftArtifact[]> => {
    const rows = await api.request(
      "engagement.campaign.drafts",
      { params: { id } },
      { signal },
    );
    if (
      rows.some(
        (row) =>
          !sameId(row.outreachRecordId, id) ||
          (row.current &&
            (!sameId(row.current.artifactId, row.id) ||
              !sameId(row.current.outreachRecordId, id) ||
              row.current.generationKey !== row.generationKey)),
      )
    )
      throw mismatch();
    return rows;
  };
  return {
    async read(id: string, signal: AbortSignal) {
      const value = await api.request(
        "engagement.campaign",
        { params: { id } },
        { signal },
      );
      if (!sameId(value.id, id)) throw mismatch();
      return value;
    },
    async recover(requestKey: string, signal: AbortSignal) {
      const rows = await api.request(
        "engagement.campaign.request",
        { query: { requestKey } },
        { signal },
      );
      return rows[0] ?? null;
    },
    async save(
      saved: OutreachCampaign | null,
      state: OutreachCampaignState,
      requestKey: string,
      signal: AbortSignal,
    ) {
      const value = saved
        ? await api.request(
            "engagement.campaign.save",
            {
              params: { id: saved.id },
              body: { expectedRevision: saved.revision, state },
            },
            { signal },
          )
        : await api.request(
            "engagement.campaign.create",
            { body: { requestKey, state } },
            { signal },
          );
      if (
        saved &&
        (!sameId(value.id, saved.id) || value.revision <= saved.revision)
      )
        throw mismatch();
      if (
        !sameCampaignContent(value.state, state) ||
        value.state.lastStep !== state.lastStep
      )
        throw new Error(
          "The saved campaign differs from your changes. Check the saved draft.",
        );
      return value;
    },
    drafts,
    async job(campaignId: string, jobId: string, signal: AbortSignal) {
      const value = await api.request(
        "engagement.campaign.job",
        { params: { id: jobId } },
        { signal },
      );
      if (
        !sameId(value.job.id, jobId) ||
        !value.job.outreachRecordId ||
        !sameId(value.job.outreachRecordId, campaignId)
      )
        throw mismatch();
      return value;
    },
    async edit(
      campaignId: string,
      artifact: OutreachDraftArtifact,
      subject: string,
      body: string,
      signal: AbortSignal,
    ) {
      if (!artifact.current) throw mismatch();
      const value = await api.request(
        "engagement.campaign.editDraft",
        {
          params: { id: artifact.id },
          body: {
            baseVersionId: artifact.current.id,
            subject,
            body,
            editKind: "manual",
          },
        },
        { signal },
      );
      if (
        !sameId(value.outreachRecordId, campaignId) ||
        !sameId(value.artifactId, artifact.id) ||
        value.subject !== subject ||
        value.body !== body
      )
        throw mismatch();
      return drafts(campaignId, signal);
    },
    async sendRequest(id: string, requestKey: string, signal: AbortSignal) {
      const value = await api.request(
        "engagement.campaign.sendRequest",
        { params: { id }, query: { requestKey } },
        { signal },
      );
      if (
        value &&
        (!sameId(value.outreachRecordId, id) || value.requestKey !== requestKey)
      )
        throw mismatch();
      return value;
    },
    async sendStatus(
      campaignId: string,
      intentId: string,
      requestKey: string,
      signal: AbortSignal,
    ) {
      const value = await api.request(
        "engagement.campaign.sendStatus",
        { params: { id: intentId } },
        { signal },
      );
      if (
        !sameId(value.id, intentId) ||
        !sameId(value.outreachRecordId, campaignId) ||
        value.requestKey !== requestKey
      )
        throw mismatch();
      return value;
    },
  };
}
