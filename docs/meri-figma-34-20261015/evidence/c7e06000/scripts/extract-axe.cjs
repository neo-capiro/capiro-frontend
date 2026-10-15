// Usage: node extract-axe.cjs REPORT_JSON OUT_DIR
// Writes each axe-full-default-results attachment byte-exact (decoded) and a summary.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [reportPath, out] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(reportPath));
fs.mkdirSync(out, { recursive: true });
const rows = []; const tests = []; let n = 0;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
function walk(suite, file) {
  file = suite.file ?? file;
  for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
    const results = t.results ?? [];
    tests.push({ file: spec.file ?? file, line: spec.line, title: spec.title, project: t.projectName, status: t.status, expectedStatus: t.expectedStatus, results: results.map(r => ({ status: r.status, retry: r.retry, durationMs: r.duration, errors: (r.errors ?? []).map(e => (e.message ?? '').slice(0, 400)) })) });
    for (const r of results) for (const a of r.attachments ?? []) {
      if (a.name !== 'axe-full-default-results') continue;
      const raw = a.body !== undefined ? Buffer.from(a.body, 'base64') : fs.readFileSync(a.path);
      n++;
      const name = String(n).padStart(2, '0') + '-' + slug(path.basename(spec.file ?? file, '.spec.ts') + '-' + spec.title) + '.json';
      fs.writeFileSync(path.join(out, name), raw);
      const ax = JSON.parse(raw);
      rows.push({ file: name, sha256: crypto.createHash('sha256').update(raw).digest('hex'), spec: spec.file ?? file, line: spec.line, title: spec.title, testStatus: t.status,
        url: ax.url, timestamp: ax.timestamp, axeVersion: ax.testEngine?.version, runnerViewport: ax.testEnvironment ? `${ax.testEnvironment.windowWidth}x${ax.testEnvironment.windowHeight}` : undefined,
        orientation: ax.testEnvironment?.orientationType,
        violations: ax.violations.length, violationNodes: ax.violations.reduce((k, v) => k + v.nodes.length, 0),
        incompleteRules: ax.incomplete.map(i => ({ id: i.id, impact: i.impact, nodes: i.nodes.length, messages: [...new Set(i.nodes.flatMap(nd => [...nd.any, ...nd.all, ...nd.none].map(c => c.message)))].slice(0, 4) })),
        passes: ax.passes.length, inapplicable: ax.inapplicable.length });
    }
  }
  for (const s of suite.suites ?? []) walk(s, file);
}
for (const s of report.suites) walk(s);
fs.writeFileSync(path.join(out, 'axe-summary.json'), JSON.stringify({ source: 'playwright report.json attachments named axe-full-default-results (base64 body decoded, bytes unchanged)', audits: rows.length, totalViolations: rows.reduce((k, r) => k + r.violations, 0), audits_with_incomplete: rows.filter(r => r.incompleteRules.length).length, rows }, null, 2) + '\n');
fs.writeFileSync(path.join(out, '..', 'tests-summary.json'), JSON.stringify({ stats: report.stats, tests }, null, 2) + '\n');
console.log(JSON.stringify({ audits: rows.length, totalViolations: rows.reduce((k, r) => k + r.violations, 0), withIncomplete: rows.filter(r => r.incompleteRules.length).length, tests: tests.length, stats: report.stats }));
