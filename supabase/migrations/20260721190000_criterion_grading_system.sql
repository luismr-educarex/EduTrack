-- Criterion-based grading: rubric items are the atomic source of every grade.

CREATE TABLE IF NOT EXISTS public.criterion_grading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  basic_weight NUMERIC(6,2) NOT NULL DEFAULT 3 CHECK (basic_weight > 0),
  medium_weight NUMERIC(6,2) NOT NULL DEFAULT 2 CHECK (medium_weight > 0),
  advanced_weight NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (advanced_weight > 0),
  passing_threshold NUMERIC(4,2) NOT NULL DEFAULT 5 CHECK (passing_threshold BETWEEN 0 AND 10),
  aggregation_mode TEXT NOT NULL DEFAULT 'moving_average' CHECK (aggregation_mode IN ('weighted_average', 'latest', 'moving_average')),
  recovery_aggregation_mode TEXT NOT NULL DEFAULT 'latest' CHECK (recovery_aggregation_mode IN ('weighted_average', 'latest', 'moving_average')),
  implication_mode TEXT NOT NULL DEFAULT 'minimum' CHECK (implication_mode IN ('disabled', 'minimum', 'inherit')),
  cutoff_active BOOLEAN NOT NULL DEFAULT TRUE,
  ra_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4.5 CHECK (ra_cutoff BETWEEN 0 AND 10),
  partial_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4.5 CHECK (partial_cutoff BETWEEN 0 AND 10),
  final_cutoff NUMERIC(4,2) NOT NULL DEFAULT 4 CHECK (final_cutoff BETWEEN 0 AND 10),
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, academic_year)
);

CREATE TABLE IF NOT EXISTS public.criterion_implications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  source_criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  target_criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'M' CHECK (level IN ('H', 'M', 'I')),
  source TEXT,
  justification TEXT NOT NULL CHECK (length(trim(justification)) > 0),
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
  levels JSONB NOT NULL DEFAULT '[{"label":"Insuficiente","score":0,"descriptor":"No alcanza el indicador evaluado"},{"label":"Suficiente","score":5,"descriptor":"Alcanza los elementos esenciales"},{"label":"Notable","score":7.5,"descriptor":"Muestra un dominio adecuado y autónomo"},{"label":"Sobresaliente","score":10,"descriptor":"Demuestra un dominio excelente, autónomo y transferible"}]'::jsonb,
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
  CHECK ((not_applicable AND score IS NULL) OR (NOT not_applicable AND score IS NOT NULL)),
  UNIQUE(student_id, item_id)
);

ALTER TABLE public.criteria ADD COLUMN IF NOT EXISTS direct_evidence_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_recovery BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_globalizing BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.criterion_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('direct', 'implicit')),
  source_criterion_id TEXT REFERENCES public.criteria(id) ON DELETE SET NULL,
  implication_level TEXT CHECK (implication_level IN ('H', 'M')),
  value NUMERIC(4,2) NOT NULL CHECK (value BETWEEN 0 AND 10),
  evidence_weight NUMERIC(8,2) NOT NULL CHECK (evidence_weight > 0),
  evidence_date TIMESTAMPTZ NOT NULL,
  recovery BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, criterion_id, activity_id, evidence_type)
);

CREATE TABLE IF NOT EXISTS public.activity_templates (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  rubric_items JSONB NOT NULL DEFAULT '[]',
  content JSONB NOT NULL DEFAULT '{}',
  validated BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  pending_criterion_ids TEXT[] NOT NULL,
  activities JSONB NOT NULL,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.grading_graph_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  reason TEXT NOT NULL,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, payload)
);

