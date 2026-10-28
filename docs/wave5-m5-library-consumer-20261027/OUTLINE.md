# Durable Files consumer outline

Base e3d11dc1 composes merged FE2146 with the reviewed Wave5 MF19/packages, preserving all Wave4 code. The separate composed-module review keeps this base frozen. This continuation owns only the allocated Meri Files host/components/shared document adapters, relevant tests and canonical fresh-package consumer bindings.

Use installed public document-access0.2.0 through the existing meri-client facade. One HTTP transport/proxy owns list/history/inspect/download; metadata rows never acquire an inspection/download brand. List pagination keeps scope/limit/context fixed, follows even empty pages with nextCursor and ends only at null. History correlates its anchor/head/parent chain across pages. Clear rows/bytes/object URLs synchronously on lifetime/client/account/selection changes; no stale async release.

Cold library connection must use an existing current-authorized saved conversation/run via canonical conversation-history/session owners, never reserve a new model turn. Original-origin selection obtains that origin's session for inspect/history/download. General and selected-client scopes remain explicit; rows themselves are selectors, not authority. URLs carry only canonical IDs/scope, no source text, credentials or byte links.

Keep create/revise editor and unknown-write fences under their existing owner. Library detail uses truthful structural inspection and current verified signed-link downloads. Native preview awaits A5's separate receiver/qualified renderer cohort; no fake rendered status. Share/comment/delete/rename remain unavailable until their owners exist.

Focused meaningful checks: fixed proxy/public route admission, current-origin session choice with no allocation, empty continuations, multi-page history correlation, identity/scope changes, denied/expired result clearing and stale asynchronous reads, existing signed-link bytes. No spacing mirrors, browser/build/model/target operation. The reviewed producer28afcb3e is now packed once as immutable contracts0.1.23/UI0.1.10 and bound by parent b8dc6576; physical archive/consumer binding review remains separate. No private imports or old-archive relabel.
