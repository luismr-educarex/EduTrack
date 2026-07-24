-- Keep module creation and its dependent CRUD operations consistent on every
-- environment, including databases that have not applied the project tables.
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'in_person';

ALTER TABLE public.modules
  DROP CONSTRAINT IF EXISTS modules_delivery_mode_check;

ALTER TABLE public.modules
  ADD CONSTRAINT modules_delivery_mode_check
  CHECK (delivery_mode IN ('in_person', 'online', 'intermodular'));

COMMENT ON COLUMN public.modules.delivery_mode IS
  'Module workflow: in_person uses EduTrack, online uses EduCodeCheck and intermodular uses EduProyectosCheck.';

NOTIFY pgrst, 'reload schema';
