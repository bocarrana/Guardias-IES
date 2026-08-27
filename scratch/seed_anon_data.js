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
    console.log("Iniciando carga de datos de profesores anonimizados...");
    
    // 1. Leer el archivo SQL y parsear las inserciones de profesores
    const sqlContent = fs.readFileSync('schema_completo.sql', 'utf8');
    
    // Buscar todas las líneas de inserción de profesores
    const insertRegex = /INSERT INTO "Profesores" \((.*?)\) VALUES \('(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', (.*?)\);/g;
    
    const teachers = [];
    let match;
    
    // Parseo alternativo más genérico para capturar cualquier variación
    const lines = sqlContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('INSERT INTO "Profesores"')) {
            // Extraer valores
            // Ejemplo: INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P002', 'Natalia Campo Monclus', 'nacampom@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
            const valuesPart = line.substring(line.indexOf('VALUES') + 6).trim();
            // Quitar paréntesis inicial y final y el punto y coma
            const cleanValues = valuesPart.replace(/^\(/, '').replace(/\);$/, '');
            
            // Separar por comas teniendo cuidado con las comillas
            const rawParts = [];
            let current = '';
            let inQuotes = false;
            let quoteChar = '';
            
            for (let i = 0; i < cleanValues.length; i++) {
                const char = cleanValues[i];
                if ((char === "'" || char === '"') && cleanValues[i-1] !== '\\') {
                    if (inQuotes && char === quoteChar) {
                        inQuotes = false;
                    } else if (!inQuotes) {
                        inQuotes = true;
                        quoteChar = char;
                    } else {
                        current += char;
                    }
                } else if (char === ',' && !inQuotes) {
                    rawParts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            rawParts.push(current.trim());
            
            // Mapear campos
            // Columnas: (id, "nombre y apellidos", email, departamento, rol, horas_guardia)
            const id = rawParts[0];
            const name = rawParts[1];
            const email = rawParts[2];
            const department = rawParts[3];
            const role = rawParts[4];
            const horasGuardia = parseInt(rawParts[5], 10) || 1;
            
            teachers.push({
                id,
                'nombre y apellidos': name,
                email,
                departamento: department,
                rol: role,
                horas_guardia: horasGuardia,
                activo: true
            });
        }
    }
    
    console.log(`Encontrados ${teachers.length} profesores para insertar.`);
    
    if (teachers.length === 0) {
        console.error("No se pudieron parsear los profesores del archivo SQL.");
        process.exit(1);
    }
    
    try {
        // 2. Limpiar profesores antiguos
        console.log("Limpiando profesores antiguos de la base de datos...");
        const { error: deleteError } = await supabase
            .from('Profesores')
            .delete()
            .neq('id', 'dummy'); // Elimina todos
            
        if (deleteError) {
            throw deleteError;
        }
        console.log("Limpieza completada.");
        
        // 3. Insertar nuevos profesores anonimizados en lotes
        console.log("Insertando nuevos profesores anonimizados...");
        const { error: insertError } = await supabase
            .from('Profesores')
            .insert(teachers);
            
        if (insertError) {
            throw insertError;
        }
        
        console.log("¡Carga completada con éxito! Todos los profesores han sido anonimizados en tu Supabase.");
    } catch (err) {
        console.error("Error interactuando con Supabase:", err);
    }
}

main();
