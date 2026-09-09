const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const rawAulas = `Biblioteca A
Cafetería
1º DIVER
Taller 2 Tecnología
Taller 1 Tecnología
Sala Usos múltiples 2 (Ludoteca)
Sala de usos múltiples 1
Gimnasio
C. Tierra Laboratorio CCNN
Música 2 (espejos)
Música 1
Desdoble 3
1º ESO D
1º ESO C
Desdoble 2
Informática B
2º ESO D
2º ESO C
Desdoble 1
2º ESO B
2º ESO A
2º ESO E
1º ESO H
Pedagogía terapéutica
2º DIVER
1º PAI
1º ESO E
1º ESO B
1º ESO A
Cocina
Biblioteca B
Biología Laboratorio CCNN
Plástica 1
4º ESO D
Desdoble 4/FPB1
4º ESO A
4º ESO B
1º BACH B1
1º BACH A2/C2
1º BACH A1
1º BACH C1
1º BACH B2
4º ESO C
4º ESO E
Física Laboratorio
Química Laboratorio
2º PAI
3º ESO C
3º ESO E
3º ESO B
3º ESO D
2º BACH C1
2º BACH B2/C2
Informática 2 Edif.A
2º BACH A1
2º BACH A2
2º BACH B1
3º ESO A
Informática 1 Edif.A
Biblioteca A Anexa`;

async function uploadAulas() {
  const envPath = path.resolve(__dirname, '../ies_pedro_de_luna/.env');
  const env = fs.readFileSync(envPath, 'utf-8');
  const url = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
  const sb = createClient(url, key);

  const lines = rawAulas.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const uniqueNames = [...new Set(lines)];
  console.log('Total aulas únicas a insertar:', uniqueNames.length);

  const payloads = uniqueNames.map((name, idx) => ({
    'id aulas': 'A' + (idx + 1).toString().padStart(3, '0'),
    'aulas': name
  }));

  const { data, error } = await sb.from('Aulas').upsert(payloads, { onConflict: 'id aulas' }).select();
  if (error) {
    console.error('Error insertando Aulas:', error);
  } else {
    console.log('✔ Aulas insertadas con éxito (' + data.length + ')');
  }

  const { count } = await sb.from('Aulas').select('*', { count: 'exact', head: true });
  console.log('=== TOTAL FINAL DE AULAS EN IES PEDRO DE LUNA: ' + count + ' ===');
}

uploadAulas();
