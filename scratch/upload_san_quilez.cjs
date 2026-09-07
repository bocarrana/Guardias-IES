const fs = require('fs');

const env = fs.readFileSync('ies_sierra_de_san_quilez/.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=([^\r\n]+)/)?.[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/)?.[1];

const rawData = `Abigail	Lopez Ibarz	abigail.lopez@iesbinefar.es	INGLÉS	
AINARA	MEDOZA	ainara.mendoza@iesbinefar.es	ORIENTACIÓN	
ALBA MARIA	TABOADA PRIETO	alba.taboada@iesbinefar.es	LENGUA	
ALBERTO	GALICIA ALBERT	alberto.galicia@iesbinefar.es	MATEMÁTICAS	
ALBERTO	FERRAZ MOLINA	alberto.ferraz@iesbinefar.es	ORIENTACIÓN	
Ana	Carrasquer Senar	ana.carrasquer@iesbinefar.es	LENGUA	
ANA	TORRES PERE	ana.torres@iesbinefar.es	INGLÉS	
Ana Maria	Tornos Cullere	anamaria.tornos@iesbinefar.es	MÚSICA	
ANABEL	ALBERO	anabel.albero@iesbinefar.es	E.FÍSICA	
ANDREA	ABENOZA MUR	andrea.abenoza@iesbinefar.es	INGLÉS	
ANDREA	PLATA GABAS	andrea.plata@iesbinefar.es	MATEMÁTICAS	
ANNA	PARRAS MARTINEZ	anna.parras@iesbinefar.es	LENGUA	
ANTONIO	DIAZ MERINO	antonio.diaz@iesbinefar.es	TECNOLOGÍA	
ASIER	GIMENO ERBURU	asier.gimeno@iesbinefar.es	IMA	
BARBARA	CASAS FLORIA	barbara.casas@iesbinefar.es	INGLÉS	
BEATRIZ	SALANOVA ARDANUY	beatriz.salanova@iesbinefar.es	FILOSOFÍA	
BERENICE	TIERNO RIOS	berenice.tierno@iesbinefar.es	FRANCÉS	
BERNARDO	POSA CARDIEL	bernardo.posa@iesbinefar.es	ECONOMÍA	
CELIA	ALVAREZ RODRIGUEZ	celia.alvarez@iesbinefar.es	MÚSICA	
Cristina	Santoveña Sanchez	cristina.santovena@iesbinefar.es	PELUQUERÍA	
Cristina	Piedrafita Claveria	cristina.piedrafita@iesbinefar.es	TECNOLOGÍA	
DAVID	COMA FOLGUERA	david.coma@iesbinefar.es	INGLÉS	
David	Gimeno Clua	david.gimeno@iesbinefar.es	ORIENTACIÓN	
ELIAS	LACASTA CASTERAD	elias.lacasta@iesbinefar.es	FÍSICA Y QUÍMICA	
ESTER	POLAINA LACAMBRA	ester.polaina@iesbinefar.es	BIOLOGÍA	
FRANCISCO JAVIER	SANDEZ SIEIRO	franciscojavier.sandez@iesbinefar.es	TECNOLOGÍA	
Guillermo	Jubero Garreta	guillermo.jubero@iesbinefar.es	HISTORIA	
INGRID	GRUAS	ingrid.gruas@iesbinefar.es	HISTORIA	
ISABEL	CALVILLO OLMEDO	isabel.calvillo@iesbinefar.es	INGLÉS	
Isabel	Sese Monclus	isabel.sese@iesbinefar.es	MATEMÁTICAS	
ISABEL	RUIZ CERRILLO	isabel.ruiz@iesbinefar.es	LATÍN	
JASON	BAUTISTA VERA	jason.bautista@iesbinefar.es	FILOSOFÍA	
JAVIER	CHINE MESTRES	javier.chine@iesbinefar.es	IMA	
Javier	Cristobal	javier.cristobal@iesbinefar.es	IMA	
JENNY	MARTINEZ ADELL	jenny.martinez@iesbinefar.es	PELUQUERÍA	
JOSE AGUSTIN	ALDAZ GONI	joseagustin.aldaz@iesbinefar.es	MATEMÁTICAS	
Jose Antonio	Oliva Martin	joseantonio.oliva@iesbinefar.es	ORIENTACIÓN	
Jose Emilio	Castillon Solano	joseemilio.castillon@iesbinefar.es	TECNOLOGÍA	
JOSÉ LUIS	IBAÑEZ PONS	joseluis.ibanez@iesbinefar.es	MATEMÁTICAS	
JOSÉ MANUEL	GORJON SANZ	josemanuel.gorjon@iesbinefar.es	E. FÍSICA	
JUAN DE LA CRUZ	IRAZABAL VILLAR	juandelacruz.irazabal@iesbinefar.es	E. PLÁSTICA	
JULIA	BARRIO RUIZ DE VIÑASPRE	julia.barrio@iesbinefar.es	IMA	
LAURA	VILALTA RODELLAR	laura.vilalta@iesbinefar.es	FOL	
Lidia	Borruel Mairal	lidia.borruel@iesbinefar.es	E. FÍSICA	
LOURDES	CARRASQUER	lourdes.carrasquer@iesbinefar.es	E. FÍSICA	
LOURDES	SANCHEZ DE LOS SANTOS	lourdes.sanchez@iesbinefar.es	E. FÍSICA	
Lucia	Oliva	lucia.oliva@iesbinefar.es	PELUQUERÍA	
LUCIA	GRACIA SALAZAR	lucia.graciasalazar@iesbinefar.es	E. PLÁSTICA	
LUIS	ORUS CALVET,	luis.orus@iesbinefar.es	MÚSICA	
LUIS MIGUEL	CLEMENTE ALJARO	luismi.clemente@iesbinefar.es	LENGUA	
Manuel	Buil Trigo	manuel.buil@iesbinefar.es	BIOLOGÍA	
MARIA	DUESO	maria.dueso@iesbinefar.es	ORIENTACIÓN	
Maria Carmen	Tornos Mola	mariacarmen.tornos@iesbinefar.es	HISTORIA	
Maria Dolores	Vazquez Miranda	mariadolores.vazquez@iesbinefar.es	LENGUA	
Maria Dolores	Raso Escur	mariadolores.raso@iesbinefar.es	INGLÉS	
Maria Jesus	Garces Ramos	mariajesus.garces@iesbinefar.es	HISTORIA	
Maria Jose	Paniello Alastruey	mariajose.paniello@iesbinefar.es	FÍSICA Y QUÍMICA	
MARINA	SOPESENS VINOS	marina.sopesens@iesbinefar.es	FRANCÉS	
MARTA	IBARZ	marta.ibarz@iesbinefar.es	LENGUA	
MARÍA DEL PILAR	MIGUEL CASANOVA	mariadelpilar.miguel@iesbinefar.es	LENGUA	
MIGUEL ANGEL	GOMEZ SASO	miguelangel.gomez@iesbinefar.es	FÍSICA Y QUÍMICA	
MONTSERRAT	BAÑERES FARRERO	montserrat.baneres@iesbinefar.es	TECNOLOGÍA	
Montserrat	Martinez Cordero	montserrat.martinez@iesbinefar.es	RELIGIÓN	
Natalia	Carrera	natalia.carrera@iesbinefar.es	ORIENTACIÓN	
PABLO	RODRIGO CARDONA	pablo.rodrigo@iesbinefar.es	INGLÉS	
PATRICIA	SALAMERO AGUAYOS	patricia.salamero@iesbinefar.es	ORIENTACIÓN	
RAQUEL	PRATS AVILLA	raquel.prats@iesbinefar.es	E. PLÁSTICA	
RAQUEL	GARCIA PERALES	raquel.garcia@iesbinefar.es	LENGUA	
RAQUEL	ABADIAS IBARBIA	raquel.abadias@iesbinefar.es	FÍSICA Y QUÍMICA	
ROI	SILVA CASAL	roi.silva@iesbinefar.es	BIOLOGÍA	
SAMUEL	CESTER AGUIRRE	samuel.cester@iesbinefar.es	ECONOMÍA	
SAMUEL	GARCIA LASHERAS	samuel.garcia@iesbinefar.es	HISTORIA	
Sandhya	Carmona Ogalla	sandhya.carmona@iesbinefar.es	LENGUA	
SANDRA	ESPADA SENAR	sandra.espada@iesbinefar.es	ORIENTACIÓN	
SANDRA	CLAVER ROMEO	sandra.claver@iesbinefar.es	BIOLOGÍA	
SANTIAGO	FELEZ MOLINER	santiago.felez@iesbinefar.es	MATEMÁTICAS	
SANTIAGO	MARTIN ULECIA	santiago.martin@iesbinefar.es	RELIGIÓN	
SERGIO	BLAZQUEZ	sergio.blazquez@iesbinefar.es	IMA	
TERESA	BERNUES ALCOLEA	teresa.bernues@iesbinefar.es	HISTORIA	
Yolanda	Salas Herbera	yolanda.salas@iesbinefar.es	MATEMÁTICAS	
Yolanda	Marias Ferrer	yolanda.marias@iesbinefar.es	MATEMÁTICAS	JEFATURA
ROCIO 	GUARNÉ CHAVERRI	rocio.guarne@iesbinefar.es	LENGUA	JEFATURA
SARA	SAMITIER BOIX	sara.samitier@iesbinefar.es	LENGUA	DIRECCIÓN
SUSANA	SANZ MOROS	susana.sanz@iesbinefar.es	TECNOLOGÍA	SECRETARIA
JOSÉ RAMÓN 	BARRABÉS CAMPO	joseramon.barrabes@iesbinefar.es	IMA	JEFATURA
ARACELI	MUÑOZ JIMÉNEZ	araceli.munoz@iesbinefar.es	MATEMÁTICAS	
JUAN JOSÉ	NIETO CALLÉN	juanjose.nieto@iesbinefar.es	HISTORIA	
SAMUEL	VILLABRILLE NAHARRO	samuel.villabrille@iesbinefar.es	API	
JORGE	CALVO MARTÍN	jorge.calvo@iesbinefar.es	FÍSICA Y QUÍMICA	
ROSABEL	SANCHO LOSTAL	rosabel.sancho@iesbinefar.es	PELUQUERÍA	`;

function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (['de', 'del', 'la', 'las', 'los', 'y', 'e'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function cleanDepartment(dept) {
  const d = (dept || '').trim().toUpperCase();
  if (d === 'E.FÍSICA' || d === 'E. FÍSICA') return 'Educación Física';
  if (d === 'E. PLÁSTICA' || d === 'E.PLASTICA') return 'Educación Plástica';
  if (d === 'FÍSICA Y QUÍMICA' || d === 'FISICA Y QUIMICA') return 'Física y Química';
  if (d === 'LENGUA') return 'Lengua Castellana y Literatura';
  if (d === 'MATEMÁTICAS' || d === 'MATEMATICAS') return 'Matemáticas';
  if (d === 'INGLÉS' || d === 'INGLES') return 'Inglés';
  if (d === 'FRANCÉS' || d === 'FRANCES') return 'Francés';
  if (d === 'HISTORIA') return 'Geografía e Historia';
  if (d === 'BIOLOGÍA' || d === 'BIOLOGIA') return 'Biología y Geología';
  if (d === 'MÚSICA' || d === 'MUSICA') return 'Música';
  if (d === 'TECNOLOGÍA' || d === 'TECNOLOGIA') return 'Tecnología';
  if (d === 'ORIENTACIÓN' || d === 'ORIENTACION') return 'Orientación';
  if (d === 'FILOSOFÍA' || d === 'FILOSOFIA') return 'Filosofía';
  if (d === 'LATÍN' || d === 'LATIN') return 'Latín y Griego';
  if (d === 'ECONOMÍA' || d === 'ECONOMIA') return 'Economía';
  if (d === 'RELIGIÓN' || d === 'RELIGION') return 'Religión';
  if (d === 'IMA') return 'IMA';
  if (d === 'FOL') return 'FOL';
  if (d === 'PELUQUERÍA' || d === 'PELUQUERIA') return 'Peluquería';
  if (d === 'API') return 'API';
  return titleCase(dept);
}

const lines = rawData.trim().split('\n');
const parsed = lines.map((line, idx) => {
  const parts = line.split('\t').map(p => p.trim());
  let firstName = parts[0] || '';
  let lastName = parts[1] || '';
  let email = (parts[2] || '').toLowerCase().trim();
  let deptRaw = parts[3] || '';
  let cargo = (parts[4] || '').toUpperCase().trim();

  lastName = lastName.replace(/,+$/, '');

  let fullName = titleCase(`${firstName} ${lastName}`);
  fullName = fullName.replace('Medoza', 'Mendoza');

  let rol = 'Docente';
  let guardGroup = 'Profesorado';

  if (cargo === 'JEFATURA' || cargo === 'DIRECCIÓN' || cargo === 'DIRECCION' || cargo === 'SECRETARIA') {
    rol = 'Jefatura';
    guardGroup = 'Equipo Directivo';
  }

  const dept = cleanDepartment(deptRaw);
  const id = `prof_${String(idx + 1).padStart(2, '0')}`;

  return {
    id,
    "nombre y apellidos": fullName,
    email,
    departamento: dept,
    "grupo de guardia": guardGroup,
    rol,
    horas_guardia: 1,
    activo: true
  };
});

async function uploadTeachers() {
  console.log(`Subiendo ${parsed.length} profesores a ${url}...`);

  // Try bulk insert
  const res = await fetch(url + '/rest/v1/Profesores', {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(parsed)
  });

  if (res.ok) {
    console.log(`✔ ¡Éxito total! Se han insertado/actualizado los ${parsed.length} profesores correctamente.`);
  } else {
    const errorText = await res.text();
    console.error(`Error (${res.status}):`, errorText);
  }
}

uploadTeachers();
