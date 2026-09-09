const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const rawData = `Plástica	RESANO LÓPEZ, Juan Cruz	jcresano@iespedrodeluna.es
Plástica	BARRIO ESTARREADO, Leticia	lbarrio@iespedrodeluna.es
Plástica	GARNACHO GARCÍA, David	dgarnacho@iespedrodeluna.es
Biología y Geología	GÓMEZ ANTÓN, Fernando	fgomez@iespedrodeluna.es
Biología y Geología	FALCÓN YUSTE, Javier	ljfalcon@iespedrodeluna.es
Biología y Geología	SANZ COLLADO, Llanos	lsanz@iespedrodeluna.es
Biología y Geología	LAMARCA GAY, Violeta	vlamarca@iespedrodeluna.es
Biología y Geología	ORMAZÁBAL CUNDÍN, Juan Ramón	jrormazabal@iespedrodeluna.es
Economía	GONZALO SANZ, Mª Rosa	mrgonzalo@iespedrodeluna.es
Economía	LOPEZ MONSERRAT, José María	jmlopez@iespedrodeluna.es
Economía		
Educación Física	SIMAL MEDINA, Mª Cecilia	csimal@iespedrodeluna.es
Educación Física	MORALES AGUDO, Daniel	dmorales@iespedrodeluna.es
Educación Física	LIBEROS SAURA, Ester Cristina	ecliberos@iespedrodeluna.es
Educación Física	ORTÍN GABÁS, Guillermo	gortin@iespedrodeluna.es
Filosofía	SIERRA GARCÍA, Fernando	fsierra@iespedrodeluna.es
Filosofía	GÓMEZ CARNICERO, Mª Asunción	magomez@iespedrodeluna.es
Filosofía	ECED CLEMENTE, Sofía	seced@iespedrodeluna.es
Física y Química	CRISTÓBAL LLORENTE, Ana Mª	amcristobal@iespedrodeluna.es
Física y Química	PUERTA OTEO, Raquel	rpuerta@iespedrodeluna.es
Física y Química	VICENTE GÓMEZ, Ruth	rvicente@iespedrodeluna.es
Física y Química	LOPEZ ROYO, Tresa Iguazel	tilopez@iespedrodeluna.es
Francés	LÓPEZ BANZO, Montserrat	mlopez@iespedrodeluna.es
Francés	JURADO BELLO, Mª Ángeles	majurado@iespedrodeluna.es
Geografía e Historia	GONZÁLEZ REHAHN, Enrique	egonzalez@iespedrodeluna.es
Geografía e Historia	MÍNGUEZ NARROS, Raúl	rminguez@iespedrodeluna.es
Geografía e Historia	DÍEZ PELLEJERO, Óscar	odiez@iespedrodeluna.es
Geografía e Historia	RUBIO VAQUERO, Ignacio	irubio@iespedrodeluna.es
Geografía e Historia	GUTIÉRREZ LIZALDE, Lidia Mª	lmgutierrez@iespedrodeluna.es
Geografía e Historia	LÓPEZ MURO, Patricia V.	pvlopez@iespedrodeluna.es
Geografía e Historia	BIELSA ARTIDIELLO, Daniel	dbielsa@iespedrodeluna.es
Geografía e Historia	REMACHA PINA, Jorge	jremacha@iespedrodeluna.es
Geografía e Historia	CANO RODRIGUEZ, Jesús	jcano@iespedrodeluna.es
Hostelería	ÁLVAREZ MORET, Enrique	ealvarez@iespedrodeluna.es
Hostelería	ARROJO CASTRO, Luis Miguel	lmarrojo@iespedrodeluna.es
Hostelería	SERAL LETOSA, Teresa	tseral@iespedrodeluna.es
Hostelería	RUIZ SÁENZ, Isaac	iruiz@iespedrodeluna.es
Inglés	MUÑOZ MERCHÁN, Irene	imunoz@iespedrodeluna.es
Inglés	ZARRANZ LAUNA, Josechu	jmzarranz@iespedrodeluna.es
Inglés	ANDRÉS SOLER, Mª Carmen	mcandres@iespedrodeluna.es
Inglés	NAVARRETE MORENO, Noelia	nnavarrete@iespedrodeluna.es
Inglés	DELGADO LISO, Ana	adelgado@iespedrodeluna.es
Inglés	MONTES SOLIVA, Mónica	mmontes@iespedrodeluna.es
Inglés	SPASIANO, Annachiara	aspasiano@iespedrodeluna.es
Inglés	ALTELARREA LLORENTE, Miriam	maltelarrea@iespedrodeluna.es
Inglés	ALMAU GRATAL, Rut	ralmau@iespedrodeluna.es
Inglés	LORIENTE OTAL, Mara	mloriente@iespedrodeluna.es
Inglés	JAREÑO LOPEZ, Urbano	ujareno@iespedrodeluna.es
Inglés	CENICEROS CARRILLO, Alejandra	aceniceros@iespedrodeluna.es
Inglés	MATT YANG	myang@iespedrodeluna.es
Latín	GRACIA PALOS, Juan Carlos	jcgracia@iespedrodeluna.es
Latín	GASPAR GALINDO, Beatriz	bgaspar@iespedrodeluna.es
Lengua y Literatura	FERRER CORTÉS, Silvia	sferrer@iespedrodeluna.es
Lengua y Literatura	LARA MATAS, Alicia	alara@iespedrodeluna.es
Lengua y Literatura	ALFONSO AMEZUA, Silvia	salfonso@iespedrodeluna.es
Lengua y Literatura	GARCÍA RUEDA, José Ramón	jrgarcia@iespedrodeluna.es
Lengua y Literatura	LALIENA ESPAÑOL, Blanca	blaliena@iespedrodeluna.es
Lengua y Literatura	MATEO PALACIOS, Ana Mª	ammateo@iespedrodeluna.es
Lengua y Literatura	DE LA FUENTE GASCÓN, Ricardo	rdelafuente@iespedrodeluna.es
Lengua y Literatura	SENAR BERET, Araceli	asenar@iespedrodeluna.es
Lengua y Literatura	FÉLEZ VICENTE, María	mfelez@iespedrodeluna.e
Lengua y Literatura	SIERRA PLAZA, José Manuel	jmsierra@iespedrodeluna.es
Lengua y Literatura	ELIAS VALERO, Alejandro	aelias@iespedrodeluna.es
Matemáticas	IBÁÑEZ BERMEJO, Raquel	ribanez@iespedrodeluna.es
Matemáticas	SORIANO CAZCARRO, Mª Ángeles	masoriano@iespedrodeluna.es
Matemáticas	FERNÁNDEZ ASPIROZ, Mª Jesús	mjfernandez@iespedrodeluna.es
Matemáticas	PERLA MATEO, Julia Mª	jmperla@iespedrodeluna.es
Matemáticas	ZUECO OLIVÁN, Merche	mzueco@iespedrodeluna.es
Matemáticas	FERNÁNDEZ GRASA, Carmen	cfernandez@iespedrodeluna.es
Matemáticas	MACÍAS CALVO, Ana Belén	abmacias@iespedrodeluna.es
Matemáticas	ROCHE FERRER, Mª Pilar	mproche@iespedrodeluna.es
Matemáticas	MORATA HEREDIA, Mª del Carmen	mcmorata@iespedrodeluna.es
Matemáticas	ECHEVERRIA SANMARTIN, Irene	iecheverria@iespedrodeluna.es
Música	PARRILLA ARANDA, Conchi	cparrilla@iespedrodeluna.es
Música	SEBASTIÁN GERMÁN, Justino	jsebastian@iespedrodeluna.es
Música	DOMÍNGUEZ NONAY, Blanca	bdominguez@iespedrodeluna.es
Música	LAMANA ROSADO, María	mlamana@iespedrodeluna.es
Música	SOLANO FERNÁNDEZ, Mª Isabel	misolano@iespedrodeluna.es
Música	GUTIERREZ MORALES, Joymer Cristina	jcgutierrez@iespedrodeluna.es
Orientación	TOLOSANA SÁNCHEZ, Isabel	itolosana@iespedrodeluna.es
Orientación	PALLARÉS ESPINOSA, Concepción	cpallares@iespedrodeluna.es
Orientación	GUTIÉRREZ CANO, Mª Inmaculada	migutierrez@iespedrodeluna.es
Orientación	GUNTIÑAS LASECA, Mª Mar	mguntinas@iespedrodeluna.es
Orientación	LORENTE GRACIA, Luis	llorente@iespedrodeluna.es
Orientación	CÁRDENAS SANZ, Alicia	acardenas@iespedrodeluna.es
Orientación	MARTÍNEZ GLARIA, Sara Mª	smmartinez@iespedrodeluna.es
orientación	ASO RUBIO, Patricia	paso@iespedrodeluna.es
orientación		
Religión	GIMENO TORRIJO, Mª Pilar	mpgimeno@iespedrodeluna.es
Religión	RENGIFO NIMBOMA, Mª Zulema	mzrengifo@iespedrodeluna.es
Tecnología	BANDRÉS LARRAZ, Loreto	lbandres@iespedrodeluna.es
Tecnología	GARCÍA HERNÁNDEZ, Felipe Ángel	fagarcia@iespedrodeluna.es
Tecnología	PLANELLES CALOMARDE, Beatriz	beaplaca@iespedrodeluna.es
Tecnología	LATRE CLEMENTE, Rafael	rlatre@iespedrodeluna.es
Tecnología	ROS LATIENDA, Paloma	pros@iespedrodeluna.es
Tecnología	CASTRO CORDERO, José Alberto	jacastro@iespedrodeluna.es
Tecnología	LABORDA MARTINEZ, Patricia	plaborda@iespedrodeluna.es
Tecnología	MORENO LOSCERTALES, José María	jmmoreno@iespedrodeluna.es
Tecnología	CEAMANOS GAYA, Jesús	jceamanos@iespedrodeluna.es`;

