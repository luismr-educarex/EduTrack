'use client';

import { FeaturePage, GradeImportFeature } from '@/components/AddedCapabilities';

export default function GradeImportPage() {
  return <FeaturePage title="Importar calificaciones" description="Validación y aplicación masiva de notas desde CSV o Excel."><GradeImportFeature /></FeaturePage>;
}
