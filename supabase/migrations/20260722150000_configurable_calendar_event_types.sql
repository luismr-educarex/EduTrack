-- Configurable event taxonomy for the academic calendar.
-- Existing enum values are preserved verbatim while allowing user-defined codes.

ALTER TABLE public.calendar_events
  ALTER COLUMN event_type DROP DEFAULT;

ALTER TABLE public.calendar_events
  ALTER COLUMN event_type TYPE TEXT USING event_type::TEXT;

ALTER TABLE public.calendar_events
  ALTER COLUMN event_type SET DEFAULT 'otro',
  ALTER COLUMN event_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.calendar_event_types (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (module_id, code, owner_id)
);

INSERT INTO public.calendar_event_types (id, module_id, code, name, color, sort_order, owner_id)
SELECT
  module.id || '-calendar-type-' || defaults.code,
  module.id,
  defaults.code,
  defaults.name,
  defaults.color,
  defaults.sort_order,
  module.owner_id
FROM public.modules module
CROSS JOIN (VALUES
  ('entrega', 'Entrega', '#2563eb', 10),
  ('examen', 'Examen', '#dc2626', 20),
  ('tutoría', 'Tutoría', '#0891b2', 30),
  ('festivo', 'Festivo oficial', '#e11d48', 40),
  ('reunión', 'Claustro / reunión', '#d97706', 50),
  ('otro', 'Actividad lectiva', '#64748b', 60)
) AS defaults(code, name, color, sort_order)
ON CONFLICT (module_id, code, owner_id) DO NOTHING;

ALTER TABLE public.calendar_event_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access_calendar_event_types ON public.calendar_event_types;
CREATE POLICY owner_access_calendar_event_types
  ON public.calendar_event_types
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_calendar_event_types_module_id
  ON public.calendar_event_types(module_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_types_owner_id
  ON public.calendar_event_types(owner_id);

NOTIFY pgrst, 'reload schema';
