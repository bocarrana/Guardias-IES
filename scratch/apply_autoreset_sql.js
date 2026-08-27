import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

async function main() {
    console.log("Conectándose a PostgreSQL en Supabase...");
    
    const connectionString = "postgresql://postgres:We1TnGuN1DdjIhnp@db.vrlfhsmfohktkpibtxlt.supabase.co:5432/postgres";
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Supabase requiere SSL
    });

    try {
        await client.connect();
        console.log("¡Conexión establecida con éxito!");

        const sqlFile = "scratch/schedule_autoreset.sql";
        if (!fs.existsSync(sqlFile)) {
            console.error("No se encontró el archivo:", sqlFile);
            process.exit(1);
        }

        console.log("Leyendo archivo SQL...");
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log("Ejecutando consultas en la base de datos de Supabase...");
        await client.query(sql);
        console.log("¡La tarea de Autoreset Diario ha sido programada con éxito!");

    } catch (err) {
        console.error("Error ejecutando el script:", err);
    } finally {
        await client.end();
        console.log("Conexión cerrada.");
    }
}

main();
