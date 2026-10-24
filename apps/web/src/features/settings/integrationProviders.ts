export const integrationProviders = [
  {
    id: "microsoft_365",
    title: "Microsoft 365",
    description:
      "Mail and calendar for Microsoft 365 work or school accounts with an Exchange Online mailbox.",
  },
  {
    id: "google_workspace",
    title: "Gmail / Google Workspace",
    description:
      "Gmail and Google Calendar for eligible Google accounts. Administrator and consent restrictions may apply.",
  },
  {
    id: "imap_caldav",
    title: "IMAP / CalDAV",
    description:
      "Not supported. No mail or calendar ingestion adapter is available.",
  },
] as const;
