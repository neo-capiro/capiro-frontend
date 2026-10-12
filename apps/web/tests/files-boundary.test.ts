import { describe, expect, it } from "vitest";
import {
  clientFilesSchema,
  fileAccessForIdSchema,
  fileChangeForIdSchema,
} from "../src/features/portfolio/files/contracts";
import { clientId, file } from "./browser/fixtures";
const otherId = "60000000-0000-4000-8000-000000000009";

describe("client attachment response boundaries", () => {
  it("requires every returned attachment to belong to the requested client", () => {
    expect(clientFilesSchema(clientId).parse([file])).toHaveLength(1);
    expect(
      clientFilesSchema(clientId).safeParse([
        file,
        {
          ...file,
          id: otherId,
          clientId: "10000000-0000-4000-8000-000000000009",
        },
      ]).success,
    ).toBe(false);
    expect(
      clientFilesSchema(clientId).safeParse([{ ...file, clientId: null }])
        .success,
    ).toBe(false);
  });
  it("rejects duplicate identities instead of ambiguously selecting a file", () => {
    expect(
      clientFilesSchema(clientId).safeParse([
        file,
        { ...file, fileName: "Other title" },
      ]).success,
    ).toBe(false);
  });
  it("pins access reads and mutation receipts to the requested attachment", () => {
    expect(fileAccessForIdSchema(file.id).parse(file).id).toBe(file.id);
    expect(fileChangeForIdSchema(file.id).parse(file).id).toBe(file.id);
    expect(
      fileAccessForIdSchema(file.id).safeParse({ ...file, id: otherId })
        .success,
    ).toBe(false);
    expect(
      fileChangeForIdSchema(file.id).safeParse({ ...file, id: otherId })
        .success,
    ).toBe(false);
  });
});
