"use client";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { ForecastWindows } from "@/features/portfolio/calendar/forecasts/ForecastWindows";

/** Two quarters from today as civil days; the forecast read filters [from, to). */
export function defaultForecastRange(
  today: Temporal.PlainDate = Temporal.Now.plainDateISO(),
) {
  return { from: today.toString(), to: today.add({ months: 6 }).toString() };
}

/**
 * Core's /government-forecasts range read and per-row /history read, through
 * the same portfolio transport the calendar uses for the same component.
 */
export function GovernmentForecasts() {
  const [range] = useState(defaultForecastRange);
  return (
    <DataProvider>
      <ForecastWindows from={range.from} to={range.to} />
    </DataProvider>
  );
}
