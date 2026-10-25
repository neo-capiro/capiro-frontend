import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CopyResult } from "../src/features/portfolio/files/upload-copy/CopyResult";
import { prospectFileCopyReceiptSchema } from "../src/features/portfolio/files/upload-copy/contracts";
import { prepareProspectFileCopy } from "../src/features/portfolio/files/upload-copy/command";
import { actor, id, review, receiptFor } from "./prospect-file-copy-fixtures";
it("pending is not completion and offers no automatic or new copy", async () => {
  const saved = await prepareProspectFileCopy(actor, review, null, id(50));
  const html = renderToStaticMarkup(
    createElement(CopyResult, {
      receipt: prospectFileCopyReceiptSchema.parse(
        receiptFor(saved, "pending"),
      ),
    }),
  );
  expect(html).toContain("copy is pending");
  expect(html).not.toContain("copy completed");
  expect(html).not.toContain("href=");
});
it("historical unavailable completion does not provide a recreated target or opening link", async () => {
  const saved = await prepareProspectFileCopy(actor, review, null, id(50));
  const html = renderToStaticMarkup(
    createElement(CopyResult, {
      receipt: prospectFileCopyReceiptSchema.parse(
        receiptFor(saved, "completed", false),
      ),
    }),
  );
  expect(html).toContain("copy completed");
  expect(html).toContain("will not recreate it");
  expect(html).not.toContain("href=");
});
it("available copy reports actual scan status without claiming readiness", async () => {
  const saved = await prepareProspectFileCopy(actor, review, null, id(50));
  const response = receiptFor(saved);
  response.result!.lifecycleStatus = "scanning";
  response.result!.scanStatus = "pending";
  const html = renderToStaticMarkup(
    createElement(CopyResult, {
      receipt: prospectFileCopyReceiptSchema.parse(response),
    }),
  );
  expect(html).toContain("scanning");
  expect(html).toContain("pending");
  expect(html).toContain("checks current readiness");
  expect(html).not.toContain("href=");
});
