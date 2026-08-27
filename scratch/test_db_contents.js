import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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
    const t = await supabase.from('Profesores').select('*');
    const f = await supabase.from('Franjas horarias').select('*');
    const a = await supabase.from('Aulas').select('*');
    const m = await supabase.from('Materias').select('*');
    const g = await supabase.from('Grupos').select('*');

    console.log("Resultados de test de base de datos:");
    console.log("Profesores:", t.data ? t.data.length : 'error', t.error);
    console.log("Franjas horarias:", f.data ? f.data.length : 'error', f.error);
    console.log("Aulas:", a.data ? a.data.length : 'error', a.error);
    console.log("Materias:", m.data ? m.data.length : 'error', m.error);
    console.log("Grupos:", g.data ? g.data.length : 'error', g.error);
}

main();
