import { createClient } from '@supabase/supabase-js';

const s = createClient(
    'https://ipijmhqafrwobvnmmzgy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaWptaHFhZnJ3b2J2bm1temd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg1NzQsImV4cCI6MjA3MDQ0NDU3NH0.uxKjoNC_nOcPjOK56U3ACpS9gOPPapL7BqmQ5kTrLJI'
);

async function testIpij() {
    console.log('Testing Profesores in ipijmhqafrwobvnmmzgy:');
    const { data: p, error: ep } = await s.from('Profesores').select('*');
    console.log('Profesores:', p?.length, ep);
    if (p && p.length > 0) {
        console.log('Primeros 3 profesores:', p.slice(0, 3));
        const alberto = p.find(x => x.email === 'alplanast@iesreyescatolicos.com' || x['nombre y apellidos']?.includes('Alberto'));
        console.log('Alberto encontrado:', alberto);
    }

    const { data: hp, error: ehp } = await s.from('Horario_Personal').select('*');
    console.log('Horario_Personal total rows:', hp?.length, ehp);
}

testIpij();
