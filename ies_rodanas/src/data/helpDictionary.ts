export interface HelpPage {
    title?: string;
    badge?: string;
    description?: string;
    bullets?: string[];
    tip?: string;
}

export interface HelpItem {
    id: string;
    title: string;
    description: string;
    bullets?: string[];
    tip?: string;
    badge?: string;
    icon?: string; // Icon identifier
    category?: 'docentes' | 'tv' | 'jefatura' | 'general';
    pages?: HelpPage[];
}

export const HELP_ITEMS: Record<string, HelpItem> = {
    // ─── PETICIÓN DE GUARDIAS ────────────────────────────────
    'guard_types': {
        id: 'guard_types',
        title: 'Tipos de Guardia: Ordinaria vs Convivencia',
        description: 'Diferencia el tipo de atención que requiere la ausencia:',
        bullets: [
            '🏛️ Ordinaria: Sustitución de una clase lectiva en el aula del grupo, siguiendo las tareas que el profesor ausente haya dejado.',
            '🛡️ Convivencia: Atención en el Aula de Convivencia a alumnado derivado o con medidas específicas.',
        ],
        tip: 'Las horas de recreo o de guardia de patio no generan tarjeta de sustitución, ya que son vigilancias internas asignadas por cuadrante.',
        badge: 'Tipos de guardia',
        category: 'docentes',
    },
    'guard_multi_select': {
        id: 'guard_multi_select',
        title: 'Selección de toda la jornada',
        description: 'Puedes solicitar las guardias de todo tu día en un solo paso:',
        bullets: [
            'Pulsa "Seleccionar toda la jornada" para marcar todas las clases lectivas de ese día.',
            'Escribe las tareas comunes o específicas que deben realizar los alumnos en tu ausencia.',
            'Puedes adjuntar un archivo (PDF, imagen o documento) con las actividades preparadas.',
        ],
        tip: 'El sistema filtra automáticamente tus horas y solo seleccionará tus clases lectivas con alumnado, ignorando recreos y horas de guardia.',
        badge: 'Jornada completa',
        category: 'docentes',
    },

    // ─── MODOS DE ASIGNACIÓN Y RANKING ───────────────────────
    'assignment_modes': {
        id: 'assignment_modes',
        title: 'Criterios de Asignación y Ranking',
        description: 'Cómo calcula el sistema el orden y prioridad de los profesores de guardia:',
        bullets: [
            '⭐ Modo Recomendado: Ordena a los docentes disponibles priorizando a quienes llevan menos guardias realizadas en el curso (equidad).',
            '🎲 Modo Aleatorio: Selecciona al azar entre el profesorado disponible en esa franja horaria.',
            '🏅 Ranking Claustro: Muestra el podio con medallas de oro, plata y bronce según guardias acumuladas.',
        ],
        tip: 'El sistema pondera automáticamente las guardias de convivencia y ordinarias para mantener el equilibrio en el reparto.',
        badge: 'Algoritmo de equidad',
        category: 'docentes',
    },

    // ─── PANTALLA TV SALA DE PROFESORES ──────────────────────
    'tv_instructions': {
        id: 'tv_instructions',
        title: 'Panel Táctil de Sala de Profesores',
        description: 'Guía interactiva de uso y acciones para la pantalla táctil de TV:',
        badge: 'Pantalla táctil TV',
        category: 'tv',
        pages: [
            {
                badge: '1/4 · Recogida y Asignación',
                title: 'Recogida Rápida de Guardias',
                description: 'Asignación táctil inmediata al pasar por la sala:',
                bullets: [
                    '👆 Toque en "PEND": Pulsa sobre una guardia disponible en azul para abrir la lista de docentes y asignártela en 1 solo toque.',
                    '⏰ Margen de 25 minutos: Puedes recoger guardias de la siguiente hora durante los minutos previos o recreo sin avisos.',
                    '❌ Soltar guardia: Pulsa el botón "SOLTAR" o "✕" en la guardia asignada si te equivocaste de nombre al pulsar.',
                    '🎲 Modo Recomendado / Azar: Botón circular junto a "Prof. Guardia" para alternar asignación por equidad o aleatoria.',
                ],
                tip: 'El selector recomienda primero a los profesores con menos guardias en ese tramo para garantizar el reparto equitativo.',
            },
            {
                badge: '2/4 · Franjas y Tipos de Guardia',
                title: 'Diferenciación de Franjas y Alertas',
                description: 'Identificación visual rápida de cada tipo de hora:',
                bullets: [
                    '☕ Recreos en Ámbar: Las franjas de recreo se distinguen en color ámbar/dorado con icono de café y etiqueta RECREO.',
                    '🟣 Convivencia: Identificadas con chapa púrpura CONVIVENCIA (con su propio cómputo y turno independiente).',
                    '⚡ Franja actual (AHORA): La columna de la hora en curso aparece iluminada con borde brillante cian.',
                    '🚨 Aviso Jefatura: Alerta roja parpadeante si hay más ausencias que profesores disponibles en esa franja.',
                ],
                tip: 'Si intentas recoger una guardia de una hora muy lejana, el sistema te pedirá confirmación para evitar errores de toque.',
            },
            {
                badge: '3/4 · Profesores de Guardia',
                title: 'Avatares e Información Docente',
                description: 'Consulta el estado y guardias del claustro en la franja:',
                bullets: [
                    '👤 Toque en el Avatar: Pulsa sobre la foto de cualquier profesor para desplegar su tarjeta con información detallada.',
                    '🔢 Contadores de Grupo: Muestra las guardias de aula (chapa cian) y convivencia (chapa púrpura) realizadas en ese tramo horario.',
                    '🟢 Estado en tiempo real: Indica si el profesor está libre, cubriendo una guardia ("Cubriendo aula X") o si ya la ha completado ("✓ Realizada").',
                    '↔️ Carrusel táctil: Si hay muchos profesores asignados, puedes deslizar los avatares horizontalmente con el dedo.',
                ],
                tip: 'Los contadores mostrados en la tarjeta del docente corresponden a ese turno específico (día y franja) para máxima transparencia.',
            },
            {
                badge: '4/4 · Tareas, Plano y Pantalla Completa',
                title: 'Tareas, Plano de Aula y Modo TV',
                description: 'Acceso a materiales, mapas y visualización:',
                bullets: [
                    '📎 Iconos de Tarea: Bandeja naranja (tarea física en conserjería), clip cian (archivo digital adjunto) o capas (ambas).',
                    '💬 Observaciones: Pulsa el bocadillo verde para leer las indicaciones pedagógicas dejadas por el docente ausente.',
                    '📍 Plano de Aula: Toca sobre el nombre del aula para ver el mapa del centro y la ubicación exacta de la clase.',
                    '🖥️ Modo Quiosco Pantalla Completa: Pulsa F11 en el teclado del televisor para ocultar barras del navegador.',
                ],
                tip: 'El botón rojo flotante de la esquina inferior derecha permite cerrar la sesión táctil de la pantalla TV de forma segura.',
            },
        ],
    },

    // ─── DIRECTORIO DE PROFESORADO ───────────────────────────
    'directory_views': {
        id: 'directory_views',
        title: 'Vistas del Directorio de Profesores',
        description: 'Explora y consulta el claustro con diferentes perspectivas:',
        bullets: [
            '🏆 Ranking y Medallas: Visualiza el cómputo total de guardias y descubre quién va en cabeza de sustituciones.',
            '🔤 Vista Alfabética (A-Z): Búsqueda rápida por nombre y apellidos para localizar a cualquier compañero.',
            '📂 Vista por Departamentos: Agrupa al profesorado por su departamento didáctico y especialidad.',
        ],
        tip: 'Los profesores marcados con la etiqueta roja "BAJA" quedan excluidos temporalmente de los turnos de guardia disponibles.',
        badge: 'Directorio',
        category: 'docentes',
    },

    // ─── MI HORARIO Y TRAMOS LECTIVOS ────────────────────────
    'schedule_config': {
        id: 'schedule_config',
        title: 'Configuración de Mi Horario',
        description: 'Mantén tu horario semanal actualizado para que el sistema funcione a la perfección:',
        bullets: [
            '📚 Horas Lectivas: Indica la materia, grupo y aula asignada para cada tramo de clase.',
            '🛡️ Horas de Guardia: Marca tus horas de disponibilidad para cubrir guardias de aula o convivencia.',
            '☕ Recreos: Tus vigilancias de patio se reflejan en tu cómputo de dedicación semanal.',
        ],
        tip: 'Un horario bien configurado permite que, cuando faltes, tus clases se creen con su aula y grupo exactos en un solo clic.',
        badge: 'Horario semanal',
        category: 'docentes',
    },

    // ─── LIBRE DISPOSICIÓN Y PRIVACIDAD ──────────────────────
    'libre_disposicion_rules': {
        id: 'libre_disposicion_rules',
        title: 'Días de Libre Disposición y Privacidad',
        description: 'Reglas y funcionamiento de los permisos de libre disposición:',
        bullets: [
            '🔒 Privacidad de 24 horas: Las guardias de un permiso no se publican en el panel general ni en la TV hasta que faltan 24h para el día solicitado.',
            '👥 Cupo Máximo Diario: El centro establece un límite máximo de docentes que pueden disfrutar del día en la misma fecha.',
            '⚡ Generación Automática: Cuando el permiso entra en la ventana de las últimas 24h, el sistema genera automáticamente las guardias de sus clases lectivas.',
        ],
        tip: 'Jefatura de Estudios puede consultar el calendario interactivo por meses para ver la ocupación de cupos antes de conceder un nuevo permiso.',
        badge: 'Privacidad 24h & Cupos',
        category: 'jefatura',
    },

    // ─── INFORMES Y EXPORTACIÓN ──────────────────────────────
    'reports_export': {
        id: 'reports_export',
        title: 'Exportación de Informes Oficiales',
        description: 'Generación de documentación oficial en PDF y Excel:',
        bullets: [
            '📄 Formato PDF Oficial: Genera el documento mensual o trimestral maquetado con espacio para firma de Dirección/Jefatura.',
            '📊 Formato Excel (.xlsx): Exporta los datos estructurados para su tratamiento estadístico o archivo administrativo.',
            '🔍 Filtros avanzados: Agrupa por profesor, departamento o periodo temporal antes de exportar.',
        ],
        tip: 'Los informes PDF son totalmente válidos como justificación documental para el Servicio Provincial de Educación e Inspección.',
        badge: 'Informes oficiales',
        category: 'jefatura',
    },

    // ─── SUSTITUCIONES Y CLONACIÓN ───────────────────────────
    'substitute_cloning': {
        id: 'substitute_cloning',
        title: 'Sustituciones y Clonación de Horarios',
        description: 'Cómo incorporar a un profesor interino o sustituto rápidamente:',
        bullets: [
            '🔄 Clonar Horario: Copia en un segundo todas las clases lectivas y guardias del profesor saliente al profesor entrante.',
            '🏷️ Traspaso de Guardias: Las guardias pendientes del profesor de baja se transfieren automáticamente al sustituto.',
            '🛑 Marcador de Baja: Al dar de baja a un profesor, se retira de las pantallas de TV y de los turnos de guardia activos.',
        ],
        tip: 'Utiliza el buscador en el panel de administración para localizar rápidamente al profesor saliente y al entrante.',
        badge: 'Gestión de sustitutos',
        category: 'jefatura',
    },
};

