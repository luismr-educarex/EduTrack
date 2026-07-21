-- Repair legacy installations where the core migration recreated enum types
-- while the corresponding tables already existed. DROP TYPE ... CASCADE removes
-- their dependent columns, and CREATE TABLE IF NOT EXISTS cannot add them back.

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS eval_type public.eval_type NOT NULL DEFAULT 'parcial';

ALTER TABLE public.criteria
  ADD COLUMN IF NOT EXISTS difficulty public.difficulty_level NOT NULL DEFAULT 'medio';

ALTER TABLE public.work_units
  ADD COLUMN IF NOT EXISTS unit_status public.unit_status NOT NULL DEFAULT 'pendiente';

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_status public.activity_status NOT NULL DEFAULT 'borrador';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS risk_level public.risk_level NOT NULL DEFAULT 'none';

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS incident_type public.incident_type NOT NULL DEFAULT 'observación';

ALTER TABLE public.tutoring_actions
  ADD COLUMN IF NOT EXISTS tutoring_type public.tutoring_type NOT NULL DEFAULT 'observación';

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS event_type public.event_type NOT NULL DEFAULT 'otro';

NOTIFY pgrst, 'reload schema';
