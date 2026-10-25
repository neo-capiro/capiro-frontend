import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  prepareProspectFileCopy,
  prospectFileCopyDigest,
  requestProspectFileCopy,
} from "../src/features/portfolio/files/upload-copy/command";
import {
  prospectFileCopyCommandSchema,
  prospectFileCopyReceiptSchema,
} from "../src/features/portfolio/files/upload-copy/contracts";
import {
  readProspectFileCopyReview,
  selectProspectUpload,
} from "../src/features/portfolio/files/upload-copy/review";
import {
  actor,
  id,
  source,
  review,
  fixture,
  receiptFor,
} from "./prospect-file-copy-fixtures";
const guard = () => {},
  signal = () => new AbortController().signal;
it("matches the canonical Core digest and trims the reviewed destination once", async () => {
  const saved = await prepareProspectFileCopy(
    actor,
    review,
    "  Private  ",
    id(50),
  );
  expect(saved.command.folder).toBe("Private");
  expect(saved.payloadDigest).toBe(
    createHash("sha256")
      .update(
        JSON.stringify([
          "prospect-file-copy",
          1,
          actor.tenantId,
          actor.userId,
          saved.command,
        ]),
      )
      .digest("hex"),
  );
  expect(
    await prospectFileCopyDigest({ ...actor, userId: id(80) }, saved.command),
  ).not.toBe(saved.payloadDigest);
});
it.each([
  { source: "mail" },
  { usable: false },
  { lifecycleStatus: "delete_pending" },
  { calculatedSha256: null },
  { calculatedSha256: "b".repeat(64) },
  { metadataRevision: undefined },
  { byteSize: 0 },
])("rejects an ineligible upload %j", (change) =>
  expect(() => selectProspectUpload({ ...source, ...change })).toThrow(),
);
it("rejects extra command fields and noncanonical timestamp/UUID", async () => {
  const { command } = await prepareProspectFileCopy(
    actor,
    review,
    null,
    id(50),
  );
  for (const changed of [
    { ...command, share: true },
    { ...command, expectedProspectUpdatedAt: "2026-10-25" },
    { ...command, sourceId: "ABC" },
  ])
    expect(prospectFileCopyCommandSchema.safeParse(changed).success).toBe(
      false,
    );
});
it("revalidates source revision and converted link before review", async () => {
  const changed = fixture({ files: [{ ...source, metadataRevision: 4 }] });
  await expect(
    readProspectFileCopyReview(
      changed.api,
      actor,
      id(3),
      id(4),
      review.selection,
      signal(),
      guard,
    ),
  ).rejects.toThrow("changed");
  const unconverted = fixture({
    current: { ...review, prospect: { ...review.prospect, convertedAt: null } },
  });
  await expect(
    readProspectFileCopyReview(
      unconverted.api,
      actor,
      id(3),
      id(4),
      review.selection,
      signal(),
      guard,
    ),
  ).rejects.toThrow("access");
});
it.each([
  "tenantId",
  "actorUserId",
  "requestId",
  "prospectId",
  "clientId",
  "sourceId",
  "payloadDigest",
  "expectedRevision",
])("rejects mismatched receipt %s", async (key) => {
  const saved = await prepareProspectFileCopy(actor, review, null, id(50));
  const receipt = {
    ...receiptFor(saved),
    [key]:
      key === "expectedRevision"
        ? 4
        : key === "payloadDigest"
          ? "f".repeat(64)
          : id(99),
  };
  const f = fixture({ copy: () => receipt });
  await expect(
    requestProspectFileCopy(f.api, actor, saved, false, signal(), guard),
  ).rejects.toThrow("does not match");
});
it("accepts only coherent pending and completed receipts, including unavailable history", async () => {
  const saved = await prepareProspectFileCopy(actor, review, null, id(50));
  expect(
    prospectFileCopyReceiptSchema.safeParse(
      receiptFor(saved, "completed", false),
    ).success,
  ).toBe(true);
  expect(
    prospectFileCopyReceiptSchema.safeParse(receiptFor(saved, "pending"))
      .success,
  ).toBe(true);
  expect(
    prospectFileCopyReceiptSchema.safeParse({
      ...receiptFor(saved, "pending"),
      available: true,
    }).success,
  ).toBe(false);
  expect(
    prospectFileCopyReceiptSchema.safeParse({
      ...receiptFor(saved),
      result: null,
    }).success,
  ).toBe(false);
});
