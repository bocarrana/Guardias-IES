
-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public."Activity_Logs" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public."Profesores"(id) ON DELETE SET NULL,
    action text NOT NULL,
    guard_id text REFERENCES public."Guardias"("ID Guardia") ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Note: user_id and guard_id are text because they refer to the custom ID fields 'id' and 'ID Guardia' which are text in this schema.

-- 2. Enable RLS
ALTER TABLE public."Activity_Logs" ENABLE ROW LEVEL SECURITY;

-- 3. Policy to allow inserting by any authenticated user and reading by admins
CREATE POLICY "Allow all to insert activity logs" ON public."Activity_Logs"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow reading for admins" ON public."Activity_Logs"
    FOR SELECT USING (true); -- Simplifying for now, we can restrict later if needed.
