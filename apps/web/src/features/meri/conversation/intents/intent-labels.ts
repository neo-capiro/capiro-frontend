/**
 * The person's name for every request Meri can prepare, keyed by the catalog's operation id
 * (`apps/worker/conversation/intents/catalog.mjs` INTENT_ROWS in neo-capiro/meri-greenfield). The
 * conversation card, the Approvals inbox and the Research Portfolio detail fields all read this one
 * map, so the same request is called the same thing everywhere. An id outside the catalog reads as
 * words rather than an identifier.
 */
export const INTENT_OPERATION_LABELS: Readonly<Record<string, string>> =
  Object.freeze({
    save_note: "Save a note",
    watch_action: "Change a watch",
    create_client: "Create a client",
    update_client_profile: "Update a client profile",
    save_legiwatch_relevance: "Save a LegiWatch relevance suggestion",
    mail_send: "Send an email",
    send_mail: "Send an email",
    apply_legiwatch_suggestion: "Apply a LegiWatch suggestion",
    save_business_development_brief: "Save a business-development brief",
    prepare_legiwatch_briefing: "Prepare a legislative briefing",
    save_legislative_research: "Save legislative research",
    publish_research_portfolio_share_link: "Share a Research Portfolio",
    revoke_research_portfolio_share_link:
      "Revoke a Research Portfolio share link",
    manage_research_portfolio: "Research Portfolio management action",
    create_research_portfolio_snapshot: "Research Portfolio snapshot",
    request_research_portfolio_output: "Research Portfolio CSV output",
    save_research_portfolio_output_to_client:
      "Save a Research Portfolio output to Client Files",
    watch_research_portfolio: "Research Portfolio watch",
    update_research_portfolio_change_state: "Research Portfolio change state",
    create_research_portfolio_bookmark: "Research Portfolio bookmark",
    add_research_portfolio_review_note: "Research Portfolio review note",
    prepare_research_portfolio_brief: "Research Portfolio brief draft",
    prepare_research_portfolio_meeting: "Research Portfolio meeting draft",
    create_word: "Prepare a document",
    create_excel: "Prepare a spreadsheet",
    create_powerpoint: "Prepare a presentation",
    request_document: "Prepare a document",
    propose_office_edit: "Edit an Office document",
    run_analysis: "Prepare an analysis",
    request_analysis: "Prepare an analysis",
    schedule_task: "Schedule a routine",
    update_scheduled_task: "Update a routine",
    cancel_scheduled_task: "Cancel a routine",
    create_task: "Create a task",
    update_task: "Update a task",
    save_memory: "Save to memory",
    save_chat_attachments: "File chat attachments",
    browser_action: "Browser action",
  });

/** A readable title for an operation id the map does not know: words, not an identifier. */
const readable = (id: string) =>
  id.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export const intentOperationLabel = (id: string): string =>
  INTENT_OPERATION_LABELS[id] ?? readable(id);
