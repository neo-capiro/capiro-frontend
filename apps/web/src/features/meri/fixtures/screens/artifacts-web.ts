import type { GeneratedWebView } from "../../screens/artifacts/GeneratedWebScreen";

/** Synthetic generated HTML for 03.06, 03.07 and 03.07A; it reports the 3 defined sources. */
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
<div><span>Authorized sources</span><b>3</b><span>As of 9 Oct</span></div>
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
      title: "Signal summary · Activity",
      description:
        "signal-summary.html · Version 1 · Exact generated artifact receipt",
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
    '<head><meta charset="utf-8"><title>Anduril · Signal summary</title></head>',
    '<body><main aria-label="Client signal summary">',
    "  <h1>Anduril · Signal summary</h1>",
    "  <p>A concise view of the evidence in this workspace.</p>",
    '  <dl aria-label="Summary metrics">',
    "    <dt>Authorized sources</dt><dd>3 · As of 9 Oct</dd>",
    "    <dt>Open commitments</dt><dd>2 · From task records</dd>",
    "    <dt>Verified outputs</dt><dd>3 · Brief · Workbook · Deck</dd>",
    "  </dl>",
    '  <table aria-label="Client signals"><thead><tr>',
    "    <th>Signal</th><th>Evidence</th><th>Next step</th>",
    "  </tr></thead><tbody>",
    "    <tr><td>Funding context</td><td>Public record [1]</td><td>Confirm priorities</td></tr>",
    "    <tr><td>Restoration request</td><td>Client task [2]</td><td>Assign follow-up</td></tr>",
    "    <tr><td>Meeting timing</td><td>Meeting note [3]</td><td>Confirm agenda</td></tr>",
    "  </tbody></table>",
    "  <p>Preview links stay within this generated artifact.",
    "     Open original sources from the evidence drawer.</p>",
    "</main></body></html>",
  ],
  codeActivity: {
    title: "Verification activity",
    checked: true,
    lines: [
      "HTML generated",
      "Preview rendered",
      "External source links checked",
      "Accessibility labels present",
      "Output saved as version 1",
    ],
  },
  receipt: {
    title: "Version 1 verification receipt",
    checked: false,
    lines: [
      "9 Oct 2026 · 10:47 AM",
      "Generated signal-summary.html v1",
      "Rendered the isolated preview",
      "Checked the 3 displayed source references",
      "Checked heading, metric and table labels",
      "Saved the immutable output and its provenance",
    ],
    statement:
      "This receipt describes this artifact version. It does not grant external actions or claim complete evidence coverage.",
  },
  activityNote:
    "This view shows run activity. Ask Meri for a change in the conversation.",
};
