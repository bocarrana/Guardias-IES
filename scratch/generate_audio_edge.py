import os
import asyncio
import edge_tts

AUDIO_DIR = os.path.join(os.path.dirname(__file__), '..', 'promo_screenshots', 'audio')
VOICE = "es-ES-AlvaroNeural" # Voz masculina muy natural en español de España

escenas = [
    {
        'id': '01_intro',
        'texto': 'Guardias IES Aragón. Una plataforma diseñada por profesores aragoneses, pensada para las necesidades reales de los centros educativos de Aragón. ¿Gestionar las guardias todavía te lleva horas de papeleo?'
    },
    {
        'id': '02_login',
        'texto': 'Presentamos Guardias IES Aragón: la plataforma digital diseñada especialmente para los institutos de educación secundaria de Aragón. Acceso seguro e instantáneo para todo el equipo docente.'
    },
    {
        'id': '03_modo_demo',
        'texto': 'El sistema permite múltiples perfiles de acceso: docentes, jefatura de estudios, administración y pantalla de sala de profesores. Cada rol ve exactamente lo que necesita, sin más información de la necesaria.'
    },
    {
        'id': '04_panel_principal',
        'texto': 'Desde el Panel de Guardias, el equipo docente tiene una visión clara y en tiempo real de todas las ausencias del día. El sistema detecta automáticamente la franja horaria activa y la muestra de forma destacada.'
    },
    {
        'id': '05_proximas',
        'texto': 'La pestaña de Próximas Guardias avisa con antelación de las ausencias programadas. El profesorado puede ver qué le corresponde cubrir y prepararse con tiempo.'
    },
    {
        'id': '06_pendientes',
        'texto': 'Las guardias sin cubrir aparecen destacadas en la vista de Pendientes. Cualquier profesor disponible puede reclamarlas con un solo clic, sin necesidad de llamadas ni gestiones manuales.'
    },
    {
        'id': '07_nueva_guardia',
        'texto': 'Registrar una nueva ausencia es un proceso guiado de menos de treinta segundos. Se selecciona la fecha, la franja, el aula y el grupo afectado. El sistema valida automáticamente la disponibilidad del profesorado.'
    },
    {
        'id': '08_historial',
        'texto': 'Cada guardia queda registrada con todos sus detalles: profesor sustituto, grupo atendido, tarea dejada y observaciones. El historial es inmutable y sirve como registro oficial del centro.'
    },
    {
        'id': '09_cuadrante',
        'texto': 'La vista de Grupos por Franja Horaria muestra el cuadrante de guardia completo del centro: quién está de guardia en cada hora, en cada edificio y para cada grupo. Todo de un vistazo.'
    },
    {
        'id': '10_mis_guardias',
        'texto': 'Cada docente tiene su propio espacio personal con el resumen de Mis Guardias: las que ha realizado, las que tiene asignadas y su historial individual del curso.'
    },
    {
        'id': '11_mi_horario',
        'texto': 'La sección Mi Horario permite a cada profesor consultar su carga semanal y sus horas de guardia asignadas, con compatibilidad directa con el sistema de asignación automática.'
    },
    {
        'id': '12_estadisticas_personales',
        'texto': 'El panel de Estadísticas ofrece a cada docente un resumen visual de su actividad: guardias realizadas, pendientes, por tipo y por franja horaria.'
    },
    {
        'id': '13_estadisticas_globales',
        'texto': 'La Jefatura de Estudios dispone de una vista global del centro con gráficos interactivos: distribución de guardias por tipo, carga por franja horaria y evolución durante todo el curso escolar. Todo exportable a PDF.'
    },
    {
        'id': '14_calendario',
        'texto': 'El Calendario Escolar integrado refleja todos los días lectivos, festivos oficiales de Aragón, eventos del centro y periodos de vacaciones. La Jefatura puede configurarlo directamente desde la aplicación.'
    },
    {
        'id': '15_profesorado',
        'texto': 'El Directorio de Profesorado centraliza toda la información del claustro: nombre, departamento, grupo de guardia asignado, rol y estado. Disponible en todo momento para toda la comunidad docente.'
    },
    {
        'id': '16_libre_disposicion',
        'texto': 'El módulo de Libre Disposición gestiona de forma transparente los días de permiso del profesorado. El sistema controla automáticamente los cupos máximos y genera las guardias sustitutivas correspondientes.'
    },
    {
        'id': '17_aulas_libres',
        'texto': '¿Necesitas un aula para una actividad especial? La sección de Aulas Libres muestra en tiempo real qué espacios están disponibles por franja horaria, con la posibilidad de realizar reservas directamente.'
    },
    {
        'id': '18_plano',
        'texto': 'El Mapa Interactivo del centro permite navegar por cada planta del edificio y consultar el estado de cada aula en tiempo real. Perfecto para la pantalla de sala de profesores.'
    },
    {
        'id': '19_admin',
        'texto': 'Los administradores disponen de un panel de control completo: gestión del calendario escolar, configuración de franjas horarias, importación de horarios, auditoría de actividad y mucho más.'
    },
    {
        'id': '20_cierre',
        'texto': 'Guardias IES Aragón es la solución moderna y segura que tu instituto necesita. Hecha con orgullo por y para nuestra comunidad educativa aragonesa. Solicita una demo personalizada para tu centro hoy mismo.'
    }
]

async def generate_audio():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    print(f"🎙️ Generando narración con Edge TTS (Voz: {VOICE})...")
    
    ok = 0
    for i, escena in enumerate(escenas):
        file_path = os.path.join(AUDIO_DIR, f"{escena['id']}.mp3")
        
        try:
            communicate = edge_tts.Communicate(escena['texto'], VOICE)
            await communicate.save(file_path)
            print(f"✅ [{i+1}/{len(escenas)}] {escena['id']}.mp3")
            ok += 1
        except Exception as e:
            print(f"❌ [{i+1}/{len(escenas)}] {escena['id']}: Error - {str(e)}")

    print(f"\n🎉 Audio generado: {ok}/{len(escenas)} escenas")
    print(f"📁 Guardado en: {os.path.abspath(AUDIO_DIR)}")

if __name__ == "__main__":
    asyncio.run(generate_audio())
