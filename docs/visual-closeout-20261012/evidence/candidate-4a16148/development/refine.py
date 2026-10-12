from pathlib import Path
r=Path('/workspace/capiro-visual-closeout'); s=r/'apps/web/src/features/portfolio'
p=s/'capabilities/CapabilityFields.tsx';t=p.read_text().replace('Name{!capability && <span aria-hidden="true"> *</span>}','<span>Name{!capability && <span aria-hidden="true"> *</span>}</span>')
for name in ['type','sector']:
 start=t.index('          <input\n            name="'+name+'"');end=t.index('          />',start)+len('          />')
 original=t[start:end];t=t[:start]+'          <span className={!capability ? styles.editableChoice : undefined}>\n'+original+'\n            {!capability && <span aria-hidden="true">▾</span>}\n          </span>'+t[end:]
p.write_text(t)
p=s/'capabilities/capability-editor.module.css';p.write_text(p.read_text()+'''\n.editableChoice { position: relative; display: block; }
.editableChoice input { width: 100%; padding-right: 30px; }
.editableChoice > span { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 10px; }
.editableChoice input::-webkit-calendar-picker-indicator { opacity: 0; }
''')
p=s/'index/PortfolioIndex.tsx';t=p.read_text();a=t.index('                <nav className={styles.tabs}');b=t.index('                </nav>',a)+len('                </nav>');nav=t[a:b]
nav=nav.replace('records.filter','records?.filter').replace('records.length','(records?.length ?? "—")')
nav=nav.replace('onClick={() => set("new", "objective")}','onClick={onObjective}')
header='''"use client";
import { useState, type RefObject } from "react";
import Link from "next/link";
import type { Client } from "./contracts";
import type { PortfolioIndexState } from "./filter";
import { IndexFilters } from "./IndexFilters";
import styles from "./portfolio.module.css";

export function IndexNavigation({ records, state, permitted, objectiveTrigger, onObjective, set, clear }: {
  records?: Client[];
  state: PortfolioIndexState;
  permitted: boolean;
  objectiveTrigger: RefObject<HTMLButtonElement | null>;
  onObjective: () => void;
  set: (key: string, value: string) => void;
  clear: () => void;
}) {
 const [toolsOpen, setToolsOpen] = useState(false);
 return ('''
(s/'index/IndexNavigation.tsx').write_text(header+nav+');\n}\n')
t=t[:a]+'''                <IndexNavigation records={records} state={state} permitted={permitted} objectiveTrigger={objectiveTrigger} onObjective={() => set("new", "objective")} set={set} clear={clear} />
                {records && <>'''+t[b:]
t=t.replace('        {records && (\n          <>\n            <div className={styles.columns}>','            <div className={styles.columns}>')
t=t.replace('              </section>\n              <PortfolioAttention clients={records} />','              </>}\n              </section>\n              {records && <PortfolioAttention clients={records} />}')
t=t.replace('            <GlobalQuickLog clients={records} />\n          </>\n        )}','            {records && <GlobalQuickLog clients={records} />}')
t=t.replace('  const [toolsOpen, setToolsOpen] = useState(false);\n','').replace('import { IndexFilters } from "./IndexFilters";','import { IndexNavigation } from "./IndexNavigation";')
p.write_text(t)
# Existing behavior assertions survive: only navigate the new owners entry / changed Save label.
p=r/'apps/web/tests/browser/ordered-owners.spec.ts';t=p.read_text().replace('Save owner order','Save owners').replace('getByRole("group", { name: "Ordered account owners" })','getByRole("list", { name: "Ordered account owners" })')
t=t.replace('await page.goto("/profile-current-state.html?mode=team");','await page.goto("/profile-current-state.html?mode=team");\n  await page.getByRole("button", { name: "Manage owners" }).click();')
t=t.replace('await profileEvent(page, "open");','await profileEvent(page, "open");\n  await page.getByRole("button", { name: "Manage owners" }).click();')
t=t.replace('    role: "standard_user",\n  });','    role: "standard_user",\n  });\n  await expect(page.getByRole("dialog", { name: "Owners", exact: true })).toHaveCount(0);\n  await page.getByRole("button", { name: "Manage owners" }).click();')
# Keep roster-removal assertion in its visible original Team context before entering nested Owners.
a=t.index('  await expect(\n    page\n      .getByRole("listitem")');b=t.index('  expect(state.writes)',a);assertion=t[a:b];t=t[:a]+t[b:];a=t.index('  await page.getByRole("button", { name: "Manage owners" }).click();',t.index('test("unavailable historical'));t=t[:a]+assertion+t[a:];p.write_text(t)
p=r/'apps/web/tests/browser/profile-current-state.spec.ts';t=p.read_text().replace('Save owner order','Save owners');target='  await expect(\n    page.getByRole("combobox", { name: "Primary owner", exact: true }),\n  ).toBeDisabled();';t=t.replace(target,'  await page.getByRole("button", { name: "Manage owners" }).click();\n'+target)
a=t.index('test("owner assignment rejects');b=t.index('  await page\n',a);t=t[:b]+'  await page.getByRole("button", { name: "Manage owners" }).click();\n'+t[b:];p.write_text(t)
p=r/'apps/web/tests/browser/portfolio-index.spec.ts';t=p.read_text();t=t.replace('  const table = page.getByRole','  await page.getByText("Filters and view", { exact: true }).click();\n  const table = page.getByRole',1);t=t.replace('  await page.getByRole("button", { name: "Card view" }).click();','  await page.getByText("Filters and view", { exact: true }).click();\n  await page.getByRole("button", { name: "Card view" }).click();');t=t.replace('  await page.getByLabel("Search profiles").fill("Energy");','  await page.getByText("Filters and view", { exact: true }).click();\n  await page.getByLabel("Search profiles").fill("Energy");');p.write_text(t)
p=r/'apps/web/tests/browser/portfolio-layout-integration.spec.ts';t=p.read_text().replace('  await page.goto("/portfolio");','  await page.goto("/portfolio");\n  await page.getByRole("button", { name: "Customize", exact: true }).click();');t=t.replace('  await page.getByLabel("Sort profiles").selectOption("recent");','  await page.getByText("Filters and view", { exact: true }).click();\n  await page.getByLabel("Sort profiles").selectOption("recent");');p.write_text(t)
