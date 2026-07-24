-- Project-based workflow used by intermodular modules.
ALTER TABLE public.modules
  DROP CONSTRAINT IF EXISTS modules_delivery_mode_check;

ALTER TABLE public.modules
  ADD CONSTRAINT modules_delivery_mode_check
  CHECK (delivery_mode IN ('in_person', 'online', 'intermodular'));

COMMENT ON COLUMN public.modules.delivery_mode IS
  'Module workflow: in_person uses EduTrack, online uses EduCodeCheck and intermodular uses EduProyectosCheck.';

CREATE TABLE IF NOT EXISTS public.project_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  learning_outcome TEXT NOT NULL DEFAULT '',
  weight NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 100),
  delivery_type TEXT NOT NULL DEFAULT 'Documentación',
  start_date DATE,
  end_date DATE,
  rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.project_deliveries(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  call TEXT NOT NULL DEFAULT 'ordinaria' CHECK (call IN ('ordinaria', 'extraordinaria')),
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'entregado', 'en_revision', 'corregido')),
  grade NUMERIC(4,2) CHECK (grade IS NULL OR grade BETWEEN 0 AND 10),
  feedback TEXT NOT NULL DEFAULT '',
  correction_mode TEXT NOT NULL DEFAULT 'manual' CHECK (correction_mode IN ('manual', 'ia')),
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  criterion_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at DATE,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(delivery_id, student_id, call)
);

CREATE TABLE IF NOT EXISTS public.project_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.project_deliveries(id) ON DELETE SET NULL,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  observation_type TEXT NOT NULL DEFAULT 'mejora',
  text TEXT NOT NULL,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_deliveries_module
  ON public.project_deliveries(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_corrections_module
  ON public.project_corrections(module_id, call);
CREATE INDEX IF NOT EXISTS idx_project_corrections_student
  ON public.project_corrections(student_id);
CREATE INDEX IF NOT EXISTS idx_project_observations_student
  ON public.project_observations(student_id, observation_date DESC);

ALTER TABLE public.project_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_access_project_deliveries ON public.project_deliveries;
CREATE POLICY owner_access_project_deliveries ON public.project_deliveries
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS owner_access_project_corrections ON public.project_corrections;
CREATE POLICY owner_access_project_corrections ON public.project_corrections
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS owner_access_project_observations ON public.project_observations;
CREATE POLICY owner_access_project_observations ON public.project_observations
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
