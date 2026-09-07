import pg from 'pg';
const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:We1TnGuN1DdjIhnp@db.vrlfhsmfohktkpibtxlt.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL vrlfhsmfohktkpibtxlt!');
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));
    const profs = await client.query('SELECT * FROM "Profesores" LIMIT 5');
    console.log('Profesores sample:', profs.rows);
  } catch(e) {
    console.error('Postgres error:', e.message);
  } finally {
    await client.end();
  }
}
run();
