import fs from 'fs';

const supabaseUrl = 'https://ipijmhqafrwobvnmmzgy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaWptaHFhZnJ3b2J2bm1temd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg1NzQsImV4cCI6MjA3MDQ0NDU3NH0.uxKjoNC_nOcPjOK56U3ACpS9gOPPapL7BqmQ5kTrLJI';

async function main() {
    const tables = [
        'Profesores', 'Guardias', 'Horario_Personal', 'Grupos_Guardia', 
        'Aulas', 'Materias', 'Grupos', 'Franjas horarias', 'Activity_Logs', 
        'libre_disposicion', 'configuracion_centro', 'reservas_aulas'
    ];
    
    const schemas = {};
    
    for (const table of tables) {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?limit=1`, {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            });
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                schemas[table] = Object.keys(data[0]);
                console.log(`Table ${table} columns:`, schemas[table]);
            } else {
                console.log(`Table ${table}: Empty or error`, data);
            }
        } catch (err) {
            console.error(`Error fetching table ${table}:`, err);
        }
    }
    
    fs.writeFileSync('schema_columns.json', JSON.stringify(schemas, null, 2));
}

main();
