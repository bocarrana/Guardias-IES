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
    console.log("Iniciando generación de datos de simulación...");

    // 1. Obtener datos de apoyo de la base de datos
    const { data: teachers } = await supabase.from('Profesores').select('*');
    const { data: slots } = await supabase.from('Franjas horarias').select('*');
    const { data: classrooms } = await supabase.from('Aulas').select('*');
    const { data: subjects } = await supabase.from('Materias').select('*');
    const { data: groups } = await supabase.from('Grupos').select('*');

    if (!teachers || !slots || !classrooms || !subjects || !groups || teachers.length === 0) {
        console.error("Error: No hay suficientes datos de profesores, franjas, aulas, materias o grupos en la base de datos.");
        process.exit(1);
    }

    console.log(`Cargados: ${teachers.length} profesores, ${slots.length} franjas, ${classrooms.length} aulas, ${subjects.length} materias, ${groups.length} grupos.`);

    // 2. Generar días de Calendario (Curso 2025-2026: Sept 2025 a Junio 2026)
    console.log("Generando fechas de calendario para el curso 2025-2026...");
    const calendarDays = [];
    const startDate = new Date('2025-09-01');
    const endDate = new Date('2026-06-30');
    
    // Limpiar calendario antes de insertar
    await supabase.from('Calendario').delete().neq('fecha', '1970-01-01');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado

        let esLectivo = true;
        let descripcion = null;

        // Fines de semana
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            esLectivo = false;
            descripcion = 'Fin de semana';
        } else {
            // Vacaciones escolares de Navidad (22 Dic a 7 Ene)
            const m = d.getMonth() + 1;
            const dateNum = d.getDate();
            if ((m === 12 && dateNum >= 22) || (m === 1 && dateNum <= 7)) {
                esLectivo = false;
                descripcion = 'Vacaciones de Navidad';
            }
            // Vacaciones de Semana Santa (ej. 30 de marzo a 6 de abril de 2026)
            else if ((m === 3 && dateNum >= 30) || (m === 4 && dateNum <= 6)) {
                esLectivo = false;
                descripcion = 'Semana Santa';
            }
            // Festivos nacionales/regionales clave
            else if (m === 10 && dateNum === 12) {
                esLectivo = false;
                descripcion = 'Día del Pilar';
            } else if (m === 11 && dateNum === 1) {
                esLectivo = false;
                descripcion = 'Todos los Santos';
            } else if (m === 12 && dateNum === 6) {
                esLectivo = false;
                descripcion = 'Día de la Constitución';
            } else if (m === 12 && dateNum === 8) {
                esLectivo = false;
                descripcion = 'Día de la Inmaculada';
            } else if (m === 5 && dateNum === 1) {
                esLectivo = false;
                descripcion = 'Día del Trabajo';
            } else if (m === 4 && dateNum === 23) {
                esLectivo = false;
                descripcion = 'Día de Aragón';
            }
        }

        calendarDays.push({
            fecha: dateStr,
            es_lectivo: esLectivo,
            descripcion
        });
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    for (let i = 0; i < calendarDays.length; i += batchSize) {
        const batch = calendarDays.slice(i, i + batchSize);
        const { error } = await supabase.from('Calendario').insert(batch);
        if (error) {
            console.error("Error insertando días de calendario:", error.message);
        }
    }
    console.log(`Calendario generado: ${calendarDays.length} días insertados.`);

    // 3. Generar Histórico de Guardias Simuladas (Curso 2025-2026)
    console.log("Generando guardias de simulación...");
    const schoolDays = calendarDays.filter(d => d.es_lectivo).map(d => d.fecha);
    const mockGuards = [];

    // Definición de estados de guardias
    // Generar unas 150 guardias en total
    const numGuards = 150;
    const teachersList = teachers.filter(t => t.rol !== 'Pantalla' && t.id !== 'P087');
    
    // Filtrar profesores por rol de jefatura para hacer de solicitantes preferentes en algunas gestiones,
    // pero todos pueden pedir guardias.
    
    for (let i = 0; i < numGuards; i++) {
        // Elegir un día escolar aleatorio de forma determinista para simular "mitad de curso"
        // Ponemos el 80% de las guardias en el pasado (Sept 2025 a Mayo 2026) para que aparezcan en las estadísticas de "Realizadas"
        // y el 20% en fechas futuras o de final del curso para que aparezcan como "Pendientes"
        const isPast = Math.random() < 0.8;
        let fecha;
        
        if (isPast) {
            // Días de septiembre a abril
            const pastDays = schoolDays.filter(d => d < '2026-05-01');
            fecha = pastDays[Math.floor(Math.random() * pastDays.length)];
        } else {
            // Días de mayo y junio
            const futureDays = schoolDays.filter(d => d >= '2026-05-01');
            fecha = futureDays[Math.floor(Math.random() * futureDays.length)];
        }

        const slot = slots[Math.floor(Math.random() * slots.length)]['id franja'];
        const classroom = classrooms[Math.floor(Math.random() * classrooms.length)]['id aulas'];
        const subject = subjects[Math.floor(Math.random() * subjects.length)]['id materias'];
        const group = groups[Math.floor(Math.random() * groups.length)]['id grupos'];

        // Seleccionar profesor solicitante (el que falta)
        const requester = teachersList[Math.floor(Math.random() * teachersList.length)].id;
        
        // Seleccionar profesor sustituto (el que hace la guardia)
        let coverTeacher = null;
        let estado = 'Pendiente/disponible';
        let tipo = Math.random() < 0.85 ? 'Ordinaria' : (Math.random() < 0.5 ? 'Recreo' : 'Convivencia');
        
        if (isPast) {
            // En el pasado todas están realizadas
            estado = 'Realizada';
            // Buscar un profesor de guardia (distinto al solicitante)
            let potentialCover;
            do {
                potentialCover = teachersList[Math.floor(Math.random() * teachersList.length)].id;
            } while (potentialCover === requester);
            coverTeacher = potentialCover;
        } else {
            // En el futuro/presente pueden ser asignadas o disponibles
            const rand = Math.random();
            if (rand < 0.5) {
                estado = 'Pendiente/asignada';
                let potentialCover;
                do {
                    potentialCover = teachersList[Math.floor(Math.random() * teachersList.length)].id;
                } while (potentialCover === requester);
                coverTeacher = potentialCover;
            } else {
                estado = 'Pendiente/disponible';
                coverTeacher = null;
            }
        }

        const newId = `G-SIM-${String(i+1).padStart(4, '0')}`;
        const tieneTarea = Math.random() < 0.6 ? 'SÍ' : 'NO';
        const observaciones = estado === 'Realizada' 
            ? 'La sesión se desarrolló sin incidencias. Se realizaron las actividades indicadas.' 
            : (tieneTarea === 'SÍ' ? 'Dejo ejercicios de la página 45 a 47 del libro de texto.' : 'Aula de estudio libre.');

        mockGuards.push({
            "ID Guardia": newId,
            "Fecha": fecha,
            "Franja horaria": slot,
            "Aula": classroom,
            "Grupo atendido": group,
            "Materia ausente": subject,
            "Profesor ausente": requester,
            "Profesor de guardia": coverTeacher,
            "Estado": estado,
            "Tipo de Guardia": tipo,
            "Observaciones": observaciones,
            "Tarea dejada": tieneTarea
        });
    }

    // Limpiar guardias anteriores de la simulación
    await supabase.from('Guardias').delete().neq('ID Guardia', 'dummy');

    // Insertar guardias en lotes
    for (let i = 0; i < mockGuards.length; i += batchSize) {
        const batch = mockGuards.slice(i, i + batchSize);
        const { error } = await supabase.from('Guardias').insert(batch);
        if (error) {
            console.error("Error insertando guardia simulada:", error.message);
        }
    }

    console.log(`Guardias generadas: ${mockGuards.length} guardias insertadas con éxito.`);

    // 4. Crear un par de eventos en el calendario
    console.log("Generando eventos de calendario...");
    
    // Limpiar eventos anteriores
    await supabase.from('calendar_events').delete().neq('title', 'dummy');

    const mockEvents = [
        {
            date: '2026-01-15',
            title: 'Reunión de Evaluación del 1er Trimestre',
            description: 'Sesión de evaluación conjunta de todos los departamentos en el salón de actos.',
            category: 'Reunión',
            creator_id: teachersList[0].id
        },
        {
            date: '2026-04-23',
            title: 'Festividad de San Jorge (Día de Aragón)',
            description: 'Día no lectivo oficial en toda la comunidad autónoma.',
            category: 'Festivo',
            creator_id: teachersList[0].id
        },
        {
            date: '2026-06-18',
            title: 'Claustro de Final de Curso',
            description: 'Claustro pedagógico del curso escolar y preparación de memorias.',
            category: 'Claustro',
            creator_id: teachersList[0].id
        }
    ];

    const { error: eventError } = await supabase.from('calendar_events').insert(mockEvents);
    if (eventError) {
        console.error("Error insertando eventos de calendario:", eventError.message);
    } else {
        console.log("Eventos de calendario creados con éxito.");
    }

    console.log("\n¡Simulación de curso escolar y guardias completada con éxito!");
}

main();
