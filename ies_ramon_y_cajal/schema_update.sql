-- Update schema to add Guard Groups per Time Slot

-- 1. Add horas_guardia field to Profesores
ALTER TABLE public."Profesores"
ADD COLUMN IF NOT EXISTS horas_guardia integer DEFAULT 0;

-- 2. Create table for guard schedule combinations (Grupos de Guardia)
CREATE TABLE IF NOT EXISTS public."Grupos_Guardia" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id uuid REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    dia_semana text NOT NULL CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')),
    franja_id text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profesor_id, dia_semana, franja_id)
);

-- Enable RLS
ALTER TABLE public."Grupos_Guardia" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users
CREATE POLICY "Enable read/write for all users" ON public."Grupos_Guardia"
    FOR ALL
    USING (true)
    WITH CHECK (true);
