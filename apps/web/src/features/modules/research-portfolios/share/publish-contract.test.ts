import { expect, it } from "vitest";
import { researchShareOperations } from "../../../../shared/capiro/operations/research-share";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const body = {
  operationKey: "same-user-action",
  snapshotId: id,
  designId: id,
  clientId: id,
  branding: false,
};
const publish = researchShareOperations["research.shareLinks.publish"].request;

it("a publication must bind a reviewed payload and saved design version", () => {
  expect(publish.safeParse({ params: { id }, body }).success).toBe(false);
  expect(
    publish.safeParse({
      params: { id },
      body: { ...body, previewHash: "d".repeat(64), expectedDesignVersion: 1 },
    }).success,
  ).toBe(true);
  expect(
    publish.safeParse({
      params: { id },
      body: { ...body, previewHash: "d".repeat(64), expectedDesignVersion: 0 },
    }).success,
  ).toBe(false);
});

it("the operation read has no one-time token carrier", () => {
  const lookup = researchShareOperations["research.shareLinks.operation"];
  expect(lookup.response.parse({ link: null, token: "secret" })).toEqual({
    link: null,
  });
});
