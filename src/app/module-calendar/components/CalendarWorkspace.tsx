'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, GanttChartSquare } from 'lucide-react';
import { FeaturePage, GanttFeature } from '@/components/AddedCapabilities';
import CalendarFeature from './CalendarFeature';

type CalendarView = 'calendar' | 'gantt';

export default function CalendarWorkspace({ initialView }: { initialView: CalendarView }) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>(initialView);

  const selectView = (nextView: CalendarView) => {
    setView(nextView);
    router.replace(`/module-calendar?view=${nextView}`, { scroll: false });
  };

  return (
    <FeaturePage
      title="Calendario del módulo"
      description="Planificación académica, eventos y cronograma del módulo activo."
    >
      <div
        className="mb-5 flex w-fit items-center gap-1 rounded-lg bg-muted/40 p-1"
        aria-label="Vista de planificación temporal"
      >
        <button
          type="button"
          onClick={() => selectView('calendar')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all ${
            view === 'calendar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays size={15} /> Calendario
        </button>
        <button
          type="button"
          onClick={() => selectView('gantt')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all ${
            view === 'gantt'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GanttChartSquare size={15} /> Vista Gantt
        </button>
      </div>

      {view === 'calendar' ? <CalendarFeature /> : <GanttFeature />}
    </FeaturePage>
  );
}
