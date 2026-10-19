import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { ObjectiveCalendarDestination } from "@/features/portfolio/calendar/ObjectiveCalendarDestination";
import { ObjectiveMeetingDestination } from "@/features/portfolio/calendar/ObjectiveMeetingDestination";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <ObjectiveCalendarDestination expectedClientId={clientId}>
      <ObjectiveMeetingDestination expectedClientId={clientId}>
        <CalendarPage
          clientId={clientId}
          destinations={readConfig(process.env).destinations}
        />
      </ObjectiveMeetingDestination>
    </ObjectiveCalendarDestination>
  );
}
