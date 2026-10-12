# Shared initialization and dialog repair

The frozen `e1bcf60` result remains failed (880 passed, two failed). This candidate
starts from its preserved terminal evidence; no old result is replaced.

The common Next root now awaits `connection()` before reading server environment
configuration. This follows the installed Next 16 runtime-environment guide and
prevents direct Meri entry from serving a build-time undefined publishable key.
The actual standalone gate imports an artifact assertion covering every shared
entry; it fails against the frozen production build. It emits route names only,
never the prerender manifest's generated preview keys. No synthetic/provider
credential is needed for this regression, and live auth remains unverified.

Original shared dialog layout cases reproduced four failures in forty runs.
A temporary diagnostic copy then reproduced two failures in twelve desktop cases.
Native events show that the actual dialog overlay received the outside click,
while the corresponding Radix document pointer listener attached 18–56 ms later
in the captured failures. The original tests were not slowed or weakened.

The shared Portfolio Dialog now uses a cohesive overlay-dismissal hook installed
in a layout effect. It accepts only a primary, non-control click on the top open
canonical overlay and its top open dialog. Handled events cannot cascade through
parent dialogs. Visible portalled popups keep their own Radix layer handling;
right/control gestures, content clicks and arbitrary outside elements are ignored.
The existing caller's onOpenChange still owns pending-write refusal. Radix retains
focus, portal, scroll, keyboard and popup behavior; upstream package source and
provenance stay unchanged. Forty original layout repeats passed after the repair.
Nested/context-gesture coverage is an additional independent behavioral check.

The diagnostic test is preserved as text/evidence, with native event attachments
and failed traces. It is removed from the active test tree after diagnosis; no
instrumentation ships. The new hook owns only overlay input lifetime and remains
below the repository review thresholds. Root layout remains thin and delegates
auth/session semantics to the existing shared boundary.

The added nested/context-gesture test initially failed focus return in all three
repeats. Controlled dialog callers need not render a Radix Trigger, so the shared
wrapper now captures the opening element and restores it when still connected,
unless the caller prevented its close-focus event. The original callback is
preserved. The final combined focused run passed 36/36 (24 original layout cases
and 12 nested/uncertain-send cases). No provider message was sent.
