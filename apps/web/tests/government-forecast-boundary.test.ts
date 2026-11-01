import { expect, it } from "vitest";
import { fundingRecord as fundingRecordSchema } from "../src/shared/capiro/operations/intelligence-funding";
import { fundingRecord } from "./funding-calendar-fixtures";

it("keeps unknown funding sources outside the wire contract", () => {
  expect(
    fundingRecordSchema.safeParse({ ...fundingRecord(), source: "unknown" })
      .success,
  ).toBe(false);
});
