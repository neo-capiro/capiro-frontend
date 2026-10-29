import { expect, it } from "vitest";
import {
  defaultLayout,
  reusableLayout,
} from "../src/features/modules/research-portfolios/share/dashboard-layout";
it("duplicates the same portfolio geometry and settings without aliasing the original", () => {
  const source = defaultLayout();
  source.widgets[0]!.settings = {
    title: "A",
    snapshotId: "snapshot",
    subjectIds: ["member"],
    fundingFiscalYear: 2027,
    basisKey: "basis",
  };
  const copy = reusableLayout(source, true);
  expect(copy).toEqual(source);
  expect(copy.widgets[0]).not.toBe(source.widgets[0]);
  expect(copy.widgets[0]!.settings).not.toBe(source.widgets[0]!.settings);
  copy.phoneOrder.reverse();
  expect(copy.phoneOrder).not.toEqual(source.phoneOrder);
});
it("cross-portfolio reuse removes source snapshot/member/basis bindings while retaining presentation", () => {
  const source = defaultLayout();
  source.widgets[0]!.settings = {
    title: "A",
    snapshotId: "source-snapshot",
    subjectIds: ["source-member"],
    fundingFiscalYear: 2027,
    basisKey: "source-basis",
    showSources: false,
  };
  const copy = reusableLayout(source, false);
  expect(copy.widgets[0]!.settings).toEqual({ title: "A", showSources: false });
  expect(source.widgets[0]!.settings.snapshotId).toBe("source-snapshot");
  expect(copy.phoneOrder).toEqual(source.phoneOrder);
});
