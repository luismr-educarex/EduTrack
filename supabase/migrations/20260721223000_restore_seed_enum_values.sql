-- Restore the known demo values after 20260721220000 recreated enum columns.
-- Only canonical seed identifiers are touched; user-created rows keep safe defaults.

UPDATE public.evaluations target SET eval_type = source.value::public.eval_type
FROM (VALUES ('eval-1', 'parcial'), ('eval-2', 'parcial')) source(id, value)
WHERE target.id = source.id;

UPDATE public.criteria target SET difficulty = source.value::public.difficulty_level
FROM (VALUES
  ('ce-1a','básico'),('ce-1b','medio'),('ce-1c','medio'),('ce-1d','medio'),('ce-1e','avanzado'),
  ('ce-2a','básico'),('ce-2b','medio'),('ce-2c','medio'),('ce-2d','avanzado'),('ce-2e','medio'),
  ('ce-3a','básico'),('ce-3b','medio'),('ce-3c','avanzado'),('ce-3d','medio'),('ce-3e','medio'),
  ('ce-4a','básico'),('ce-4b','avanzado'),('ce-4c','avanzado'),('ce-4d','medio'),
  ('ce-5a','medio'),('ce-5b','avanzado'),('ce-5c','avanzado')
) source(id, value) WHERE target.id = source.id;

UPDATE public.work_units target SET unit_status = source.value::public.unit_status
FROM (VALUES ('ut-1','impartida'),('ut-2','impartida'),('ut-3','en_curso'),('ut-4','pendiente'),('ut-5','pendiente')) source(id, value)
WHERE target.id = source.id;

UPDATE public.activities target SET activity_status = source.value::public.activity_status
FROM (VALUES
  ('act-1','cerrada'),('act-2','cerrada'),('act-3','cerrada'),('act-4','revisada_docente'),
  ('act-5','pendiente_revision'),('act-6','en_correccion'),('act-7','en_correccion'),
  ('act-8','borrador'),('act-9','borrador'),('act-10','borrador')
) source(id, value) WHERE target.id = source.id;

UPDATE public.students target SET risk_level = source.value::public.risk_level
FROM (VALUES
  ('stu-1','none'),('stu-2','none'),('stu-3','high'),('stu-4','low'),('stu-5','high'),
  ('stu-6','none'),('stu-7','low'),('stu-8','none'),('stu-9','medium'),('stu-10','none'),
  ('stu-11','low'),('stu-12','none'),('stu-13','high'),('stu-14','none'),('stu-15','medium'),
  ('stu-16','none'),('stu-17','none'),('stu-18','medium'),('stu-19','none'),('stu-20','low'),
  ('stu-21','low'),('stu-22','none')
) source(id, value) WHERE target.id = source.id;

UPDATE public.incidents target SET incident_type = source.value::public.incident_type
FROM (VALUES
  ('inc-1','aviso'),('inc-2','falta'),('inc-3','aviso'),('inc-4','observación'),
  ('inc-5','positivo'),('inc-6','observación'),('inc-7','aviso'),('inc-8','positivo')
) source(id, value) WHERE target.id = source.id;

UPDATE public.tutoring_actions target SET tutoring_type = source.value::public.tutoring_type
FROM (VALUES
  ('ta-1','entrevista'),('ta-2','acuerdo'),('ta-3','seguimiento'),('ta-4','observación'),('ta-5','entrevista')
) source(id, value) WHERE target.id = source.id;

UPDATE public.calendar_events target SET event_type = source.value::public.event_type
FROM (VALUES
  ('ev-1','otro'),('ev-2','entrega'),('ev-3','examen'),('ev-4','tutoría'),
  ('ev-5','otro'),('ev-6','festivo'),('ev-7','entrega'),('ev-8','reunión')
) source(id, value) WHERE target.id = source.id;

NOTIFY pgrst, 'reload schema';
