const { Client } = require('./node_modules/pg');

async function test(dbHost, pass) {
  const connectionString = `postgresql://postgres:${pass}@${dbHost}:5432/postgres`;
  console.log('Testing connection to', dbHost, '...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('SUCCESS! Connected to', dbHost);
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));
    const profs = await client.query('SELECT count(*) FROM "Profesores"');
    console.log('Count profesores:', profs.rows[0].count);
    const sample = await client.query('SELECT * FROM "Profesores" LIMIT 2');
    console.log('Sample:', sample.rows);
  } catch(e) {
    console.error('Error connecting to', dbHost, ':', e.message);
  } finally {
    try { await client.end(); } catch(e){}
  }
}

async function main() {
  await test('db.vrlfhsmfohktkpibtxlt.supabase.co', 'We1TnGuN1DdjIhnp');
  await test('db.dwwqwqloikngeolsaido.supabase.co', 'We1TnGuN1DdjIhnp');
}
main();
