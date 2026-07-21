-- Criterion-based grading: rubric items are the atomic source of every grade.

CREATE TABLE IF NOT EXISTS public.criterion_grading_configs (
  module_id TEXT PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  basic_weight NUMERIC(6,2) NOT NULL DEFAULT 3 CHECK (basic_weight > 0),
  medium_weight NUMERIC(6,2) NOT NULL DEFAULT 2 CHECK (medium_weight > 0),
  advanced_weight NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (advanced_weight > 0),
  passing_threshold NUMERIC(4,2) NOT NULL DEFAULT 5 CHECK (passing_threshold BETWEEN 0 AND 10),
  aggregation_mode TEXT NOT NULL DEFAULT 'moving_average' CHECK (aggregation_mode IN ('weighted_average', 'latest', 'moving_average')),
  implication_mode TEXT NOT NULL DEFAULT 'minimum' CHECK (implication_mode IN ('disabled', 'minimum', 'inherit')),
  ra_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4.5 CHECK (ra_cutoff BETWEEN 0 AND 10),
  partial_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4.5 CHECK (partial_cutoff BETWEEN 0 AND 10),
  final_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4 CHECK (final_cutoff BETWEEN 0 AND 10),
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.criterion_implications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  source_criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  target_criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  justification TEXT NOT NULL DEFAULT '',
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_criterion_id <> target_criterion_id),
  UNIQUE(module_id, source_criterion_id, target_criterion_id)
);

CREATE TABLE IF NOT EXISTS public.rubric_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  item_weight NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (item_weight > 0),
  levels JSONB NOT NULL DEFAULT '[{"label":"Insuficiente","score":3,"descriptor":"No alcanza el indicador"},{"label":"Suficiente","score":5,"descriptor":"Alcanza lo esencial"},{"label":"Notable","score":7.5,"descriptor":"Dominio adecuado"},{"label":"Sobresaliente","score":10,"descriptor":"Dominio excelente"}]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.rubric_item_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.rubric_items(id) ON DELETE CASCADE,
  score NUMERIC(4,2) CHECK (score BETWEEN 0 AND 10),
  not_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (not_applicable OR score IS NOT NULL),
  UNIQUE(student_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_criterion_implications_module ON public.criterion_implications(module_id);
CREATE INDEX IF NOT EXISTS idx_criterion_implications_source ON public.criterion_implications(source_criterion_id);
CREATE INDEX IF NOT EXISTS idx_criterion_implications_target ON public.criterion_implications(target_criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_activity ON public.rubric_items(activity_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_criterion ON public.rubric_items(criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_item_grades_student ON public.rubric_item_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_rubric_item_grades_item ON public.rubric_item_grades(item_id);

CREATE OR REPLACE FUNCTION public.reject_criterion_implication_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT target_criterion_id
      FROM public.criterion_implications
      WHERE source_criterion_id = NEW.target_criterion_id AND id <> NEW.id
      UNION
      SELECT edge.target_criterion_id
      FROM public.criterion_implications edge
      JOIN reachable path ON edge.source_criterion_id = path.id
      WHERE edge.id <> NEW.id
    )
    SELECT 1 FROM reachable WHERE id = NEW.source_criterion_id
  ) THEN
    RAISE EXCEPTION 'La implicación crearía un ciclo entre criterios';
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS criterion_implications_acyclic ON public.criterion_implications;
CREATE TRIGGER criterion_implications_acyclic
BEFORE INSERT OR UPDATE ON public.criterion_implications
FOR EACH ROW EXECUTE FUNCTION public.reject_criterion_implication_cycle();

DO $policies$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'criterion_grading_configs', 'criterion_implications', 'rubric_items', 'rubric_item_grades'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'owner_access_' || table_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())',
      'owner_access_' || table_name, table_name
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(owner_id)', 'idx_' || table_name || '_owner_id', table_name);
  END LOOP;
END
$policies$;

-- Seed the recommended departmental defaults without overwriting later choices.
INSERT INTO public.criterion_grading_configs (module_id, owner_id)
SELECT id, owner_id FROM public.modules
ON CONFLICT (module_id) DO NOTHING;

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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM public.modules WHERE owner_id IS NOT NULL AND owner_id <> auth.uid()) THEN RETURN 0; END IF;
  FOREACH table_name IN ARRAY ARRAY[
    'modules', 'evaluations', 'learning_outcomes', 'criteria', 'work_units',
    'activities', 'students', 'activity_grades', 'ra_relationships', 'incidents',
    'session_logs', 'tutoring_actions', 'calendar_events', 'contents', 'seat_layouts',
    'seat_assignments', 'class_groups', 'grading_scales', 'criterion_grading_configs',
    'criterion_implications', 'rubric_items', 'rubric_item_grades'
  ] LOOP
    EXECUTE format('UPDATE public.%I SET owner_id = $1 WHERE owner_id IS NULL', table_name) USING auth.uid();
    GET DIAGNOSTICS affected = ROW_COUNT;
    total_affected := total_affected + affected;
  END LOOP;
  RETURN total_affected;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_legacy_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_legacy_data() TO authenticated;