// ─── PREGUNTAS FRECUENTES GENERALES ─────────────────────────
export interface FAQItem {
    question: string;
    answer: string;
    category: 'docentes' | 'tv' | 'jefatura';
    tag: string;
}

export const FAQ_LIST: FAQItem[] = [
    {
        category: 'docentes',
        tag: 'Guardias',
        question: '¿Cómo recojo una guardia que está pendiente?',
        answer: 'En el Panel de Guardias o en la pantalla de TV de la sala de profesores, busca las tarjetas con estado "PEND" en color azul o verde. Haz clic sobre ella o pulsa "ASIGNARME" para registrarte como profesor que la cubre.',
    },
    {
        category: 'docentes',
        tag: 'Ausencias',
        question: '¿Qué hago si voy a faltar a clase un día?',
        answer: 'Pulsa en el botón superior "+ NUEVA GUARDIA". Selecciona la fecha y pulsa en "Seleccionar toda la jornada" para marcar todas tus clases lectivas. Escribe las indicaciones/tareas para los alumnos y pulsa "Crear Guardias".',
    },
    {
        category: 'docentes',
        tag: 'Libre Disposición',
        question: '¿Los demás profesores pueden ver con semanas de antelación que he pedido un día libre?',
        answer: 'No. Por protección de privacidad docente, tus guardias permanecen invisibles para el resto del claustro y no se publican en el tablón ni en la TV hasta que restan 24 horas para el inicio de la jornada.',
    },
    {
        category: 'docentes',
        tag: 'Compatibilidad',
        question: '¿Para qué sirve el interruptor "Compatibles con mi horario"?',
        answer: 'Al activarlo en el Panel de Guardias, se ocultan todas las guardias en las que tú estás dando clase y solo se muestran aquellas que coinciden con tus horas de guardia asignadas en tu horario semanal.',
    },
    {
        category: 'tv',
        tag: 'Pantalla Sala',
        question: '¿Por qué me salta un aviso al coger una guardia desde la pantalla TV?',
        answer: 'El sistema comprueba la hora actual. Si intentas coger una guardia de una franja horaria lejana, te mostrará un aviso de confirmación para asegurarse de que no has pulsado por error una hora equivocada. Existe un margen de cortesía de 25 minutos antes del cambio de clase para recoger la siguiente franja sin advertencias.',
    },
    {
        category: 'tv',
        tag: 'Pantalla Sala',
        question: '¿Cómo pongo la pantalla en modo completo sin botones del navegador?',
        answer: 'Pulsa la tecla F11 en el teclado conectado al televisor o PC de la sala de profesores para activar el modo pantalla completa (pantalla quiosco).',
    },
    {
        category: 'jefatura',
        tag: 'Administración',
        question: '¿Cómo doy de alta a un profesor sustituto?',
        answer: 'En el Panel de Administrador, crea la ficha del nuevo docente en la sección "Profesores". Después, entra en la herramienta "Sustituciones / Clonar Horario", elige al profesor titular saliente como origen y al sustituto como destino para transferirle todo su horario de clases en un solo clic.',
    },
    {
        category: 'jefatura',
        tag: 'Libre Disposición',
        question: '¿Dónde se configura el cupo máximo de profesores por día en Libre Disposición?',
        answer: 'En la pestaña "Libre Disposición", dentro de la sección de Configuración, Jefatura puede modificar el número máximo de profesores simultáneos (por defecto 5) y el límite de días anuales por docente (por defecto 4).',
    },
    {
        category: 'jefatura',
        tag: 'Informes',
        question: '¿Cómo saco el informe oficial de guardias para Inspección Educativa?',
        answer: 'En la pestaña "Estadísticas" o en "Libre Disposición", pulsa en el botón "Exportar" y selecciona "Descargar PDF Oficial". Se generará un documento formal con todas las sustituciones computadas y el pie de firma para Jefatura de Estudios.',
    },
];
