import { describe, expect, it } from "vitest";
import {
  campaignUnits,
  savedEnvelope,
  sameEnvelope,
  sameCampaignContent,
  newCampaign,
  sendUnits,
  recoveredCampaignStep,
  canFinishTest,
} from "./campaign-model";
import { createCampaignApi } from "./campaign-api";
import { outreachCampaignOperations as operations } from "../../../../shared/capiro/operations/outreach-campaign";
import type { CapiroApi } from "../../../../shared/capiro/http";
import type { capiroOperations } from "../../../../shared/capiro/registry";
const id = "51000000-0000-4000-8000-000000000001",
  foreign = "51000000-0000-4000-8000-000000000002";
const state = () => ({
  ...newCampaign(),
  title: "Captured title",
  mainIdea: "Captured main idea",
});
const member = (id: string, role: "to" | "cc" | "bcc" = "to") => ({
  id,
  name: id,
  email: `${id}@example.test`,
  role,
});
function api(value: unknown) {
  return { request: async () => value } as unknown as CapiroApi<
    typeof capiroOperations
  >;
}
describe("canonical Outreach capture and exact-result receivers", () => {
  it("expands one per list To member and one shared group with exact historical copies", () => {
    const s = state();
    s.recipients = [
      { ...member("global", "cc"), kind: "individual" },
      {
        ...member("list"),
        kind: "list",
        cc: ["listcopy@example.test"],
        members: [
          { ...member("alice"), bcc: ["private@example.test"] },
          member("bob"),
          member("listcc", "cc"),
        ],
      },
      {
        ...member("group"),
        kind: "group",
        members: [member("carol"), member("dave"), member("groupbcc", "bcc")],
      },
    ];
    const units = campaignUnits(s);
    expect(units.map((u) => u.key)).toEqual([
      "list:list:alice",
      "list:list:bob",
      "group:group",
    ]);
    expect(units[0]?.cc).toEqual([
      "global@example.test",
      "listcopy@example.test",
      "listcc@example.test",
    ]);
    expect(units[0]?.bcc).toEqual(["private@example.test"]);
    expect(units[1]?.bcc).toEqual([]);
    expect(units[2]?.to.map((r) => r.email)).toEqual([
      "carol@example.test",
      "dave@example.test",
    ]);
  });
  it("test delivery selects one exact preview unit while real send keeps all reviewed units", () => {
    const s = state();
    s.recipients = [
      { ...member("alice"), kind: "individual" },
      { ...member("bob"), kind: "individual" },
    ];
    const units = campaignUnits(s);
    expect(
      sendUnits(units, true, "individual:bob").map((unit) => unit.key),
    ).toEqual(["individual:bob"]);
    expect(sendUnits(units, false)).toEqual(units);
    expect(() => sendUnits(units, true, "foreign")).toThrow("Choose");
  });
  it("restores pending generation to its status step even when saved capture was on step2", () => {
    const saved = { ...state(), lastStep: 2 };
    expect(recoveredCampaignStep(saved, true, false).lastStep).toBe(6);
    expect(recoveredCampaignStep(saved, true, true).lastStep).toBe(7);
    expect(recoveredCampaignStep(saved, false, false).lastStep).toBe(2);
  });
  it("uses canonical complete/partial outcomes without retiring unknown delivery", () => {
    expect(
      canFinishTest({
        testMode: true,
        status: "complete",
        deliveries: [{ status: "sent" }],
      }),
    ).toBe(true);
    expect(
      canFinishTest({
        testMode: true,
        status: "partial",
        deliveries: [{ status: "sent" }, { status: "skipped" }],
      }),
    ).toBe(true);
    expect(
      canFinishTest({
        testMode: true,
        status: "complete",
        deliveries: [{ status: "unknown" }],
      }),
    ).toBe(false);
    expect(
      canFinishTest({ testMode: true, status: "completed", deliveries: [] }),
    ).toBe(false);
  });
  it("does not treat changed Cc/Bcc or recipient address as the reviewed saved envelope", () => {
    const envelope = savedEnvelope({
      email: "A@example.test",
      name: "A",
      cc: ["copy@example.test"],
      bcc: [],
    })!;
    expect(
      sameEnvelope(envelope, {
        to: [{ name: "A", email: "a@example.test" }],
        cc: ["copy@example.test"],
        bcc: [],
      }),
    ).toBe(true);
    expect(
      sameEnvelope(envelope, { ...envelope, cc: ["other@example.test"] }),
    ).toBe(false);
    expect(savedEnvelope({ email: "not email" })).toBe(null);
  });
  it("preserves imported source locators, notes and copies, while navigation does not dirty saved content", () => {
    const s = {
      ...state(),
      contextSelections: [{ kind: "prep", refId: id }],
      recipients: [
        {
          ...member("a"),
          kind: "individual" as const,
          personalNote: "Remember the meeting",
          cc: ["copy@example.test"],
          locator: { source: "client_person", id, clientId: id },
        },
      ],
    };
    const input = operations["engagement.campaign.create"].request.parse({
      body: { requestKey: id, state: s },
    });
    expect(input.body.state).toEqual(s);
    expect(sameCampaignContent(s, { ...s, lastStep: 7 })).toBe(true);
    expect(sameCampaignContent(s, { ...s, mainIdea: "changed" })).toBe(false);
  });
  it("requires exact revision and request identity and rejects browser authority/prompt fields", () => {
    expect(
      operations["engagement.campaign.save"].request.safeParse({
        params: { id },
        body: { state: state() },
      }).success,
    ).toBe(false);
    expect(
      operations["engagement.campaign.generate"].request.safeParse({
        params: { id },
        body: {
          expectedRevision: 1,
          requestKey: id,
          generationKeys: ["individual:a"],
          mode: "generate",
          prompt: "override",
        },
      }).success,
    ).toBe(false);
    expect(
      operations["engagement.campaign.create"].request.safeParse({
        body: { requestKey: id, state: state(), tenantId: id },
      }).success,
    ).toBe(false);
  });
  it("accepts case-equivalent known IDs but refuses another campaign before edit admission", async () => {
    const owner = createCampaignApi(
      api({
        id,
        revision: 1,
        status: "draft",
        updatedAt: "today",
        state: state(),
      }),
    );
    expect(
      (await owner.read(id.toUpperCase(), new AbortController().signal)).id,
    ).toBe(id);
    await expect(
      owner.read(foreign, new AbortController().signal),
    ).rejects.toThrow("does not match");
  });
  it("refuses cross-campaign drafts and crossed current-version artifact binding", async () => {
    const signal = new AbortController().signal;
    await expect(
      createCampaignApi(
        api([
          { id, outreachRecordId: foreign, generationKey: "a", current: null },
        ]),
      ).drafts(id, signal),
    ).rejects.toThrow("does not match");
    await expect(
      createCampaignApi(
        api([
          {
            id,
            outreachRecordId: id,
            generationKey: "a",
            current: {
              artifactId: foreign,
              outreachRecordId: id,
              generationKey: "a",
            },
          },
        ]),
      ).drafts(id, signal),
    ).rejects.toThrow("does not match");
  });
  it("does not mistake a different job or send request for the pending operation", async () => {
    const signal = new AbortController().signal;
    await expect(
      createCampaignApi(
        api({ job: { id: foreign, outreachRecordId: id }, items: [] }),
      ).job(id, id, signal),
    ).rejects.toThrow("does not match");
    await expect(
      createCampaignApi(
        api({ outreachRecordId: id, requestKey: foreign }),
      ).sendRequest(id, id, signal),
    ).rejects.toThrow("does not match");
  });
  it("keeps exact absent request readback absent without dispatching a write", async () => {
    const calls: string[] = [];
    const owner = createCampaignApi({
      request: async (key: string) => {
        calls.push(key);
        return [];
      },
    } as unknown as CapiroApi<typeof capiroOperations>);
    expect(await owner.recover(id, new AbortController().signal)).toBe(null);
    expect(calls).toEqual(["engagement.campaign.request"]);
  });
});
