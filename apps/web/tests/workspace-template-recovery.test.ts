import { describe, expect, it, vi } from "vitest";
import {
  templateRecovery,
  readTemplateIntent,
  type TemplateApi,
  type TemplateIntent,
} from "../src/features/modules/workspace/templates/template-recovery";
import { outreachTemplateOperations as operations } from "../src/shared/capiro/operations/outreach-templates";
import { engagementSessionOperations } from "../src/shared/capiro/operations/engagement-sessions";
import { blankTemplate } from "../src/features/modules/workspace/templates/template-model";

const id = (n: number) =>
  `75000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = {
  id: id(1),
  ownerUserId: id(9),
  clientId: null,
  scope: "private",
  name: "Synthetic",
  description: null,
  campaignType: null,
  status: "active",
  currentDraftVersionId: id(2),
  publishedVersionId: null,
  createdAt: "2026-10-26T00:00:00Z",
  updatedAt: "2026-10-26T00:00:00Z",
  archivedAt: null,
};
function intent(
  operation: "workspace.template.publish" | "workspace.template.use",
) {
  return templateRecovery.schema.parse({
    requestId: id(3),
    command: {
      operation,
      accessClientId: id(4),
      input: {
        params: { templateId: id(1) },
        body: operation.endsWith("publish")
          ? { expectedDraftVersionId: id(2) }
          : {
              requestKey: id(3),
              title: "Original title",
              variableValues: { answer: "Original answer" },
            },
      },
    },
  });
}
function savedDraft() {
  return templateRecovery.schema.parse({
    requestId: id(3),
    command: {
      operation: "save-draft",
      input: {
        metadata: {
          params: { templateId: id(1) },
          body: { name: "Original title", scope: "private" },
        },
        draft: {
          params: { templateId: id(1) },
          body: { spec: blankTemplate() },
        },
      },
    },
  });
}
const version = {
  id: id(2),
  templateId: id(1),
  versionNumber: 2,
  lifecycle: "published",
  contentHash: "a".repeat(64),
  sourceSessionId: null,
  createdByUserId: id(9),
  createdAt: base.createdAt,
  publishedAt: base.createdAt,
  spec: blankTemplate(),
};
describe("template command input and result boundaries", () => {
  it("rejects an absent publish pointer, and accepts only bounded server search", () => {
    expect(
      operations["workspace.template.publish"].request.safeParse({
        params: { templateId: id(1) },
      }).success,
    ).toBe(false);
    expect(
      engagementSessionOperations["engagement.sessions"].request.safeParse({
        query: { limit: 50, offset: 0, search: "Campaign 103" },
      }).success,
    ).toBe(true);
    expect(
      engagementSessionOperations["engagement.sessions"].request.safeParse({
        query: { search: "x".repeat(161) },
      }).success,
    ).toBe(false);
  });
  it("rejects use-key drift and metadata acknowledgments from another template", () => {
    expect(
      templateRecovery.schema.safeParse({
        ...intent("workspace.template.use"),
        requestId: id(6),
      }).success,
    ).toBe(false);
    expect(
      templateRecovery.schema.safeParse({
        ...savedDraft(),
        metadataAcknowledged: { ...base, id: id(6) },
      }).success,
    ).toBe(false);
    expect(
      templateRecovery.schema.safeParse({
        ...intent("workspace.template.use"),
        metadataAcknowledged: base,
      }).success,
    ).toBe(false);
  });
  it("rejects a publish result for a newer version or another template", () => {
    const original = intent("workspace.template.publish");
    const result = {
      templateId: id(1),
      published: true,
      replayed: true,
      version,
    };
    expect(
      templateRecovery.schema.safeParse({ ...original, result }).success,
    ).toBe(true);
    expect(
      templateRecovery.schema.safeParse({
        ...original,
        result: { ...result, version: { ...version, id: id(7) } },
      }).success,
    ).toBe(false);
    expect(
      templateRecovery.schema.safeParse({
        ...original,
        result: { ...result, templateId: id(7) },
      }).success,
    ).toBe(false);
  });
  it("never permits an update to replace submitted values or an acknowledged step", () => {
    const original = savedDraft();
    const partial = templateRecovery.schema.parse({
      ...original,
      metadataAcknowledged: base,
    });
    expect(() =>
      templateRecovery.validateUpdate!(original, partial),
    ).not.toThrow();
    const changed = structuredClone(partial);
    if (changed.command.operation === "save-draft")
      changed.command.input.draft.body.spec.goal.topic = "Replacement";
    expect(() => templateRecovery.validateUpdate!(partial, changed)).toThrow();
    expect(() => templateRecovery.validateUpdate!(partial, original)).toThrow();
  });
  it("holds a lost create without synthesizing an exact receipt from matching metadata", async () => {
    const record = templateRecovery.schema.parse({
      requestId: id(3),
      command: {
        operation: "workspace.template.create",
        input: { body: { name: "Synthetic", spec: blankTemplate() } },
      },
    });
    const request = vi.fn();
    await readTemplateIntent(
      { request } as unknown as TemplateApi,
      record,
      new AbortController().signal,
      () => {},
    );
    expect(request).not.toHaveBeenCalled();
    expect(record.result).toBeUndefined();
  });
  it("uses original client selection for metadata preflight and acknowledged destination afterward", async () => {
    const request = vi.fn().mockResolvedValue({ template: base });
    const record = templateRecovery.schema.parse({
      requestId: id(3),
      command: {
        operation: "workspace.template.metadata",
        accessClientId: id(4),
        input: {
          params: { templateId: id(1) },
          body: { name: "Synthetic", scope: "client", clientId: id(5) },
        },
      },
    });
    const api = { request } as unknown as TemplateApi;
    const signal = new AbortController().signal;
    await readTemplateIntent(api, record, signal, () => {});
    expect(request.mock.calls[0]![1]).toEqual({
      params: { templateId: id(1) },
      query: { clientId: id(4) },
    });
    await readTemplateIntent(
      api,
      { ...record, result: { ...base, clientId: id(5), scope: "client" } },
      signal,
      () => {},
    );
    expect(request.mock.calls[1]![1]).toEqual({
      params: { templateId: id(1) },
      query: { clientId: id(5) },
    });
  });
  it("uses the immutable submitted client for pending use even when the retained template hint differs", async () => {
    const record = intent("workspace.template.use");
    if (record.command.operation !== "workspace.template.use")
      throw new Error("Expected use fixture");
    record.command.input.body.clientId = id(5);
    const original = structuredClone(record);
    const request = vi.fn().mockResolvedValue({ template: base });
    await readTemplateIntent(
      { request } as unknown as TemplateApi,
      record,
      new AbortController().signal,
      () => {},
    );
    expect(request.mock.calls[0]![1]).toEqual({
      params: { templateId: id(1) },
      query: { clientId: id(5) },
    });
    expect(record).toEqual(original);
    expect(record.command.accessClientId).toBe(id(4));
  });
  it("rejects mismatched current reads before exposing retained inputs", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ template: { ...base, id: id(8) } });
    await expect(
      readTemplateIntent(
        { request } as unknown as TemplateApi,
        intent("workspace.template.publish"),
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("does not match");
  });
  it("rejects a canonical provenance reply for another resulting session", async () => {
    const record = {
      ...intent("workspace.template.use"),
      result: {
        applicationId: id(6),
        sessionId: id(7),
        stateVersion: 1,
        templateId: id(1),
        templateVersionId: id(2),
        replayed: true,
        receipt: {
          templateId: id(1),
          templateName: "Original",
          templateVersionId: id(2),
          templateVersionNumber: 1,
          templateContentHash: "a",
          inherited: [],
          refreshed: [],
          unavailable: [],
          unresolved: [],
          nextRequiredStep: null,
          requiresLiveTargets: true,
          requiresLiveContext: true,
        },
      },
    } as TemplateIntent;
    const request = vi.fn().mockResolvedValue({
      sessionId: id(8),
      applicationId: id(6),
      templateId: id(1),
      templateVersionId: id(2),
    });
    await expect(
      readTemplateIntent(
        { request } as unknown as TemplateApi,
        record,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("unavailable under current access");
  });
});
