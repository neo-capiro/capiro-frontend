import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { ObjectiveCalendarDestination } from "@/features/portfolio/calendar/ObjectiveCalendarDestination";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { readConfig } from "@/shared/portfolio/config/config";
export default function Page() {
  const { destinations } = readConfig(process.env);
  return (
    <Shell destinations={destinations}>
      <ObjectiveCalendarDestination>
        <CalendarPage destinations={destinations} />
      </ObjectiveCalendarDestination>
    </Shell>
  );
}