CREATE TABLE IF NOT EXISTS public.grading_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_criterion_implications_module ON public.criterion_implications(module_id);
CREATE INDEX IF NOT EXISTS idx_criterion_implications_source ON public.criterion_implications(source_criterion_id);
CREATE INDEX IF NOT EXISTS idx_criterion_implications_target ON public.criterion_implications(target_criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_activity ON public.rubric_items(activity_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_criterion ON public.rubric_items(criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_item_grades_student ON public.rubric_item_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_rubric_item_grades_item ON public.rubric_item_grades(item_id);
CREATE INDEX IF NOT EXISTS idx_criterion_evidence_lookup ON public.criterion_evidence(student_id, criterion_id, evidence_date);
CREATE INDEX IF NOT EXISTS idx_activity_templates_module ON public.activity_templates(module_id, validated);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_student ON public.recovery_plans(student_id, academic_year);

CREATE OR REPLACE FUNCTION public.reject_criterion_implication_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.level = 'I' THEN RETURN NEW; END IF;
  IF EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT target_criterion_id
      FROM public.criterion_implications
      WHERE source_criterion_id = NEW.target_criterion_id AND id <> NEW.id
        AND level IN ('H', 'M')
      UNION
      SELECT edge.target_criterion_id
      FROM public.criterion_implications edge
      JOIN reachable path ON edge.source_criterion_id = path.id
      WHERE edge.id <> NEW.id
        AND edge.level IN ('H', 'M')
    )
    SELECT 1 FROM reachable WHERE id = NEW.source_criterion_id
  ) THEN
    RAISE EXCEPTION 'La implicación crearía un ciclo entre criterios';
  END IF;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.refresh_direct_evidence_requirement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
  UPDATE public.criteria criterion
  SET direct_evidence_required = NOT EXISTS (
    SELECT 1 FROM public.criterion_implications edge
    WHERE edge.target_criterion_id = criterion.id AND edge.level IN ('H', 'M')
  )
  WHERE EXISTS (
    SELECT 1 FROM public.learning_outcomes outcome
    WHERE outcome.id = criterion.ra_id AND outcome.module_id = COALESCE(NEW.module_id, OLD.module_id)
  );
  RETURN COALESCE(NEW, OLD);
END
$function$;

DROP TRIGGER IF EXISTS refresh_direct_evidence_requirement ON public.criterion_implications;
CREATE TRIGGER refresh_direct_evidence_requirement
AFTER INSERT OR UPDATE OR DELETE ON public.criterion_implications
FOR EACH ROW EXECUTE FUNCTION public.refresh_direct_evidence_requirement();

CREATE OR REPLACE FUNCTION public.audit_grading_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  INSERT INTO public.grading_audit_log(table_name, row_id, operation, old_data, new_data, owner_id)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text), TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  RETURN COALESCE(NEW, OLD);
END
$function$;

DROP TRIGGER IF EXISTS audit_criterion_grading_configs ON public.criterion_grading_configs;
CREATE TRIGGER audit_criterion_grading_configs AFTER INSERT OR UPDATE OR DELETE ON public.criterion_grading_configs
FOR EACH ROW EXECUTE FUNCTION public.audit_grading_change();
DROP TRIGGER IF EXISTS audit_criterion_implications ON public.criterion_implications;
CREATE TRIGGER audit_criterion_implications AFTER INSERT OR UPDATE OR DELETE ON public.criterion_implications
FOR EACH ROW EXECUTE FUNCTION public.audit_grading_change();

DROP TRIGGER IF EXISTS criterion_implications_acyclic ON public.criterion_implications;
CREATE TRIGGER criterion_implications_acyclic
BEFORE INSERT OR UPDATE ON public.criterion_implications
FOR EACH ROW EXECUTE FUNCTION public.reject_criterion_implication_cycle();

DO $policies$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'criterion_grading_configs', 'criterion_implications', 'rubric_items', 'rubric_item_grades',
    'criterion_evidence', 'activity_templates', 'recovery_plans', 'grading_graph_rejections'
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
INSERT INTO public.criterion_grading_configs (module_id, academic_year, owner_id)
SELECT id, '2025-2026', owner_id FROM public.modules
ON CONFLICT (module_id, academic_year) DO NOTHING;

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
    'criterion_implications', 'rubric_items', 'rubric_item_grades', 'criterion_evidence',
    'activity_templates', 'recovery_plans', 'grading_graph_rejections'
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
