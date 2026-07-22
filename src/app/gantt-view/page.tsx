import { redirect } from 'next/navigation';

export default function GanttViewPage() {
  redirect('/module-calendar?view=gantt');
}
