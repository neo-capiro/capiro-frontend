import { expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ isSuccess: false, isPending: true }),
}));
vi.mock("@/shared/portfolio/ui/Dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
}));
import { BriefViewer } from "../src/features/portfolio/prospects/brief/BriefViewer";
import { CopyResult } from "../src/features/portfolio/prospects/brief/client-copy/CopyResult";
import { clientBriefCopyReceiptSchema } from "../src/shared/capiro/operations/workspace-client-brief-copy";
import { prepareClientBriefCopy } from "../src/features/portfolio/prospects/brief/client-copy/command";
import {
  actor,
  id,
  receiptFor,
  review,
  savedBrief,
} from "./prospect-client-brief-copy-fixtures";
it("offers a deliberate saved-version action only with a mounted destination owner; rendering never copies", () => {
  const onClientCopy = vi.fn();
  const props = {
    scope: { tenantId: actor.tenantId, prospectId: id(3) },
    data: savedBrief,
    onClose: () => {},
  };
  expect(
    renderToStaticMarkup(
      createElement(BriefViewer, { ...props, onClientCopy }),
    ),
  ).toContain("Copy saved version to private client draft");
  expect(renderToStaticMarkup(createElement(BriefViewer, props))).not.toContain(
    "Copy saved version to private client draft",
  );
  expect(onClientCopy).not.toHaveBeenCalled();
});
it("does not offer an incomplete saved source for copying", () => {
  const data = structuredClone(savedBrief);
  data.currentVersion!.sectionsHash = "missing";
  const html = renderToStaticMarkup(
    createElement(BriefViewer, {
      scope: { tenantId: actor.tenantId, prospectId: id(3) },
      data,
      onClose: () => {},
      onClientCopy: () => {},
    }),
  );
  expect(html).not.toContain("Copy saved version to private client draft");
});
it("opens an independent client draft without the old prospect or briefSource route", async () => {
  const saved = await prepareClientBriefCopy(
    actor,
    review,
    "Private title",
    id(50),
  );
  const html = renderToStaticMarkup(
    createElement(CopyResult, {
      receipt: clientBriefCopyReceiptSchema.parse(receiptFor(saved)),
    }),
  );
  expect(html).toContain(`/modules/workspace?draftId=${id(40)}`);
  expect(html).not.toContain("prospectId=");
  expect(html).not.toContain("briefSource=");
});
it("deleted completed copies remain visible history with no Open link or recreate action", async () => {
  const saved = await prepareClientBriefCopy(
    actor,
    review,
    "Private title",
    id(50),
  );
  const html = renderToStaticMarkup(
    createElement(CopyResult, {
      receipt: clientBriefCopyReceiptSchema.parse(receiptFor(saved, false)),
    }),
  );
  expect(html).toContain("copy completed");
  expect(html).toContain("will not recreate");
  expect(html).not.toContain("href=");
});
