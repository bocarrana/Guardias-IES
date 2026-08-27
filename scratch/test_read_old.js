import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://ipijmhqafrwobvnmmzgy.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaWptaHFhZnJ3b2J2bm1temd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg1NzQsImV4cCI6MjA3MDQ0NDU3NH0.uxKjoNC_nOcPjOK56U3ACpS9gOPPapL7BqmQ5kTrLJI';

const supabase = createClient(oldUrl, oldKey);

async function main() {
    const tables = [
        'Franjas horarias',
        'Aulas',
        'Materias',
        'Grupos',
        'Horario_Personal',
        'Grupos_Guardia',
        'Guardias',
        'reservas_aulas',
        'libre_disposicion',
        'configuracion_centro'
    ];
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(5);
        if (error) {
            console.log(`Table ${table} failed:`, error.message);
        } else {
            console.log(`Table ${table} succeeded: fetched ${data.length} rows.`);
        }
    }
}

main();
