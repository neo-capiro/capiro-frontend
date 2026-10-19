# Engagement Outreach ownership review

<span id="engagement"></span>

The changed `EngagementScreen` selects only Outreach, rich newsletter and Objective Outreach destinations. Its legacy Meetings and Library branch validates the exact client and meeting selectors, checks the current client list, and links to the client Portfolio calendar. Draft, session and create intents retain precedence over stale view hints. It does not read meeting detail in Modules.

`OutreachView` remains a single route-level owner for the existing draft editor, campaign sessions and read-only list. Its larger module includes bounded date and deleted filters, mutually exclusive campaign groups, and the existing draft form. Client-scoped V3 records are visible but read-only because the session list has no client filter or verified record-to-session selector. The existing form saves drafts only; send remains unavailable pending the reviewed send workflow. The view does not gain a new writer or bypass its existing Core operations.

The independent source review found no remaining imports of removed Engagement-only components or operations. Shared Calendar meetings, meeting artifacts and Portfolio meeting detail remain in their existing owners. Focused unit, browser and TypeScript checks cover the changed behavior; live `os.capiro.ai` was inspected read-only to compare its Outreach list and seven-step campaign wizard. The frontend still lacks the live Client/External direction filter, complete paginated list, and wizard/generate/send contract. Those require separately reviewed Core projections and authority before claiming full parity.
