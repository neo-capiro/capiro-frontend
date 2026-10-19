# Portfolio pipeline desktop check

- Figma frame: [Portfolio pipeline overlay `1064:156172`](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-%E2%80%94-Portfolio?node-id=1064-156172), native 1440 × 1040 render in [`../../figma/portfolio-pipeline-overlay-1064-156172.png`](../../figma/portfolio-pipeline-overlay-1064-156172.png).
- App route: `/portfolio?type=PROSPECT&pipeline=1`. The overlay is mounted by the production Portfolio index and reads the existing Business Development prospect and stage-catalog APIs. The screenshot uses browser-test API responses only. The original `/portfolio/prospects?pipeline=1` entry remains available over the Business Development page.
- Browser evidence: [`pipeline-desktop.png`](figma34-portfolio-pipeline-cda29-ource-backed-prospect-cards/pipeline-desktop.png). The focused test asserts dialog x=80/y=110/1280 × 554, 240px lanes at 252px pitch, and the first card x=117/y=277. It opens the real stage editor without writing to the API.

## Frame-to-route result

| Frame element           | Figma target                                     | Rendered result                                                                                                     |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Dialog                  | x=80, y=110, 1280 × 554                          | Within 2px on all four measurements                                                                                 |
| Header / board / footer | 84 / 420 / 50px                                  | Same stacked heights                                                                                                |
| Stage board             | Seven 240px lanes, 12px gaps                     | Same geometry, horizontal scroll; existing stage transitions remain capability gated                                |
| Prospect cards          | Organization, context, owner, 6 × 18 drag handle | Uses actual prospect fields and resolved member names; link and stage editor remain live                            |
| Header metric           | Weighted value and trailing win rate             | Explicit unavailable text; current list contract has no value or win-rate fields                                    |
| Backdrop                | `/portfolio` Prospects view                      | The new Portfolio index entry opens over the Prospects view; the older Business Development entry remains available |

The matching local Figma assets `411-44335-imgDragHandle.svg` and `411-44335-imgEllipse.svg` render at their root sizes, 6 × 18 and 7 × 7 respectively. The live Figma asset host returned CONNECT 403, so byte identity with its temporary export could not be checked; the named local assets match the design layers' geometry and colors.

Neo should provide desktop mocks for stage-catalog unavailable, partial list, error, and long-card states. The current capability checks and partial-count notice are retained until those states are designed.
