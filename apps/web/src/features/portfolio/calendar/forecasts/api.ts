import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import { forecastHistorySchema, forecastPageSchema } from "./contracts";

export interface ForecastFilter {
  from: string;
  to: string;
  page: number;
  includeWithdrawn: boolean;
  includeUndated: boolean;
}
export async function fetchForecasts(
  api: ApiClient,
  filter: ForecastFilter,
  signal?: AbortSignal,
) {
  const result = await api.request(
    "core",
    `government-forecasts?${queryString({
      from: filter.from,
      to: filter.to,
      page: filter.page,
      pageSize: 50,
      includeWithdrawn: String(filter.includeWithdrawn),
      includeUndated: String(filter.includeUndated),
    })}`,
    forecastPageSchema,
    { signal },
  );
  if (
    result.page !== filter.page ||
    result.pageSize !== 50 ||
    (result.items.length > 0 &&
      (result.page - 1) * result.pageSize + result.items.length > result.total)
  )
    throw new Error("Forecast page does not match the requested page.");
  return result;
}
export async function fetchForecastHistory(
  api: ApiClient,
  id: string,
  page: number,
  signal?: AbortSignal,
) {
  const result = await api.request(
    "core",
    `government-forecasts/${encodeURIComponent(id)}/history?${queryString({
      page,
      pageSize: 50,
    })}`,
    forecastHistorySchema(id),
    { signal },
  );
  if (
    result.page !== page ||
    result.pageSize !== 50 ||
    (result.items.length > 0 &&
      (result.page - 1) * result.pageSize + result.items.length > result.total)
  )
    throw new Error("Forecast history does not match the requested page.");
  return result;
}
