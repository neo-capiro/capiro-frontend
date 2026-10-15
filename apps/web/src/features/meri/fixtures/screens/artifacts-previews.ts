import type { GeneratedWebView } from "../../screens/artifacts/GeneratedWebScreen";
import type { PresentationView } from "../../screens/artifacts/PresentationPreviewScreen";
import type { SpreadsheetView } from "../../screens/artifacts/SpreadsheetPreviewScreen";

/** Synthetic workbook, deck and generated HTML for 03.04 to 03.07. */
const slide = (
  id: string,
  label: string,
  title: string,
  subtitle: string,
  notes: string,
  page: number,
) => ({
  id,
  label,
  eyebrow: "ANDURIL  /  OCTOBER 2026",
  title,
  subtitle,
  footer: `Client update  /  0${page}`,
  notes,
  notesSources: "Sources [2] [3]",
});

const signalSummaryHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Anduril · Signal summary</title>
<style>
:root{color-scheme:light dark;--fg:#0a0a0a;--muted:#756e69;--bg:#f5f5f4;--card:#fff;--line:#e7e5e4}
@media (prefers-color-scheme:dark){:root{--fg:#f5f5f4;--muted:#afa6a0;--bg:#242424;--card:#0a0a0a;--line:#242424}}
body{margin:0;padding:32px;font:14px/1.45 system-ui,sans-serif;color:var(--fg);background:var(--card)}
h1{margin:0 0 20px;font-size:34px;line-height:1.1;letter-spacing:-1px}p{margin:0 0 20px;color:var(--muted);font-size:15px}
.m{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
.m div{padding:20px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.m span{display:block;font-size:12px;color:var(--muted)}.m b{display:block;margin:8px 0;font-size:34px}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px}
th{padding:10px;text-align:left;font-size:12px;font-weight:500;color:var(--muted);background:var(--bg)}
td{padding:10px}tr:nth-child(even) td{background:var(--bg)}
</style></head>
<body><main aria-label="Client signal summary"><h1>Anduril · Signal summary</h1>
<p>A concise view of the evidence in this workspace.</p>
<section class="m" aria-label="Verified evidence">
<div><span>Authorized sources</span><b>6</b><span>As of 9 Oct</span></div>
<div><span>Open commitments</span><b>2</b><span>From task records</span></div>
<div><span>Verified outputs</span><b>3</b><span>Brief · Workbook · Deck</span></div></section>
<table><thead><tr><th>Signal</th><th>Evidence</th><th>Next step</th></tr></thead><tbody>
<tr><td>Funding context</td><td>Public record [1]</td><td>Confirm priorities</td></tr>
<tr><td>Restoration request</td><td>Client task [2]</td><td>Assign follow-up</td></tr>
<tr><td>Meeting timing</td><td>Meeting note [3]</td><td>Confirm agenda</td></tr>
</tbody></table></main></body></html>`;

export const generatedWeb: GeneratedWebView = {
  headings: {
    preview: {
      title: "Client signal summary",
      description: "signal-summary.html · Version 1 · Isolated preview",
    },
    code: {
      title: "Signal summary source",
      description: "signal-summary.html · Generated artifact source",
    },
    activity: {
      title: "Signal summary activity",
      description: "signal-summary.html · Verification run for version 1",
    },
  },
  fileName: "signal-summary.html",
  html: signalSummaryHtml,
  previewNote:
    "Preview links and controls stay within this generated artifact. Open original sources from the evidence drawer.",
  codeLabel: "HTML · signal-summary.html",
  code: [
    "<!doctype html>",
    '<html lang="en">',
    "  <head><title>Anduril · Signal summary</title></head>",
    "  <body>",
    '    <main aria-label="Client signal summary">',
    "      <h1>Anduril · Signal summary</h1>",
    '      <section aria-label="Verified evidence">',
    "        <h2>Open commitments</h2>",
    "        <p>2 commitments from authorized task records.</p>",
    "      </section>",
    "    </main>",
    "  </body>",
    "</html>",
  ],
  activity: [
    "HTML generated",
    "Preview rendered",
    "External source links checked",
    "Accessibility labels present",
    "Output saved as version 1",
  ],
  activityNote:
    "This view shows run activity. Ask Meri for a change in the conversation.",
};

const cell = (value: string, formula?: string) =>
  formula ? { value, formula } : { value };

export const spreadsheet: SpreadsheetView = {
  heading: {
    title: "Funding analysis",
    description: "funding-analysis.xlsx · Version 1 · Read-only preview",
  },
  sheetLabel: "funding-analysis.xlsx, sheet 1",
  columns: ["A · Category", "B · FY26", "C · FY27", "D · Change"],
  rows: [
    [cell("Illustrative planning data"), cell("$M"), cell("$M"), cell("%")],
    [cell("Program A"), cell("120"), cell("138"), cell("15.0%")],
    [cell("Program B"), cell("40"), cell("44"), cell("10.0%")],
    [cell("Program C"), cell("20"), cell("24"), cell("20.0%")],
    [
      cell("TOTAL"),
      cell("180", "=SUM(B2:B4)"),
      cell("206", "=SUM(C2:C4)"),
      cell("14.4%", "=(C5-B5)/B5"),
    ],
  ],
  initialCell: { row: 4, col: 1 },
  chart: {
    title: "FY26 → FY27 · $M",
    bars: [
      { label: "A", value: 138 },
      { label: "B", value: 44 },
      { label: "C", value: 24 },
    ],
  },
  checks: [
    {
      id: "totals",
      label: "Totals checked",
      detail: "180 → 206 · Source values reconciled",
    },
    {
      id: "formulas",
      label: "Formulas verified",
      detail: "3 supported formulas · No missing references",
    },
    {
      id: "limits",
      label: "Preview limitation",
      detail: "Unsupported workbook features are reported before download",
    },
  ],
  sourceData: [
    {
      id: "a",
      label: "Program A",
      detail: "FY26 120 · FY27 138 · Illustrative planning data",
    },
    {
      id: "b",
      label: "Program B",
      detail: "FY26 40 · FY27 44 · Illustrative planning data",
    },
    {
      id: "c",
      label: "Program C",
      detail: "FY26 20 · FY27 24 · Illustrative planning data",
    },
  ],
  references: [
    {
      id: "r1",
      label: "[1] Public funding update",
      detail: "Public record · through 8 Oct",
    },
    {
      id: "r2",
      label: "Planning values",
      detail: "Illustrative synthetic values; no budget source is connected",
    },
  ],
};

export const presentation: PresentationView = {
  heading: {
    title: "Client update",
    description: "client-update.pptx · 6 slides · Version 1 · Verified",
  },
  slides: [
    slide(
      "s1",
      "Overview",
      "A focused plan for\nthe next conversation",
      "Funding context · Open commitments · Clear next steps",
      "Open with the client’s near-term priorities. Ask for confirmation of the restoration request before moving into funding context. Cite the latest task record and meeting note.",
      1,
    ),
    slide(
      "s2",
      "Funding context",
      "FY27 funding moves\nin the client’s favour",
      "Published defense funding update · 8 Oct",
      "Summarize the public funding update and keep the citation visible.",
      2,
    ),
    slide(
      "s3",
      "Commitments",
      "Two commitments\nneed an owner",
      "Restoration request overdue · Client brief due 10 Oct",
      "Confirm who owns the restoration request.",
      3,
    ),
    slide(
      "s4",
      "Recommendations",
      "Three concise\nrecommendations",
      "Priorities · Ownership · Delivery date",
      "Keep each recommendation to one sentence.",
      4,
    ),
    slide(
      "s5",
      "Next steps",
      "Agree the next\nclient touchpoint",
      "Brief delivery · Follow-up meeting",
      "Close with the agreed dates.",
      5,
    ),
    slide(
      "s6",
      "Sources",
      "Sources",
      "[1] Public funding update · [2] Client task · [3] Meeting note",
      "All references link to authorized records.",
      6,
    ),
  ],
  checks: [
    { id: "slides", label: "6 slides", detail: "No text overflow" },
    { id: "refs", label: "References", detail: "Linked from notes" },
    { id: "output", label: "Output", detail: "Editable PPTX + PDF" },
    { id: "version", label: "Version", detail: "Original preserved" },
  ],
};
