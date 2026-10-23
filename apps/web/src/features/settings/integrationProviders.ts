export const integrationProviders = [
  {
    id: "microsoft_365",
    title: "Microsoft 365",
    description:
      "Microsoft 365 work or school accounts. Personal Microsoft accounts are not supported by the current configuration.",
  },
  {
    id: "google_workspace",
    title: "Google Workspace",
    description:
      "Gmail and Google Workspace mail and calendar, subject to the configured OAuth application's account eligibility and administrator policy.",
  },
  {
    id: "imap_caldav",
    title: "IMAP / CalDAV",
    description: "Unsupported mail and calendar provider.",
  },
] as const;
