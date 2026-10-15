import type { PresentationView } from "../../screens/artifacts/PresentationPreviewScreen";
import type { SpreadsheetView } from "../../screens/artifacts/SpreadsheetPreviewScreen";

/** Synthetic workbook and deck for 03.04, 03.05 and their tabs and slides (03.04A to B, 03.05A to E). */
const slide = (
  page: number,
  label: string,
  title: string,
  subtitle: readonly string[],
  notes: string,
  notesSources: string,
) => ({
  id: `s${page}`,
  label,
  eyebrow: `ANDURIL / OCTOBER 2026 · SLIDE ${page}`,
  title,
  subtitle: subtitle.join("\n"),
  footer: `Client update / 0${page} · Version 1`,
  notes,
  notesSources,
});

const cell = (value: string, formula?: string) =>
  formula ? { value, formula } : { value };

export const spreadsheet: SpreadsheetView = {
  headings: {
    summary: {
      title: "Funding analysis",
      description: "funding-analysis.xlsx · Version 1 · Read-only preview",
    },
    source: {
      title: "Funding analysis · Source data",
      description:
        "funding-analysis.xlsx · v1 · Source sheet · Illustrative fixture, not live award data",
    },
    references: {
      title: "Funding analysis · References",
      description:
        "funding-analysis.xlsx · v1 · Referenced inputs and calculation notes",
    },
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
  sourceCaption: "Source data · Values used in the Summary sheet · $M",
  references: {
    title: "Illustrative workbook inputs",
    status: "Information",
    detail:
      "This workbook uses the displayed planning fixture: Program A 120 → 138, B 40 → 44 and C 20 → 24 ($M). Summary totals are 180 → 206, a 14.4% increase. These synthetic inputs do not establish federal award facts. The original inputs, formulas and immutable version stay with the workbook.",
  },
};

export const presentation: PresentationView = {
  heading: {
    title: "Client update",
    description: "client-update.pptx · 6 slides · Version 1 · Verified",
  },
  slides: [
    {
      id: "s1",
      label: "Overview",
      eyebrow: "ANDURIL  /  OCTOBER 2026",
      title: "A focused plan for\nthe next conversation",
      subtitle: "Funding context · Open commitments · Clear next steps",
      footer: "Client update  /  01",
      notes:
        "Open with the client’s near-term priorities. Ask for confirmation of the restoration request before moving into funding context. Cite the latest task record and meeting note.",
      notesSources: "Sources [2] [3]",
    },
    slide(
      2,
      "Funding context",
      "Funding context",
      [
        "Review the public funding update [1].",
        "Confirm how the published context relates to client priorities.",
        "Treat the update as evidence, not a forecast or award decision.",
      ],
      "Use public funding update [1] for the published context. Ask the client to confirm its implications. Do not present a funding assumption as an approved award or a complete market search.",
      "Sources [1]",
    ),
    slide(
      3,
      "Commitments",
      "Open commitments",
      [
        "Restoration request · Source task TASK-2047 [2].",
        "Confirm the accountable owner and intended timing.",
        "Keep follow-up recommendations separate from recorded facts.",
      ],
      "The displayed restoration request is sourced to TASK-2047 [2]. Confirm ownership and timing before drafting a new task. This slide does not execute outreach or create a commitment.",
      "Sources [2]",
    ),
    slide(
      4,
      "Recommendations",
      "Recommendations",
      [
        "Lead with a concise executive summary.",
        "Keep direct source links with each recommendation.",
        "Request review before changing shared memory or client records.",
      ],
      "The strategy review [3] provides briefing context. Recommendations are proposals for discussion. Any governed action requires review of its exact payload and current authority.",
      "Sources [2] [3]",
    ),
    slide(
      5,
      "Next steps",
      "Next steps",
      [
        "Confirm priorities at the client meeting.",
        "Resolve owner and timing for the restoration follow-up.",
        "Prepare a sourced draft for review; preserve version history.",
      ],
      "Use the client task [2] and strategy review [3] to confirm the next steps. A task proposal is separate from a created task. Do not file or send this deck without required review.",
      "Sources [2] [3]",
    ),
    slide(
      6,
      "Sources",
      "Sources and limitations",
      [
        "[1] Public funding update · Published 8 Oct.",
        "[2] Restoration request · Source task TASK-2047.",
        "[3] Strategy review · Meeting note 7 Oct.",
        "Retrieved evidence may be partial; access is checked again.",
      ],
      "This synthetic example defines exactly 3 contributing sources. Each reference opens the matching evidence view. A zero-result search or missing source is not proof of absence. Permissions and freshness are evaluated at use time.",
      "View all 3 sources",
    ),
  ],
  checks: [
    { id: "slides", label: "6 slides", detail: "No text overflow" },
    { id: "refs", label: "References", detail: "Linked from notes" },
    { id: "output", label: "Output", detail: "Editable PPTX + PDF" },
    { id: "version", label: "Version", detail: "Original preserved" },
  ],
};
