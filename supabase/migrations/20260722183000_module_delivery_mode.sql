ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'in_person';

ALTER TABLE public.modules
  DROP CONSTRAINT IF EXISTS modules_delivery_mode_check;

ALTER TABLE public.modules
  ADD CONSTRAINT modules_delivery_mode_check
  CHECK (delivery_mode IN ('in_person', 'online'));

COMMENT ON COLUMN public.modules.delivery_mode IS
  'Modalidad del módulo: in_person usa la navegación de EduTrack y online usa la navegación de EduCode.';
