import fs from 'fs';
import path from 'path';
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
    const downloadsDir = 'C:\\Users\\esalb\\Downloads';
    console.log(`Buscando archivos CSV de Supabase en ${downloadsDir}...`);
    
    const files = fs.readdirSync(downloadsDir);
    const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv')).map(f => {
        const filePath = path.join(downloadsDir, f);
        const stat = fs.statSync(filePath);
        return {
            name: f,
            path: filePath,
            mtime: stat.mtime
        };
    }).sort((a, b) => b.mtime - a.mtime); // Más nuevos primero
    
    console.log("Archivos CSV encontrados (ordenados por fecha de modificación):");
    csvFiles.slice(0, 10).forEach(f => {
        console.log(`- ${f.name} (Modificado: ${f.mtime})`);
    });
    
    // Buscar el archivo CSV de exportación de Supabase (suele ser el más reciente con query_result, principal, etc., o que contenga los INSERTS)
    let targetFile = null;
    for (const f of csvFiles) {
        // Leer las primeras líneas para ver si contiene INSERTS
        const sample = fs.readFileSync(f.path, 'utf8').substring(0, 1000);
        if (sample.includes('INSERT INTO') && sample.includes('Aulas')) {
            targetFile = f;
            break;
        }
    }
    
    if (!targetFile) {
        console.error("No se encontró ningún archivo CSV reciente que contenga comandos INSERT de Supabase.");
        process.exit(1);
    }
    
    console.log(`\n¡Archivo de exportación encontrado!: ${targetFile.name}`);
    const fileContent = fs.readFileSync(targetFile.path, 'utf8');
    
    // Parsear el CSV
    // El formato CSV de Supabase exporta una columna "sql_insert" con las líneas entrecomilladas.
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
    
    console.log(`Procesadas ${cleanedSqlStatements.length} sentencias SQL del archivo.`);
    
    // Agrupar inserciones
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
        'Franjas horarias': 'id franja',
        'Aulas': 'id aulas',
        'Materias': 'id materias',
        'Grupos': 'id grupos',
        'Horario_Personal': 'id',
        'Grupos_Guardia': 'id'
    };
    
    const order = ['Franjas horarias', 'Aulas', 'Materias', 'Grupos', 'Horario_Personal', 'Grupos_Guardia'];
    
    for (const table of order) {
        const records = tableData[table];
        if (!records || records.length === 0) continue;
        
        console.log(`Insertando ${records.length} filas en la tabla "${table}"...`);
        
        const key = tableKeys[table];
        
        // Limpiar la tabla antes de insertar usando su clave primaria correcta
        const { error: deleteError } = await supabase.from(table).delete().neq(key, 'dummy-key-to-delete-all');
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
    
    console.log("\n¡Horarios y datos de apoyo importados con éxito desde el archivo CSV!");
}

main();
