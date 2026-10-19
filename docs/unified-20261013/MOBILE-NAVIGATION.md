# Meri phone navigation correction

The first combined browser suite passed284 existing cases at6a2e4ac. Subsequent root review found the new action destination was available only through a sidebar hidden at widths680px and below. Two additive actual-host tests established a genuine baseline: mobile failed because Conversations/action navigation was absent; the existing desktop sidebar case passed.

`MeriMobileNavigation` now composes two adopted Button/Link controls below the shared Header at phone widths. It uses canonical verified-client link helpers and exact current-route state. The desktop sidebar and header retain their original geometry. There is no new transport, authority, automatic connection, action dispatch or draft reset.

The unchanged two-case test passed after the correction. It uses sequential Tab/Enter, verifies current states/client hints on every transition and traverses Back/Back/Forward/Forward. The desktop positive prevents duplicate visible destinations. Both cases assert zero automatic action calls. All original tests remain unchanged. Raw initial failure, trace and green evidence are sealed in `mobile-navigation/MANIFEST.json`.

This is a responsive navigation correction, not Figma acceptance. Required Figma skill discovery returned empty cloud and executor catalogs; no SKILL.md was found in the mounted workspace or temporary roots. No Figma tool was invoked without the required skill. Exact Figma comparison and full accessibility acceptance remain open. Final combined qualification runs anew on the source including this correction.
