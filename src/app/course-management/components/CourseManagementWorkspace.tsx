'use client';

import { useState } from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { CourseManagementFeature } from '@/components/AddedCapabilities';
import CalendarTypeSettings from './CalendarTypeSettings';

export default function CourseManagementWorkspace() {
  const [tab, setTab] = useState<'academic' | 'calendar'>('academic');

  return (
    <div className="space-y-5">
      <div className="flex w-fit items-center gap-1 rounded-lg bg-muted/40 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'academic'}
          onClick={() => setTab('academic')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium ${tab === 'academic' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
        >
          <GraduationCap size={15} /> Gestión académica
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'calendar'}
          onClick={() => setTab('calendar')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium ${tab === 'calendar' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
        >
          <CalendarDays size={15} /> Calendario
        </button>
      </div>
      {tab === 'academic' ? <CourseManagementFeature /> : <CalendarTypeSettings />}
    </div>
  );
}
