-- Phase 1 foundation: authenticated ownership and server persistence.
-- Existing rows remain intact and are claimed atomically by the first authenticated user.

CREATE TABLE IF NOT EXISTS public.contents (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES public.work_units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'concepto',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.seat_layouts (
  module_id TEXT PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  rows INTEGER NOT NULL DEFAULT 3 CHECK (rows BETWEEN 1 AND 12),
  columns INTEGER NOT NULL DEFAULT 5 CHECK (columns BETWEEN 1 AND 12),
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, seat_id),
  UNIQUE(module_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.class_groups (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tutor TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.grading_scales (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  passing_grade NUMERIC(4,2) NOT NULL DEFAULT 5 CHECK (passing_grade BETWEEN 0 AND 10),
  late_penalty NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (late_penalty BETWEEN 0 AND 100),
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $phase1$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'modules', 'evaluations', 'learning_outcomes', 'criteria', 'work_units',
    'activities', 'students', 'activity_grades', 'ra_relationships', 'incidents',
    'session_logs', 'tutoring_actions', 'calendar_events'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE',
      table_name
    );
  END LOOP;
END
$phase1$;

CREATE OR REPLACE FUNCTION public.claim_legacy_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  table_name TEXT;
  affected INTEGER;
  total_affected INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- A legacy installation can only be claimed while it has no owner at all.
  IF EXISTS (SELECT 1 FROM public.modules WHERE owner_id IS NOT NULL AND owner_id <> auth.uid()) THEN
    RETURN 0;
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'modules', 'evaluations', 'learning_outcomes', 'criteria', 'work_units',
    'activities', 'students', 'activity_grades', 'ra_relationships', 'incidents',
    'session_logs', 'tutoring_actions', 'calendar_events', 'contents', 'seat_layouts',
    'seat_assignments', 'class_groups', 'grading_scales'
  ]
  LOOP
    EXECUTE format('UPDATE public.%I SET owner_id = $1 WHERE owner_id IS NULL', table_name)
      USING auth.uid();
    GET DIAGNOSTICS affected = ROW_COUNT;
    total_affected := total_affected + affected;
  END LOOP;

  RETURN total_affected;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_legacy_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_legacy_data() TO authenticated;

DO $policies$
DECLARE
  table_name TEXT;
  policy_row RECORD;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'modules', 'evaluations', 'learning_outcomes', 'criteria', 'work_units',
    'activities', 'students', 'activity_grades', 'ra_relationships', 'incidents',
    'session_logs', 'tutoring_actions', 'calendar_events', 'contents', 'seat_layouts',
    'seat_assignments', 'class_groups', 'grading_scales'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOR policy_row IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, table_name);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())',
      'owner_access_' || table_name,
      table_name
    );
  END LOOP;
END
$policies$;

CREATE INDEX IF NOT EXISTS idx_contents_module_id ON public.contents(module_id);
CREATE INDEX IF NOT EXISTS idx_contents_unit_id ON public.contents(unit_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_module_id ON public.seat_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_class_groups_module_id ON public.class_groups(module_id);
CREATE INDEX IF NOT EXISTS idx_grading_scales_module_id ON public.grading_scales(module_id);

DO $indexes$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'modules', 'evaluations', 'learning_outcomes', 'criteria', 'work_units',
    'activities', 'students', 'activity_grades', 'ra_relationships', 'incidents',
    'session_logs', 'tutoring_actions', 'calendar_events'
  ]
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(owner_id)', 'idx_' || table_name || '_owner_id', table_name);
  END LOOP;
END
$indexes$;
