import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dwwqwqloikngeolsaido.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BfSxApywPDNB7rIUSlW9xg_5kzoCN_7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Festivos y periodos no lectivos oficiales de Aragón para el curso 2026-2027
const HOLIDAYS_ARAGON_2026_2027 = {
    '2026-10-12': 'Fiesta Nacional de España / Día del Pilar',
    '2026-11-02': 'Lunes siguiente a Todos los Santos',
    '2026-12-07': 'Puente de la Constitución',
    '2026-12-08': 'Inmaculada Concepción',
    // Navidad
    '2026-12-23': 'Vacaciones de Navidad',
    '2026-12-24': 'Vacaciones de Navidad (Nochebuena)',
    '2026-12-25': 'Vacaciones de Navidad (Navidad)',
    '2026-12-28': 'Vacaciones de Navidad',
    '2026-12-29': 'Vacaciones de Navidad',
    '2026-12-30': 'Vacaciones de Navidad',
    '2026-12-31': 'Vacaciones de Navidad (Nochevieja)',
    '2027-01-01': 'Vacaciones de Navidad (Año Nuevo)',
    '2027-01-04': 'Vacaciones de Navidad',
    '2027-01-05': 'Vacaciones de Navidad',
    '2027-01-06': 'Vacaciones de Navidad (Epifanía / Reyes)',
    // Semana Blanca / Carnaval / Provincial Huesca
    '2027-02-18': 'Día no lectivo provincial (Semana de Carnaval / Huesca)',
    '2027-02-19': 'Día no lectivo provincial (Semana de Carnaval / Huesca)',
    // Semana Santa
    '2027-03-25': 'Semana Santa (Jueves Santo)',
    '2027-03-26': 'Semana Santa (Viernes Santo)',
    '2027-03-29': 'Semana Santa (Lunes de Pascua)',
    '2027-03-30': 'Semana Santa',
    '2027-03-31': 'Semana Santa',
    '2027-04-01': 'Semana Santa',
    '2027-04-02': 'Semana Santa',
    // San Jorge / Autonómico
    '2027-04-23': 'Día de Aragón (San Jorge)',
    '2027-05-01': 'Fiesta del Trabajo',
    '2027-05-03': 'Día no lectivo provincial (Huesca / Zaragoza)',
};

async function setupCalendar() {
    console.log('Generando calendario escolar 2026-2027 para IES Sierra de San Quílez (Binéfar)...');

    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2027-06-30T00:00:00');
    const days = [];

    let cur = new Date(start);
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const dow = cur.getDay(); // 0 = Domingo, 6 = Sábado
        const isWeekend = dow === 0 || dow === 6;

        let esLectivo = !isWeekend;
        let desc = isWeekend ? 'Fin de semana' : null;

        if (HOLIDAYS_ARAGON_2026_2027[dateStr]) {
            esLectivo = false;
            desc = HOLIDAYS_ARAGON_2026_2027[dateStr];
        }

        // Antes del 8 de septiembre (días de claustro / preparación)
        if (dateStr >= '2026-09-01' && dateStr < '2026-09-08' && !isWeekend) {
            esLectivo = false;
            desc = 'Inicio de curso profesorado / Preparación';
        }

        // Después del 18 de junio (evaluaciones finales / fin de curso)
        if (dateStr > '2027-06-18' && dateStr <= '2027-06-30' && !isWeekend) {
            esLectivo = false;
            desc = 'Evaluaciones y trámites fin de curso';
        }

        days.push({
            fecha: dateStr,
            es_lectivo: esLectivo,
            descripcion: desc
        });

        cur.setDate(cur.getDate() + 1);
    }

    console.log(`Total días calculados: ${days.length}`);

    // Insertar en Supabase
    const { error } = await supabase.from('Calendario').upsert(days, { onConflict: 'fecha' });
    if (error) {
        console.error('Error insertando en Calendario:', error);
    } else {
        console.log('✔ Calendario escolar 2026-2027 insertado y configurado con éxito en Supabase.');
    }

    // Comprobar festivos insertados
    const { data: festivos } = await supabase
        .from('Calendario')
        .select('*')
        .eq('es_lectivo', false)
        .neq('descripcion', 'Fin de semana')
        .order('fecha', { ascending: true });

    console.log('\n--- Días festivos y no lectivos configurados para 2026-2027 ---');
    console.table(festivos);
}

setupCalendar();
