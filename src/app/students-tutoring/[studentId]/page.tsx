'use client';

import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import StudentDetailContent from './components/StudentDetailContent';

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  return <AppLayout><StudentDetailContent studentId={params.studentId} /></AppLayout>;
}
