# Saved rich newsletter lifecycle

Implementation outline (13 October 2026): the existing rich editor owns local
draft/history and presentation. A feature-local document controller will own
explicit list/create/open, full CAS save, saved preview and stage attempts through
the shared `createRichNewsletterAdapter`. Public newsletter types/parsers remain
the sole wire owner; saved-version/OutreachV3 work stays separate. The React
binding uses the existing Capiro session lifetime and disposes all private state,
pending work and late completions on replacement. No owner request runs on mount.

The feature-owned write journal uses the canonical `DataProvider` QueryClient,
keyed `modules / rich-newsletter / write-journal`, with infinite inactive lifetime,
no retries and the disabled `skipToken` sentinel instead of a query function. It
stores attempt IDs/status and document/revision pairs only. Drafts, response bodies,
preview HTML and review candidates remain view-local. Synchronous pending entries
precede transport; unmount aborts observation and retains unknown attempts. Closing
and reopening in the same scope cannot repeat unknown create or the same revision's
stage attempt. The existing actor/session/org/client boundary clears this journal;
no shared provider, backend authority, global or durable storage is introduced.

One explicit action runs at a time and locks edits during dispatch. Failed writes
retain the local draft and an uncertainty/conflict fence. Explicit owner readback
produces a review candidate; separate Adopt saved or Rebase local intent resumes
work without attributing current state to the lost attempt. Unknown creation
cannot be retried from an empty list. Unknown staging remains blocked for that
document/revision even after readback: the eight operations cannot recover its
missing stage ID. Only a later confirmed saved revision permits a new stage intent.
Returned stage routes are displayed as receipt data and never navigated or opened.

Saved preview reuses the existing inert, sanitized HTML display and makes no
document/revision receipt claim. Unsupported collaboration, assets, generation,
account/invitation management and delivery remain visibly unavailable. Unit tests
exercise duplicate actions, frozen submitted drafts, conflict preservation,
deliberate readback/adoption, failed current reads, stage fences, same-cache view
replacement and new-scope disposal in both cleanup orders. Reentrant journal
notifications cannot restore material after disposal. Explicit adoption/rebase can
review an unknown save; it never clears unknown creation or stage causation fences.
Browser/server/install/build and native calls are outside this lane's current lease.
