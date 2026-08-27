const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_DIR = path.join(ROOT_DIR, '_plantilla_base');
const CENTERS_FILE = path.join(ROOT_DIR, 'centers.json');

// Archivos/Carpetas que NUNCA se sobreescribirán en los clones si ya existen
// (para proteger las personalizaciones)
const PROTECTED_FILES = [
  '.env',
  '.env.local',
  'public/logo.png', // Añade aquí más rutas si hay más archivos personalizados por centro
];

// Archivos/Carpetas que nunca se copian de la base
const EXCLUDE_FROM_COPY = [
  'node_modules',
  '.git',
  '.vercel',
  'scratch',
  'dist'
];

async function copyRecursive(src, dest, isRoot = true) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  const relativePath = path.relative(BASE_DIR, src).replace(/\\/g, '/');

  if (isRoot) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
  }

  if (isDirectory) {
    if (!isRoot) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
    }
    const children = fs.readdirSync(src);
    for (const child of children) {
      if (isRoot && EXCLUDE_FROM_COPY.includes(child)) {
        continue;
      }
      await copyRecursive(path.join(src, child), path.join(dest, child), false);
    }
  } else {
    // Es un archivo
    if (PROTECTED_FILES.includes(relativePath)) {
      // Si el archivo está protegido, solo lo copiamos si NO existe en el destino
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log(`  - Creado archivo base protegido: ${relativePath}`);
      }
    } else {
      // Si no está protegido, sobreescribimos siempre (sincronización forzada)
      fs.copyFileSync(src, dest);
    }
  }
}

async function main() {
  if (!fs.existsSync(CENTERS_FILE)) {
    console.error('Error: No se encontró centers.json. Crea este archivo en la raíz con un array de strings (nombres de carpetas).');
    process.exit(1);
  }

  const centers = JSON.parse(fs.readFileSync(CENTERS_FILE, 'utf8'));
  console.log(`Iniciando sincronización para ${centers.length} centros...`);

  for (const center of centers) {
    console.log(`\nSincronizando: ${center}`);
    const destDir = path.join(ROOT_DIR, center);
    await copyRecursive(BASE_DIR, destDir);
    console.log(`✔ Sincronización completada para ${center}`);
  }
  console.log('\n¡Todas las sincronizaciones terminadas!');
}

main().catch(console.error);
