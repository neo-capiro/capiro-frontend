import {
  parseNewsletterStockImport,
  parseNewsletterStockStatus,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { receiveAssetResponse } from "./rich-newsletter-assets";

const source =
  "capiro-backend@7e7a7ad6 packages/shared/src/newsletter-stock-receiving.ts; apps/workspace/src/newsletters/newsletter-stock-image.controller.ts; apps/workspace/src/newsletters/newsletter-stock-image.service.ts";
export const stockSearchQuery = z
  .object({
    search: z.string().max(100),
    page: z.number().int().min(1).max(10_000),
  })
  .strict();
export type StockSearchQuery = z.infer<typeof stockSearchQuery>;
export const richNewsletterStockOperations = {
  "workspace.richNewsletter.stock.status": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/stock-images/status",
    request: z.object({}).strict(),
    response: receiveAssetResponse(parseNewsletterStockStatus),
    source,
  }),
  "workspace.richNewsletter.stock.search": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/stock-images",
    request: z.object({ query: stockSearchQuery }).strict(),
    // The feature supplies its captured page to the public receiver.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.stock.import": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/stock-images/:id/import",
    request: z
      .object({
        params: z.object({ id: z.string().regex(/^[1-9]\d{0,14}$/) }).strict(),
        body: z.object({}).strict(),
      })
      .strict(),
    response: receiveAssetResponse(parseNewsletterStockImport),
    source,
  }),
} as const;
