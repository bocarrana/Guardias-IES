import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dwwqwqloikngeolsaido.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BfSxApywPDNB7rIUSlW9xg_5kzoCN_7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSept() {
    const { data, error } = await supabase
        .from('Calendario')
        .select('*')
        .gte('fecha', '2026-09-01')
        .lte('fecha', '2026-09-30')
        .order('fecha', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log('Dias en septiembre 2026 en Supabase:');
    console.table(data);
}

checkSept();
