'use client';

import { CalendarFeature, FeaturePage } from '@/components/AddedCapabilities';

export default function ModuleCalendarPage() {
  return <FeaturePage title="Calendario del módulo" description="Fechas académicas, entregas, exámenes y reuniones del módulo activo."><CalendarFeature /></FeaturePage>;
}
