import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ipijmhqafrwobvnmmzgy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaWptaHFhZnJ3b2J2bm1temd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg1NzQsImV4cCI6MjA3MDQ0NDU3NH0.uxKjoNC_nOcPjOK56U3ACpS9gOPPapL7BqmQ5kTrLJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
    console.log('--- FRANJAS HORARIAS ---');
    const { data: franjas } = await supabase.from('Franjas horarias').select('*');
    console.table(franjas);

    console.log('\n--- PROFESOR ALBERTO ---');
    const { data: profs } = await supabase.from('Profesores').select('*').ilike('nombre y apellidos', '%Alberto%');
    console.table(profs);

    console.log('\n--- HORARIO ACTUAL DE ALBERTO ---');
    if (profs && profs.length > 0) {
        const { data: horario } = await supabase.from('Horario_Personal').select('*').eq('profesor_id', profs[0].id);
        console.table(horario);
    }
}

inspect();
