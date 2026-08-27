import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno del archivo .env manualmente
const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
    }
    if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const csvPath = 'scratch/clipboard.csv';
    if (!fs.existsSync(csvPath)) {
        console.error("No se encontró el archivo de portapapeles en scratch/clipboard.csv");
        process.exit(1);
    }
    
    console.log("Leyendo datos del portapapeles guardado...");
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n');
    const cleanedSqlStatements = [];
    
    for (let line of lines) {
        line = line.trim();
        if (!line || line === 'sql_insert' || line === '"sql_insert"') continue;
        
        let clean = line;
        // Quitar las comillas dobles externas del formato CSV
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1);
        }
        
        // Reemplazar las comillas dobles duplicadas ("") por comillas simples (")
        clean = clean.replace(/""/g, '"');
        
        if (clean.trim() && clean.startsWith('INSERT INTO')) {
            cleanedSqlStatements.push(clean.trim());
        }
    }
    
    console.log(`Procesadas ${cleanedSqlStatements.length} sentencias SQL.`);
    
    const tableData = {
        Aulas: [],
        Materias: [],
        Grupos: [],
        'Franjas horarias': [],
        Horario_Personal: [],
        Grupos_Guardia: []
    };
    
    for (const stmt of cleanedSqlStatements) {
        const match = stmt.match(/INSERT INTO "(.*?)" \((.*?)\) VALUES \((.*?)\)/i);
        if (!match) continue;
        
        const tableName = match[1];
        const colsStr = match[2];
        const valsStr = match[3];
        
        const cols = colsStr.split(',').map(c => c.trim().replace(/"/g, ''));
        
        const vals = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < valsStr.length; i++) {
            const char = valsStr[i];
            if (char === "'" && valsStr[i-1] !== '\\') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                vals.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        vals.push(current.trim());
        
        const record = {};
        for (let i = 0; i < cols.length; i++) {
            let val = vals[i];
            if (val.startsWith("'") && val.endsWith("'")) {
                val = val.substring(1, val.length - 1);
            }
            if (val === 'NULL') {
                val = null;
            }
            record[cols[i]] = val;
        }
        
        if (tableData[tableName]) {
            tableData[tableName].push(record);
        } else {
            tableData[tableName] = [record];
        }
    }
    
    const tableKeys = {
        'Franjas horarias': { key: 'id franja', isUuid: false },
        'Aulas': { key: 'id aulas', isUuid: false },
        'Materias': { key: 'id materias', isUuid: false },
        'Grupos': { key: 'id grupos', isUuid: false },
        'Horario_Personal': { key: 'id', isUuid: true },
        'Grupos_Guardia': { key: 'id', isUuid: true }
    };
    
    const order = ['Franjas horarias', 'Aulas', 'Materias', 'Grupos', 'Horario_Personal', 'Grupos_Guardia'];
    
    for (const table of order) {
        const records = tableData[table];
        if (!records || records.length === 0) continue;
        
        console.log(`Insertando ${records.length} filas en la tabla "${table}"...`);
        
        const { key, isUuid } = tableKeys[table];
        const dummyVal = isUuid ? '00000000-0000-0000-0000-000000000000' : 'dummy-key-to-delete-all';
        
        // Limpiar la tabla antes de insertar usando su clave primaria y tipo correcto
        const { error: deleteError } = await supabase.from(table).delete().neq(key, dummyVal);
        if (deleteError) {
            console.warn(`Advertencia al limpiar la tabla ${table}:`, deleteError.message);
        }
        
        // Insertar en lotes de 100
        const batchSize = 100;
        let successCount = 0;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error: insertError } = await supabase.from(table).insert(batch);
            if (insertError) {
                console.error(`Error insertando en la tabla ${table} (lote ${i}):`, insertError.message);
            } else {
                successCount += batch.length;
            }
        }
        console.log(`Tabla "${table}" completada: insertadas ${successCount} filas.`);
    }
    
    console.log("\n¡Horarios y datos de apoyo importados con éxito desde el portapapeles!");
}

main();
