import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'promo_screenshots', 'audio');
const API_KEY = process.env.GEMINI_API_KEY;

// Escenas del guión con su narración
const escenas = [
    {
        id: '01_intro',
        texto: '¿Gestionar las guardias de tu IES todavía te lleva horas de papeleo?'
    },
    {
        id: '02_login',
        texto: 'Presentamos Guardias IES Aragón: la plataforma digital diseñada especialmente para los institutos de educación secundaria de Aragón. Acceso seguro e instantáneo para todo el equipo docente.'
    },
    {
        id: '03_modo_demo',
        texto: 'El sistema permite múltiples perfiles de acceso: docentes, jefatura de estudios, administración y pantalla de sala de profesores. Cada rol ve exactamente lo que necesita, sin más información de la necesaria.'
    },
    {
        id: '04_panel_principal',
        texto: 'Desde el Panel de Guardias, el equipo docente tiene una visión clara y en tiempo real de todas las ausencias del día. El sistema detecta automáticamente la franja horaria activa y la muestra de forma destacada.'
    },
    {
        id: '05_proximas',
        texto: 'La pestaña de Próximas Guardias avisa con antelación de las ausencias programadas. El profesorado puede ver qué le corresponde cubrir y prepararse con tiempo.'
    },
    {
        id: '06_pendientes',
        texto: 'Las guardias sin cubrir aparecen destacadas en la vista de Pendientes. Cualquier profesor disponible puede reclamarlas con un solo clic, sin necesidad de llamadas ni gestiones manuales.'
    },
    {
        id: '07_nueva_guardia',
        texto: 'Registrar una nueva ausencia es un proceso guiado de menos de treinta segundos. Se selecciona la fecha, la franja, el aula y el grupo afectado. El sistema valida automáticamente la disponibilidad del profesorado.'
    },
    {
        id: '08_historial',
        texto: 'Cada guardia queda registrada con todos sus detalles: profesor sustituto, grupo atendido, tarea dejada y observaciones. El historial es inmutable y sirve como registro oficial del centro.'
    },
    {
        id: '09_cuadrante',
        texto: 'La vista de Grupos por Franja Horaria muestra el cuadrante de guardia completo del centro: quién está de guardia en cada hora, en cada edificio y para cada grupo. Todo de un vistazo.'
    },
    {
        id: '10_mis_guardias',
        texto: 'Cada docente tiene su propio espacio personal con el resumen de Mis Guardias: las que ha realizado, las que tiene asignadas y su historial individual del curso.'
    },
    {
        id: '11_mi_horario',
        texto: 'La sección Mi Horario permite a cada profesor consultar su carga semanal y sus horas de guardia asignadas, con compatibilidad directa con el sistema de asignación automática.'
    },
    {
        id: '12_estadisticas_personales',
        texto: 'El panel de Estadísticas ofrece a cada docente un resumen visual de su actividad: guardias realizadas, pendientes, por tipo y por franja horaria.'
    },
    {
        id: '13_estadisticas_globales',
        texto: 'La Jefatura de Estudios dispone de una vista global del centro con gráficos interactivos: distribución de guardias por tipo, carga por franja horaria y evolución durante todo el curso escolar. Todo exportable a PDF.'
    },
    {
        id: '14_calendario',
        texto: 'El Calendario Escolar integrado refleja todos los días lectivos, festivos oficiales de Aragón, eventos del centro y periodos de vacaciones. La Jefatura puede configurarlo directamente desde la aplicación.'
    },
    {
        id: '15_profesorado',
        texto: 'El Directorio de Profesorado centraliza toda la información del claustro: nombre, departamento, grupo de guardia asignado, rol y estado. Disponible en todo momento para toda la comunidad docente.'
    },
    {
        id: '16_libre_disposicion',
        texto: 'El módulo de Libre Disposición gestiona de forma transparente los días de permiso del profesorado. El sistema controla automáticamente los cupos máximos y genera las guardias sustitutivas correspondientes.'
    },
    {
        id: '17_aulas_libres',
        texto: '¿Necesitas un aula para una actividad especial? La sección de Aulas Libres muestra en tiempo real qué espacios están disponibles por franja horaria, con la posibilidad de realizar reservas directamente.'
    },
    {
        id: '18_plano',
        texto: 'El Mapa Interactivo del centro permite navegar por cada planta del edificio y consultar el estado de cada aula en tiempo real. Perfecto para la pantalla de sala de profesores.'
    },
    {
        id: '19_admin',
        texto: 'Los administradores disponen de un panel de control completo: gestión del calendario escolar, configuración de franjas horarias, importación de horarios, auditoría de actividad y mucho más.'
    },
    {
        id: '20_cierre',
        texto: 'Guardias IES Aragón es la solución moderna, segura y eficiente que tu instituto necesita. Desarrollada con las últimas tecnologías web, con datos protegidos bajo el Reglamento General de Protección de Datos y accesible desde cualquier dispositivo. Solicita una demo personalizada para tu centro.'
    }
];

async function generateAudio(genAI, escena) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: escena.texto }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: 'Charon' // Voz masculina en español
                    }
                }
            }
        }
    });

    const audioData = result.response.candidates[0].content.parts[0].inlineData.data;
    const buffer = Buffer.from(audioData, 'base64');
    const filePath = path.join(AUDIO_DIR, `${escena.id}.mp3`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

const DELAY_MS = 22000; // 22s entre peticiones → máximo ~2.7 req/min (límite: 3/min)

async function generateAudioWithRetry(genAI, escena, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await generateAudio(genAI, escena);
        } catch (err) {
            if (err.message.includes('429') && attempt < maxRetries) {
                const waitSec = 60;
                console.log(`  ⏳ Límite alcanzado. Esperando ${waitSec}s antes de reintentar (intento ${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitSec * 1000));
            } else {
                throw err;
            }
        }
    }
}

async function main() {
    if (!API_KEY) {
        console.error('❌ GEMINI_API_KEY no definida. Ejecútalo con: $env:GEMINI_API_KEY="tu-clave" ; node script.js');
        process.exit(1);
    }

    // Crear carpeta de audio si no existe
    if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

    const totalMin = Math.ceil((escenas.length * DELAY_MS) / 60000);
    console.log(`🎙️  Generando narración con Gemini TTS...`);
    console.log(`⏱️  Tiempo estimado: ~${totalMin} minutos (límite del tier gratuito: 3 req/min)\n`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    let ok = 0;

    for (let i = 0; i < escenas.length; i++) {
        const escena = escenas[i];
        // Comprobar si ya existe el archivo (para no regenerar en reinicios)
        const filePath = path.join(AUDIO_DIR, `${escena.id}.mp3`);
        if (fs.existsSync(filePath)) {
            console.log(`⏭️  ${escena.id}.mp3 (ya existe, omitiendo)`);
            ok++;
            continue;
        }

        try {
            await generateAudioWithRetry(genAI, escena);
            console.log(`✅ [${i + 1}/${escenas.length}] ${escena.id}.mp3`);
            ok++;
        } catch (err) {
            console.error(`❌ [${i + 1}/${escenas.length}] ${escena.id}: ${err.message.split('\n')[0]}`);
        }

        // Esperar entre peticiones (excepto en la última)
        if (i < escenas.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n🎉 Audio generado: ${ok}/${escenas.length} escenas`);
    console.log(`📁 Guardado en: ${AUDIO_DIR}`);
}

main();
