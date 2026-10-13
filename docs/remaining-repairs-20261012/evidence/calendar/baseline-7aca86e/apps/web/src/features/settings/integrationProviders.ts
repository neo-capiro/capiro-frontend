export const integrationProviders = [
  {
    id: "microsoft_365",
    title: "Microsoft 365",
    description: "Graph calendar and mail normalization.",
  },
  {
    id: "google_workspace",
    title: "Google Workspace",
    description: "Gmail and Google Calendar normalization.",
  },
  {
    id: "imap_caldav",
    title: "IMAP / CalDAV",
    description: "Fallback mail and calendar ingestion.",
  },
] as const;
