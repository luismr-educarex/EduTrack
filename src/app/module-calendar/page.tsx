import CalendarWorkspace from './components/CalendarWorkspace';

export default async function ModuleCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  return <CalendarWorkspace initialView={params.view === 'gantt' ? 'gantt' : 'calendar'} />;
}
