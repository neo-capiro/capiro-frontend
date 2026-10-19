# Portfolio Quick Log contract screenshots

These are 1440 × 1040 light-theme Playwright captures with synthetic responses intercepted in browser tests. They demonstrate source wiring and layout; they are not evidence of a deployed Core or Planner integration.

- `direct-rich-1440x1040.png`: direct commitment with direction, counterparty, due date, and a current client Objective. The browser test checks the submitted Objective ID and version, rich Core receipt, and timeline readout.
- `compound-rich-1440x1040.png`: upper portion of a compound commitment and generic Planner follow-up before submission.
- `compound-rich-bottom-1440x1040.png`: lower portion of the same scrollable compound form, including assignee, optional schedule, and save action.
- `compound-result-1440x1040.png`: separate activity and Planner task result after canonical activity verification.

The tests are in `apps/web/tests/browser/figma34-quick-log-contract.spec.ts`.
