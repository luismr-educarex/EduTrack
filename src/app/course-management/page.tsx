'use client';

import { FeaturePage } from '@/components/AddedCapabilities';
import CourseManagementWorkspace from './components/CourseManagementWorkspace';

export default function CourseManagementPage() {
  return (
    <FeaturePage
      title="Configuración"
      description="Gestiona la estructura académica y las preferencias del módulo activo."
    >
      <CourseManagementWorkspace />
    </FeaturePage>
  );
}
