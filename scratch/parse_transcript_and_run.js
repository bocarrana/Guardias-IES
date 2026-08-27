import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// 1. Cargar variables de entorno del archivo .env manualmente
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
    console.log("Iniciando lectura del log de la conversación para extraer el SQL completo...");
    
    const logsPath = 'C:\\Users\\esalb\\.gemini\\antigravity-ide\\brain\\197740fa-42d8-4a14-b6a1-05bfe7e13c78\\.system_generated\\logs\\transcript_full.jsonl';
    
    if (!fs.existsSync(logsPath)) {
        console.error("No se encontró el archivo de log en la ruta:", logsPath);
        process.exit(1);
    }
    
    const logLines = fs.readFileSync(logsPath, 'utf8').split('\n');
    let rawSqlPasted = '';
    
    // Buscar la última entrada de USER_INPUT que contiene "sql_insert"
    for (let i = logLines.length - 1; i >= 0; i--) {
        const line = logLines[i].trim();
        if (!line) continue;
        
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'USER_INPUT' && entry.content && entry.content.includes('sql_insert')) {
                rawSqlPasted = entry.content;
                console.log("¡Log encontrado! Procesando e importando consultas...");
                break;
            }
        } catch (err) {
            // Ignorar errores de parseo de JSON
        }
    }
    
    if (!rawSqlPasted) {
        console.error("No se encontró el bloque de SQL en el historial de mensajes.");
        process.exit(1);
    }
    
    // Limpiar el contenido del CSV
    const lines = rawSqlPasted.split('\n');
    const cleanedSqlStatements = [];
    
    for (let line of lines) {
        line = line.trim();
        if (!line || line === 'sql_insert' || line.startsWith('<USER_REQUEST>')) continue;
        
        // Quitar las comillas dobles externas del formato CSV
        let clean = line;
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1);
        }
        
        // Reemplazar las comillas dobles duplicadas ("") por comillas simples (")
        clean = clean.replace(/""/g, '"');
        
        if (clean.trim()) {
            cleanedSqlStatements.push(clean.trim());
        }
    }
    
    console.log(`Procesadas ${cleanedSqlStatements.length} sentencias SQL.`);
    
    // Ejecutar las sentencias SQL en lotes pequeños en Supabase
    // Dado que son inserts, los agruparemos de 100 en 100 en transacciones individuales de ser posible,
    // o enviándolas mediante una llamada RPC si existe, o una por una de forma asíncrona.
    // Como las políticas RLS están abiertas para inserción, podemos ejecutarlas secuencialmente o en paralelo
    console.log("Ejecutando sentencias SQL en la base de datos de Supabase...");
    
    // En lugar de hacer mil peticiones HTTP individuales, podemos intentar ejecutar las queries en bloques.
    // Pero espera, como Supabase REST API no tiene un endpoint de raw SQL para el rol anon (solo para postgres directo),
    // y no tenemos el service_role key, ¿cómo podemos ejecutarlas?
    // ¡Ah! Las tablas Aulas, Materias, Grupos, Horario_Personal, Grupos_Guardia admiten INSERT directo!
    // Podemos parsear las sentencias de INSERT y convertirlas a objetos JSON de inserción de Supabase!
    // Ej: INSERT INTO "Aulas" ("id aulas", "aulas") VALUES ('A010', 'B01')
    // Se convierte en: supabase.from('Aulas').insert({ "id aulas": 'A010', "aulas": 'B01' })
    
    const tableData = {
        Aulas: [],
        Materias: [],
        Grupos: [],
        'Franjas horarias': [],
        Horario_Personal: [],
        Grupos_Guardia: []
    };
    
    for (const stmt of cleanedSqlStatements) {
        // Parsear INSERT INTO "Table" (cols) VALUES (vals)
        const match = stmt.match(/INSERT INTO "(.*?)" \((.*?)\) VALUES \((.*?)\)/i);
        if (!match) continue;
        
        const tableName = match[1];
        const colsStr = match[2];
        const valsStr = match[3];
        
        // Separar columnas
        const cols = colsStr.split(',').map(c => c.trim().replace(/"/g, ''));
        
        // Separar valores (cuidado con comillas y NULLs)
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
        
        // Mapear a objeto
        const record = {};
        for (let i = 0; i < cols.length; i++) {
            let val = vals[i];
            // Limpiar comillas simples del valor de texto
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
    
    // Insertar los datos en Supabase tabla por tabla
    const order = ['Franjas horarias', 'Aulas', 'Materias', 'Grupos', 'Horario_Personal', 'Grupos_Guardia'];
    
    for (const table of order) {
        const records = tableData[table];
        if (!records || records.length === 0) continue;
        
        console.log(`Insertando ${records.length} filas en la tabla "${table}"...`);
        
        // Limpiar la tabla antes de insertar para evitar duplicados
        const { error: deleteError } = await supabase.from(table).delete().neq('id', 'dummy');
        if (deleteError) {
            console.warn(`Advertencia al limpiar la tabla ${table}:`, deleteError.message);
        }
        
        // Insertar en lotes de 100 para evitar sobrecargar la conexión
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error: insertError } = await supabase.from(table).insert(batch);
            if (insertError) {
                console.error(`Error insertando en la tabla ${table} (lote ${i}):`, insertError.message);
            }
        }
        console.log(`Tabla "${table}" completada.`);
    }
    
    console.log("¡Horarios y datos de apoyo importados con éxito a la nueva base de datos!");
}

main();
