# Portfolio calendar header — desktop comparison

PR236 uses the Figma 3.4 **Month** frame for the common client-calendar header: **Anduril calendar**, the client breadcrumb with its existing view switcher, and **Meetings, preparation, notes and debriefs for Anduril.** Neo subsequently requested that PR be merged and shipped. The existing **Sync calendar**, **Meeting Library**, **New meeting** actions remain in that order across Agenda, Month, Week, and selected meeting detail. Month and Week retain their schedule controls inside the calendar card. Sync opens the existing account review dialog; no new sync operation was added.

| View               | Figma reference                                                                                             | Fixture-backed 1440 × 1040 light screenshot |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Agenda             | [1064:177487](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177487) | [Agenda](agenda-1440x1040.png)              |
| Month              | [1064:179149](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179149) | [Month](month-1440x1040.png)                |
| Week               | [1064:179266](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179266) | [Week](week-1440x1040.png)                  |
| Preparation detail | [1064:177692](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177692) | [Prep](prep-1440x1040.png)                  |
| Debrief detail     | [1064:177734](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177734) | [Debrief](debrief-1440x1040.png)            |
| Meeting Library    | [1064:177776](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177776) | [Library](library-1440x1040.png)            |

The Month and Agenda Figma frames disagree on header labels and action count. The approved PR236 decision uses the Month labels and breadcrumb while preserving the existing three actions; the frames still need design reconciliation. Meeting Library remains its own archive destination with a back action; its internal heading is not a client calendar view. The focused browser check verifies the breadcrumb switcher separately from the three action buttons, opens Sync review and New meeting from Month without dispatching a write, and opens the Meeting Library. Synthetic fixture checks do not qualify live calendar connections or deployment.
