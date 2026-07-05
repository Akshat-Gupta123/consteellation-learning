
-- lesson_codes: one-time-use codes that unlock a lesson topic
CREATE TABLE public.lesson_codes (
  code TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.lesson_codes TO authenticated;
GRANT ALL ON public.lesson_codes TO service_role;

ALTER TABLE public.lesson_codes ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can look up any code (needed to validate scan)
CREATE POLICY "lesson_codes_select_authenticated"
  ON public.lesson_codes FOR SELECT
  TO authenticated
  USING (true);

-- A signed-in user can claim an unclaimed code, stamping their own id
CREATE POLICY "lesson_codes_claim_unclaimed"
  ON public.lesson_codes FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- ic_codes: one-time-use IC reward codes
CREATE TABLE public.ic_codes (
  code TEXT PRIMARY KEY,
  value INTEGER NOT NULL CHECK (value > 0),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.ic_codes TO authenticated;
GRANT ALL ON public.ic_codes TO service_role;

ALTER TABLE public.ic_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ic_codes_select_authenticated"
  ON public.ic_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ic_codes_claim_unclaimed"
  ON public.ic_codes FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- Seed lesson codes (Electricity & Circuits)
INSERT INTO public.lesson_codes (code, topic) VALUES
  ('GAL-ELC-001', 'Electricity & Circuits'),
  ('GAL-ELC-002', 'Electricity & Circuits'),
  ('GAL-ELC-003', 'Electricity & Circuits'),
  ('GAL-ELC-004', 'Electricity & Circuits'),
  ('GAL-ELC-005', 'Electricity & Circuits');

-- Seed IC codes
INSERT INTO public.ic_codes (code, value) VALUES
  ('IC-7KQ9-AL3M-10', 10),
  ('IC-2PZ8-XN5R-25', 25),
  ('IC-9VD4-JS7T-10', 10),
  ('IC-6LM2-QW8C-50', 50),
  ('IC-3RT9-UK1B-25', 25),
  ('IC-8NF5-ZX6Y-10', 10),
  ('IC-5HJ7-PL2D-50', 50),
  ('IC-1CV9-MK8Q-25', 25),
  ('IC-4BQ6-TA3N-10', 10),
  ('IC-7XZ2-RE9P-50', 50),
  ('IC-9LM5-JK2V-10', 10),
  ('IC-2DN8-WQ7S-25', 25),
  ('IC-6PT3-YU9H-50', 50),
  ('IC-8KC1-AL7X-10', 10),
  ('IC-3MV9-ZQ4R-25', 25),
  ('IC-5TR6-NB2J-50', 50),
  ('IC-1QW7-VC9D-10', 10),
  ('IC-7AP3-LM8K-25', 25),
  ('IC-4ZJ6-UX2T-50', 50),
  ('IC-9SN1-ER5B-10', 10);