function toTitleCase(str) {
  if (!str) return '';
  const lowerWords = ['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'da', 'do', 'san', 'santa'];
  return str.trim().split(/\s+/).map((word, idx) => {
    const wLower = word.toLowerCase();
    if (idx > 0 && lowerWords.includes(wLower)) return wLower;
    if (wLower === 'mª' || wLower === 'mª.') return 'Mª';
    if (wLower === 'dª' || wLower === 'dª.') return 'Dª';
    if (wLower === 'v.') return 'V.';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function formatName(rawName) {
  if (!rawName) return '';
  if (rawName.includes(',')) {
    const parts = rawName.split(',');
    const apellidos = parts[0].trim();
    const nombre = parts.slice(1).join(',').trim();
    return toTitleCase(nombre) + ' ' + toTitleCase(apellidos);
  }
  return toTitleCase(rawName);
}

function normalizeDept(dept) {
  if (!dept) return 'SIN DEPARTAMENTO';
  const d = dept.trim().toLowerCase();
  if (d.includes('plást') || d.includes('plast')) return 'Artes Plásticas';
  if (d.includes('biolog') || d.includes('geolog')) return 'Biología y Geología';
  if (d.includes('econom')) return 'Economía';
  if (d.includes('físic') && d.includes('quím')) return 'Física y Química';
  if (d.includes('educación física') || d.includes('ef')) return 'Educación Física';
  if (d.includes('filosof')) return 'Filosofía';
  if (d.includes('franc')) return 'Francés';
  if (d.includes('geograf') || d.includes('histor')) return 'Geografía e Historia';
  if (d.includes('hostel')) return 'Hostelería y Turismo';
  if (d.includes('ingl')) return 'Inglés';
  if (d.includes('lat')) return 'Latín y Griego';
  if (d.includes('lengua')) return 'Lengua y Literatura';
  if (d.includes('matem')) return 'Matemáticas';
  if (d.includes('músic') || d.includes('music')) return 'Música';
  if (d.includes('orientac')) return 'Orientación';
  if (d.includes('religi')) return 'Religión';
  if (d.includes('tecnolog')) return 'Tecnología';
  return toTitleCase(dept);
}

async function run() {
  const path = require('path');
  const envPath = path.resolve(__dirname, '../ies_pedro_de_luna/.env');
  const env = fs.readFileSync(envPath, 'utf-8');
  const url = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/)?.[1]?.trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/)?.[1]?.trim();
  const sb = createClient(url, key);

  // 1. Fetch current DB teachers
  const { data: existingTeachers, error: fetchErr } = await sb.from('Profesores').select('*');
  if (fetchErr) {
    console.error('Error fetching existing teachers:', fetchErr);
    return;
  }
  console.log(`Current teachers in DB: ${existingTeachers.length}`);
  const existingByEmail = new Map();
  for (const t of existingTeachers) {
    if (t.email) existingByEmail.set(t.email.toLowerCase().trim(), t);
  }

  // 2. Parse incoming raw list
  const lines = rawData.split('\n').filter(l => l.trim().length > 0);
  const parsedList = [];
  const seenEmails = new Set();

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const rawDept = parts[0]?.trim();
    const rawName = parts[1]?.trim();
    let email = (parts[2] || '').trim().toLowerCase();
    
    if (!rawName || !email) continue;
    
    // Fix typos like mfelez@iespedrodeluna.e -> mfelez@iespedrodeluna.es
    if (email.endsWith('.e')) email += 's';
    if (!email.includes('@')) continue;
    
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    
    const name = formatName(rawName);
    const dept = normalizeDept(rawDept);
    
    parsedList.push({ name, email, department: dept });
  }

  console.log(`Parsed ${parsedList.length} valid teachers from clipboard.`);

  // 3. Find max numeric ID
  let maxNum = 0;
  for (const t of existingTeachers) {
    if (t.id && t.id.startsWith('P')) {
      const num = parseInt(t.id.substring(1), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  // 4. Prepare list of records to insert or keep
  const toInsert = [];
  const existingMatches = [];

  for (const item of parsedList) {
    const existing = existingByEmail.get(item.email);
    if (existing) {
      existingMatches.push({ item, existing });
    } else {
      maxNum++;
      const id = `P${maxNum.toString().padStart(3, '0')}`;
      toInsert.push({
        id,
        'nombre y apellidos': item.name,
        email: item.email,
        departamento: item.department,
        rol: 'Docente',
        horas_guardia: 1,
        activo: true
      });
    }
  }

  console.log(`Existing matches (will NOT duplicate): ${existingMatches.length}`);
  existingMatches.forEach(m => console.log(` - ${m.existing.id}: ${m.existing['nombre y apellidos']} (${m.existing.email}) [Rol: ${m.existing.rol}]`));
  console.log(`New teachers to insert: ${toInsert.length}`);
  console.log('Sample to insert (first 5):', toInsert.slice(0, 5));
  console.log('Sample to insert (last 5):', toInsert.slice(-5));

  // Check unique departments
  const allDepts = [...new Set(parsedList.map(p => p.department))].sort();
  console.log('Departments to ensure in Materias table:', allDepts);
}

run();
