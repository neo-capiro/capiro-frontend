import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { readConfig } from "@/shared/portfolio/config/config";
export default function Page() {
  const { destinations } = readConfig(process.env);
  return (
    <Shell destinations={destinations}>
      <CalendarPage destinations={destinations} />
    </Shell>
  );
}
