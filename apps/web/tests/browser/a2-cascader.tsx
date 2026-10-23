import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cascader,
  CascaderTrigger,
  CascaderValue,
  CascaderContent,
  CascaderPanel,
  CascaderNav,
  CascaderInput,
  CascaderBreadcrumb,
  CascaderList,
  CascaderItems,
  CascaderColumns,
  CascaderStatus,
  type CascaderNode,
} from "@capiro/ui/cascader";
// Test-only coverage of the existing renderer, which has no public export.
import { CascaderVirtualItems } from "../../../../packages/ui/src/reui/cascader/cascader-virtual";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";

const params = new URLSearchParams(location.search);
const mode =
  params.get("mode") === "columns"
    ? "columns"
    : params.get("mode") === "tree"
      ? "tree"
      : "drill";
const virtual = params.has("virtual");
const leaves: CascaderNode[] = Array.from(
  { length: virtual ? 200 : 1 },
  (_, index) => ({ value: `leaf-${index}`, label: `Synthetic leaf ${index}` }),
);
const branch: CascaderNode = {
  value: "branch",
  label: "Synthetic branch",
  hasChildren: true,
};
const items = params.has("static")
  ? [{ ...branch, children: leaves }]
  : [branch];
async function getChildren(
  node: CascaderNode | null,
  { signal }: { signal: AbortSignal },
) {
  await Promise.resolve();
  signal.throwIfAborted();
  return node?.value === "branch" ? leaves : items;
}
function Harness() {
  const [value, setValue] = useState("");
  return (
    <main data-portfolio-root style={{ padding: 24 }}>
      <h1>Synthetic Cascader regression</h1>
      <Cascader
        items={items}
        getChildren={params.has("static") ? undefined : getChildren}
        mode={mode}
        selectable="leaf"
        value={value}
        onValueChange={setValue}
        virtualizeThreshold={10}
        maxHeight={240}
      >
        <CascaderTrigger aria-label="Choose synthetic work">
          <CascaderValue />
        </CascaderTrigger>
        <CascaderContent
          style={{ width: 360, background: "white", border: "1px solid black" }}
        >
          <CascaderPanel>
            <CascaderNav>
              <CascaderInput aria-label="Search synthetic work" />
            </CascaderNav>
            <CascaderBreadcrumb />
            {mode === "columns" ? (
              <CascaderColumns />
            ) : (
              <CascaderList>
                {virtual ? <CascaderVirtualItems /> : <CascaderItems />}
              </CascaderList>
            )}
            <CascaderStatus />
          </CascaderPanel>
        </CascaderContent>
      </Cascader>
      <output aria-label="Selected work">{value || "None"}</output>
      <style>{`[data-slot="cascader-list-bounds"],[data-slot="scroll-area-viewport"]{max-height:240px;overflow:auto}[data-slot="cascader-item"]{min-height:40px;padding:8px}[data-slot="cascader-columns"]{display:flex}[data-slot="cascader-column"]{width:180px}[data-slot="cascader-trigger"] svg{width:16px;height:16px}[data-slot="cascader-input"]{width:260px}[data-slot="cascader-list"]{position:relative}[data-slot="cascader-content"] svg{width:16px;height:16px}`}</style>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
