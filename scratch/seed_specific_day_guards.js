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

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Insertando guardias específicas para el 14 de enero de 2026...");
    
    // Obtener datos de apoyo
    const { data: teachers } = await supabase.from('Profesores').select('*');
    const { data: slots } = await supabase.from('Franjas horarias').select('*');
    const { data: classrooms } = await supabase.from('Aulas').select('*');
    const { data: subjects } = await supabase.from('Materias').select('*');
    const { data: groups } = await supabase.from('Grupos').select('*');

    // Limpiar guardias del 14 de enero de 2026 para evitar duplicados
    await supabase.from('Guardias').delete().eq('Fecha', '2026-01-14');

    const specificGuards = [
        // 1ª hora: 08:30 - 09:25 (F001)
        {
            "ID Guardia": "G-SPEC-001",
            "Fecha": "2026-01-14",
            "Franja horaria": "F001", // Primera hora
            "Aula": classrooms[0]['id aulas'],
            "Grupo atendido": groups[0]['id grupos'],
            "Materia ausente": subjects[0]['id materias'],
            "Profesor ausente": teachers[1].id,
            "Profesor de guardia": null,
            "Estado": "Pendiente/disponible",
            "Tipo de Guardia": "Ordinaria",
            "Observaciones": "Por favor, realizar ejercicios de repaso de la unidad 3.",
            "Tarea dejada": "SÍ"
        },
        // 2ª hora: 09:25 - 10:20 (F002) - Ocupará el tiempo actual de las 09:30 AM
        {
            "ID Guardia": "G-SPEC-002",
            "Fecha": "2026-01-14",
            "Franja horaria": "F002", // Segunda hora
            "Aula": classrooms[1]['id aulas'],
            "Grupo atendido": groups[1]['id grupos'],
            "Materia ausente": subjects[1]['id materias'],
            "Profesor ausente": teachers[2].id,
            "Profesor de guardia": teachers[3].id,
            "Estado": "Pendiente/asignada",
            "Tipo de Guardia": "Ordinaria",
            "Observaciones": "Examen programado. Repartir y vigilar.",
            "Tarea dejada": "SÍ"
        },
        {
            "ID Guardia": "G-SPEC-003",
            "Fecha": "2026-01-14",
            "Franja horaria": "F002", // Segunda hora
            "Aula": classrooms[2]['id aulas'],
            "Grupo atendido": groups[2]['id grupos'],
            "Materia ausente": subjects[2]['id materias'],
            "Profesor ausente": teachers[4].id,
            "Profesor de guardia": null,
            "Estado": "Pendiente/disponible",
            "Tipo de Guardia": "Ordinaria",
            "Observaciones": "Dejo tarea de lectura en el aula virtual.",
            "Tarea dejada": "SÍ"
        },
        // Recreo (F004 o F003 según orden)
        {
            "ID Guardia": "G-SPEC-004",
            "Fecha": "2026-01-14",
            "Franja horaria": "F004", // Recreo o similar
            "Aula": classrooms[3]['id aulas'],
            "Grupo atendido": null,
            "Materia ausente": "M_GUARDIA",
            "Profesor ausente": teachers[5].id,
            "Profesor de guardia": teachers[6].id,
            "Estado": "Realizada",
            "Tipo de Guardia": "Recreo",
            "Observaciones": "Vigilancia del patio de bachillerato sin incidencias.",
            "Tarea dejada": "NO"
        },
        // Quinta hora (F006)
        {
            "ID Guardia": "G-SPEC-005",
            "Fecha": "2026-01-14",
            "Franja horaria": "F006",
            "Aula": classrooms[4]['id aulas'],
            "Grupo atendido": groups[3]['id grupos'],
            "Materia ausente": subjects[3]['id materias'],
            "Profesor ausente": teachers[7].id,
            "Profesor de guardia": teachers[8].id,
            "Estado": "Realizada",
            "Tipo de Guardia": "Ordinaria",
            "Observaciones": "Desarrollo normal de la sesión.",
            "Tarea dejada": "NO"
        }
    ];

    const { error } = await supabase.from('Guardias').insert(specificGuards);
    if (error) {
        console.error("Error insertando guardias específicas:", error.message);
    } else {
        console.log("¡Guardias del 14 de enero de 2026 insertadas con éxito!");
    }
}

main();
