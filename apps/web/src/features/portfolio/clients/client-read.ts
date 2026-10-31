"use client";
/**
 * The canonical client-detail read now lives on the shared boundary
 * (`@/shared/portfolio/api/client-read`), because the foundations layer
 * (`shared/session/SelectedClient`) must use the SAME producer and receipt checks and may not
 * import a feature module. This file stays as the feature-facing entry so existing imports
 * (catalogue, profile, intake, capabilities) keep working unchanged.
 */
export * from "@/shared/portfolio/api/client-read";
