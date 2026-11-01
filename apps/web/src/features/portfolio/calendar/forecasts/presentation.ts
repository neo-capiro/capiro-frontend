import type { Forecast, ForecastCoverage } from "./contracts";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const confidenceLabel =
  "Publisher target; confidence not supplied. Not a probability.";
export const observationMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
export function periodLabel(period: Forecast["period"]) {
  return period.precision === "month"
    ? `${months[period.month - 1]} ${period.year} (approximate calendar month)`
    : `Timing undetermined: ${period.raw || "not supplied"}`;
}
export function observationLabel(observedAt: string | null, now: number) {
  const time = observedAt === null ? NaN : Date.parse(observedAt);
  if (!Number.isFinite(time) || time > now)
    return "Observation freshness unknown";
  return now - time > observationMaxAgeMs
    ? "Stale observation (over 7 days)"
    : "Checked within 7 days";
}
export function elapsedLabel(period: Forecast["period"], today: string) {
  if (period.precision !== "month") return null;
  const month = `${String(period.year).padStart(4, "0")}-${String(period.month).padStart(2, "0")}`;
  return month < today.slice(0, 7)
    ? "Window elapsed; outcome unconfirmed"
    : null;
}
function csvCell(value: string | number) {
  const raw = String(value);
  // Spreadsheet applications may execute formulas even in quoted CSV cells.
  const safe =
    /^[\s]*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function forecastsCsv(
  items: Forecast[],
  range: { from: string; to: string },
  now: number,
  coverage?: ForecastCoverage,
) {
  const headings = [
    "Export scope",
    "Filter from inclusive",
    "Filter before exclusive",
    "Forecast ID",
    "Revision",
    "Title",
    "Event type",
    "Approximate period",
    "Source period text",
    "Precision",
    "Calendar basis",
    "Status",
    "Confidence meaning",
    "RIN",
    "Publisher edition",
    "Publisher issued at",
    "Source URL",
    "Source SHA256",
    "Observed at",
    "Observation freshness",
    "Revision recorded at",
    "Publisher completion action",
    "Publisher completion date text",
    "Publisher withdrawal action",
    "Publisher withdrawal date text",
    "Latest check status",
    "Latest successful check",
    "Partial source coverage",
    "Source accepted count",
    "Source rejected count",
  ];
  const rows = items.map((item) => [
    "Loaded page only",
    range.from,
    range.to,
    item.id,
    item.revision,
    item.title,
    item.eventType,
    periodLabel(item.period),
    item.period.raw,
    item.period.precision,
    item.period.precision === "month" ? "Gregorian calendar month" : "Unknown",
    item.status,
    confidenceLabel,
    item.source.rin,
    item.source.edition,
    item.source.issuedAt ?? "Not supplied",
    item.source.url,
    item.source.sha256,
    item.observedAt,
    observationLabel(item.observedAt, now),
    item.recordedAt,
    item.completionEvidence?.action ?? "",
    item.completionEvidence?.rawDate ?? "",
    item.withdrawalEvidence?.action ?? "",
    item.withdrawalEvidence?.rawDate ?? "",
    coverage?.lastCheckStatus ?? "Unknown",
    coverage?.lastSuccessfulCheckAt ?? "Not supplied",
    coverage ? String(coverage.partial) : "Unknown",
    coverage?.acceptedCount ?? "Unknown",
    coverage?.rejectedCount ?? "Unknown",
  ]);
  return (
    [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export function downloadForecasts(csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "government-forecast-windows-loaded-page.csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
