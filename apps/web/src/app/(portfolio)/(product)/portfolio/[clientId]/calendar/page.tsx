import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { readConfig } from "@/shared/portfolio/config/config";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return (
    <CalendarPage
      clientId={clientId}
      destinations={readConfig(process.env).destinations}
    />
  );
}
