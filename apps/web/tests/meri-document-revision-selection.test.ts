import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  receiveSkillSelection,
  skillSelectionFields,
  storedSubmission,
  conversationIntentJournal,
} from "../src/shared/meri-conversations/query-journal";
import { revisionHandoff } from "../src/shared/meri-documents/revision-handoff";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { clearMeriConversationScope } from "../src/shared/meri-conversations/tab-journal";
import { memoryStorage, previewSource } from "./meri-preview-revision-fixtures";
import { ids, session } from "./meri-document-public-fixtures";
const selection = {
  documentRevision: {
    artifactId: ids.artifact,
    versionId: ids.version,
    objectSha256: previewSource().version.object.sha256,
  },
};
it("preserves a closed frozen revision selector and refuses mixed skill/foreign selector fields", () => {
  const selected = receiveSkillSelection(selection);
  expect(selected).toEqual(selection);
  expect(Object.isFrozen(selected.documentRevision)).toBe(true);
  expect(skillSelectionFields(selection)).toEqual(selection);
  expect(() =>
    receiveSkillSelection({
      documentRevision: { ...selection.documentRevision, authority: true },
    }),
  ).toThrow();
  expect(() =>
    receiveSkillSelection({
      ...selection,
      skill: { skillId: "commitments_audit", skillVersion: "1.0.0" },
      windowRequest: { basis: "unbounded" },
    }),
  ).toThrow();
});
it("stored request recovery retains the selected source bytes in original request equality", () => {
  const stored = {
    requestId: ids.other,
    prompt: "Revise this source",
    ...selection,
  } as ConversationStoredRequest;
  expect(storedSubmission(stored).documentRevision).toEqual(
    selection.documentRevision,
  );
});
it("an UNKNOWN initial request retries identical source/prompt/id after reload despite picker changes", async () => {
  const storage = memoryStorage();
  const client = new QueryClient();
  const intent = conversationIntentJournal(client, session.context, storage);
  const submitInitial = vi.fn(async (_request: unknown) => {
    throw Error("lost ACK");
  });
  const submit = vi.fn(async () => {});
  const port = {
    submitInitial,
    submit,
    getSnapshot: () => ({ submit: "idle", observation: null }),
  } as unknown as MeriConversationPort;
  await expect(
    sendRequest(
      port,
      intent,
      "Make the heading shorter",
      false,
      true,
      undefined,
      undefined,
      selection,
    ),
  ).rejects.toThrow();
  const original = submitInitial.mock.calls[0]![0];
  const recovered = conversationIntentJournal(
    new QueryClient(),
    session.context,
    storage,
  );
  await sendRequest(
    port,
    recovered,
    "Different draft",
    true,
    false,
    undefined,
    undefined,
    {
      documentRevision: {
        ...selection.documentRevision,
        versionId: ids.revision,
      },
    },
  ).catch(() => {});
  expect(submitInitial).toHaveBeenCalledTimes(2);
  expect(submitInitial.mock.calls[1]![0]).toEqual(original);
  expect(original).toMatchObject(selection);
});
it("revision navigation changes only an unsent scoped draft and revocation clears it", () => {
  const storage = memoryStorage(),
    context = session.context,
    owner = revisionHandoff(context, storage),
    source = previewSource();
  owner.write({
    kind: "generated",
    artifactId: source.version.artifactId,
    versionId: source.version.versionId,
    objectSha256: source.version.object.sha256,
    filename: source.version.filename,
    mimeType: source.version.mimeType,
    bytes: source.version.object.bytes,
    createdAt: source.version.createdAt,
    generationStatus: source.version.generationStatus,
    previewStatus: source.version.previewStatus,
    inspection: source.inspection,
  });
  expect(
    revisionHandoff({ ...context, conversationId: ids.other }, storage).read(),
  ).toBeUndefined();
  const draft = createInitialDraftOwner(
    { ...context, clientId: context.selectedClientId },
    storage,
  );
  draft.edit("Please revise");
  draft.selectSkill(owner.read()!.selection);
  expect(draft.draft()).toBe("Please revise");
  expect(draft.selection()).toEqual(selection);
  expect(draft.hasPending(context)).toBe(false);
  const reloaded = createInitialDraftOwner(
    { ...context, clientId: context.selectedClientId },
    storage,
  );
  expect(reloaded.selection()).toEqual(selection);
  clearMeriConversationScope(
    { ...context, clientId: context.selectedClientId },
    storage,
  );
  expect(() => owner.read()).toThrow();
});
