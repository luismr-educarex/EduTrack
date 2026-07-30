-- Replace a complete classroom layout in one transaction. Calling this function
-- prevents the delete-then-insert client workflow from leaving a module without
-- assignments when validation or insertion fails.
CREATE OR REPLACE FUNCTION public.save_seat_layout(
  p_module_id TEXT,
  p_rows INTEGER,
  p_columns INTEGER,
  p_assignments JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_rows NOT BETWEEN 1 AND 12 OR p_columns NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Invalid layout dimensions';
  END IF;
  IF p_assignments IS NULL OR jsonb_typeof(p_assignments) <> 'object' THEN
    RAISE EXCEPTION 'Assignments must be a JSON object';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.modules
    WHERE id = p_module_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Module not found';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(p_assignments) AS assignment(seat_id, student_id)
    LEFT JOIN public.students
      ON students.id = assignment.student_id
      AND students.module_id = p_module_id
      AND students.owner_id = auth.uid()
    WHERE assignment.seat_id = '' OR students.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid seat assignment';
  END IF;

  INSERT INTO public.seat_layouts (module_id, rows, columns, owner_id, updated_at)
  VALUES (p_module_id, p_rows, p_columns, auth.uid(), CURRENT_TIMESTAMP)
  ON CONFLICT (module_id) DO UPDATE
    SET rows = EXCLUDED.rows,
        columns = EXCLUDED.columns,
        updated_at = CURRENT_TIMESTAMP
    WHERE seat_layouts.owner_id = auth.uid();

  DELETE FROM public.seat_assignments
  WHERE module_id = p_module_id AND owner_id = auth.uid();

  INSERT INTO public.seat_assignments (module_id, student_id, seat_id, owner_id, updated_at)
  SELECT p_module_id, assignment.student_id, assignment.seat_id, auth.uid(), CURRENT_TIMESTAMP
  FROM jsonb_each_text(p_assignments) AS assignment(seat_id, student_id);
END
$function$;

REVOKE ALL ON FUNCTION public.save_seat_layout(TEXT, INTEGER, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_seat_layout(TEXT, INTEGER, INTEGER, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
