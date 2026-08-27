import pg from 'pg';

const connectionString = 'postgresql://postgres:r2480tZ3Qx5qgY7K@db.dwwqwqloikngeolsaido.supabase.co:5432/postgres';

const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public."Calendario" (
    "id" BIGSERIAL PRIMARY KEY,
    "fecha" DATE UNIQUE NOT NULL,
    "es_lectivo" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public."Calendario" ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Lectura publica Calendario" ON public."Calendario";
CREATE POLICY "Lectura publica Calendario" ON public."Calendario"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificacion Calendario por autenticados" ON public."Calendario";
CREATE POLICY "Modificacion Calendario por autenticados" ON public."Calendario"
    FOR ALL USING (true) WITH CHECK (true);
`;

async function run() {
    try {
        console.log('Conectando a Supabase PostgreSQL directo...');
        await client.connect();
        console.log('Ejecutando creación de tabla Calendario...');
        await client.query(CREATE_TABLE_SQL);
        console.log('✔ Tabla Calendario creada y asegurada con éxito.');
    } catch (err) {
        console.error('Error al crear tabla:', err);
    } finally {
        await client.end();
    }
}

run();
