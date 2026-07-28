import type { LocaleContent } from './types';

const esContent: LocaleContent = {
  diarySections: {
    Симптомы: {
      title: 'Síntomas',
      steps: {
        symptoms: {
          label: '¿Qué síntomas presenta?',
          placeholder: 'Por ejemplo: picor, hinchazón de labios, tos',
        },
        intensity: {
          label: '¿Qué intensidad tienen los síntomas?',
          choices: [
            '0 — ninguno',
            '1',
            '2',
            '3',
            '4',
            '5 — moderado',
            '6',
            '7',
            '8',
            '9',
            '10 — muy intenso',
          ],
        },
        symptomAreas: {
          label: 'Áreas afectadas',
          choices: ['Nariz', 'Ojos', 'Respiración', 'Piel', 'Tracto digestivo', 'General'],
        },
        onset: {
          label: '¿Cuándo comenzó?',
          placeholder: 'Por ejemplo: esta mañana, hace 2 horas',
        },
      },
    },
    Лекарство: {
      title: 'Medicamento',
      steps: {
        medicine: {
          label: 'Nombre del medicamento',
          placeholder: 'Por ejemplo: cetirizina',
        },
        dosage: {
          label: 'Dosis',
          placeholder: 'Por ejemplo: 10 mg, 1 comprimido',
        },
        takenAt: {
          label: 'Hora de la toma',
          placeholder: 'Por ejemplo: 08:30',
        },
        effect: {
          label: 'Efecto o reacción adversa',
          placeholder: '¿Le ayudó? ¿Hubo efectos secundarios?',
        },
      },
    },
    Питание: {
      title: 'Alimentación',
      steps: {
        food: {
          label: '¿Qué comió?',
          placeholder: 'Platos, alimentos, bebidas',
        },
        foodComponents: {
          label: 'Ingredientes del plato',
        },
        allergens: {
          label: 'Posibles alérgenos en los alimentos',
          placeholder: 'Leche, frutos secos, gluten…',
        },
        reaction: {
          label: 'Reacción tras comer',
          choices: ['Sin reacción', 'Leve', 'Moderada', 'Grave'],
        },
      },
    },
    Триггер: {
      title: 'Desencadenante',
      steps: {
        trigger: {
          label: '¿Cuál fue el desencadenante?',
          placeholder: 'Polen, animal, estrés, alimentos…',
        },
        context: {
          label: '¿Dónde y en qué circunstancias?',
          placeholder: 'En casa, al aire libre, de visita…',
        },
        triggerNotes: {
          label: 'Detalles adicionales',
          placeholder: '¿Qué más es importante registrar?',
        },
      },
    },
    Кожа: {
      title: 'Piel',
      steps: {
        skinArea: {
          label: '¿Qué zona de la piel está afectada?',
          placeholder: 'Cara, manos, cuello…',
        },
        appearance: {
          label: '¿Cómo se ve la piel?',
          placeholder: 'Enrojecimiento, erupción, sequedad, hinchazón…',
        },
        itching: {
          label: 'Intensidad del picor',
          choices: ['Ninguno', 'Leve', 'Moderado', 'Grave'],
        },
        skinPhotos: {
          label: 'Fotos de las manifestaciones',
        },
        skinNotes: {
          label: '¿Qué mejoró o empeoró el estado?',
        },
      },
    },
    Пикфлоуметрия: {
      title: 'Pico de flujo',
      steps: {
        pefTime: {
          label: 'Hora de la medición',
          choices: ['Mañana', 'Tarde'],
        },
        pefValue: {
          label: 'Valor PEF (L/min)',
          placeholder: 'Por ejemplo: 320',
        },
        pefBest: {
          label: 'Mejor valor del periodo (si se conoce)',
          placeholder: 'Por ejemplo: 400',
        },
        pefNotes: {
          label: 'Comentario',
          placeholder: 'Estado general, crisis, medicamentos…',
        },
      },
    },
    АСИТ: {
      title: 'Inmunoterapia',
      steps: {
        asitDrug: {
          label: 'Nombre del medicamento',
          placeholder: 'Según lo prescrito por su médico',
        },
        asitSchedule: {
          label: 'Pauta de dosificación (descripción)',
          placeholder: 'Según lo indicado por su médico, sin ajustar dosis',
        },
        asitTakenAt: {
          label: 'Fecha y hora de la toma',
          placeholder: '18 de junio, 10:00',
        },
        asitReaction: {
          label: 'Reacción subjetiva',
          choices: ['Sin reacción', 'Leve', 'Moderada', 'Grave'],
        },
      },
    },
    Терапия: {
      title: 'Terapia prescrita',
      steps: {
        therapyDrug: { label: 'Medicamento', placeholder: 'Según lo indicado por el médico' },
        therapyDosage: { label: 'Dosis', placeholder: 'p. ej. 1 comprimido, 2 inhalaciones' },
        therapyTakenAt: { label: 'Fecha y hora de la toma', placeholder: '18 de junio, 10:00' },
        therapyStatus: { label: 'Cumplimiento del esquema', choices: ['A tiempo', 'Con retraso', 'Omitida'] },
        therapyReaction: { label: 'Reacción / efecto secundario', choices: ['Ninguna', 'Leve', 'Moderada', 'Grave'] },
        therapyComment: { label: 'Comentario', placeholder: 'Estado, circunstancias especiales…' },
      },
    },
    'Визит к врачу': {
      title: 'Visita médica',
      steps: {
        visitDoctorType: {
          label: 'Tipo de médico',
          choices: ['Alergólogo', 'Pediatra', 'Neumólogo', 'Inmunólogo', 'Otro'],
        },
        visitDate: {
          label: 'Fecha y hora de la visita',
          placeholder: '25 de junio, 14:30',
        },
        visitComment: {
          label: 'Comentario',
          placeholder: 'Preparar informe de 30 días',
        },
      },
    },
    Заметка: {
      title: 'Nota',
      steps: {
        noteTitle: {
          label: 'Título breve',
          placeholder: 'Por ejemplo: visita al alergólogo',
        },
        noteBody: {
          label: 'Nota detallada',
          placeholder: 'Cualquier observación que desee guardar',
        },
      },
    },
  },
  diaryTypes: {
    Симптомы: 'Síntomas',
    Лекарство: 'Medicamento',
    Питание: 'Alimentación',
    Триггер: 'Desencadenante',
    Кожа: 'Piel',
    Пикфлоуметрия: 'Pico de flujo',
    АСИТ: 'Inmunoterapia',
    Терапия: 'Terapia prescrita',
    'Визит к врачу': 'Visita médica',
    Заметка: 'Nota',
  },
  reportBlocks: {
    symptoms: 'Síntomas',
    medicine: 'Medicamentos',
    food: 'Alimentación',
    triggers: 'Desencadenantes',
    peakflow: 'Pico de flujo',
    asit: 'Inmunoterapia',
    skin: 'Manifestaciones cutáneas',
    notes: 'Notas',
    therapy: 'Terapia',
  },
  emergencyRelations: {
    relative: 'Familiar',
    trusted: 'Contacto de confianza',
    doctor: 'Médico',
  },
  allergenCategories: {
    food: 'Alimentos',
    environmental: 'Medio ambiente',
    medication: 'Medicamentos',
    insect: 'Insectos',
  },
  expertHero: {
    name: 'Dr. Yuri Solomonovich Smolkin, MD, PhD, Prof.',
    role: 'Presidente de ADAIR, Director Científico del Centro Nacional de Investigación Clínica',
    subtitle: 'Experto médico principal de Aclearo',
  },
  expertDisclaimer:
    'El contenido de expertos tiene fines informativos y de referencia únicamente y no constituye una prescripción médica.',
  expertCategories: {
    recommendations: 'Recomendaciones según tipo de alergia',
    'pollen-calendar': 'Calendario estacional del polen',
    'allergen-guide': 'Guía de alérgenos',
    asit: 'Protocolos de inmunoterapia',
    emergency: 'Atención de urgencias',
    'symptom-scales': 'Escalas de gravedad de síntomas',
  },
  expertArticles: {
    'pollinosis-basics': {
      title: 'Polinosis: lo que el paciente debe saber',
      summary: 'Síntomas estacionales, prevención de la exposición al polen, cuándo acudir al médico.',
      body:
        'La polinosis provoca congestión nasal, estornudos, picor ocular y, a veces, tos. ' +
        'Consulte la previsión de polen en su región, ventile la vivienda en horas de bajo polen ' +
        'y utilice lavados con suero fisiológico según lo acordado con su médico. Cualquier cambio terapéutico debe realizarse únicamente con un alergólogo.',
    },
    'food-allergy-tips': {
      title: 'Alergia alimentaria: lectura de etiquetas',
      summary: 'Cómo revisar los ingredientes y qué preguntar al fabricante.',
      body:
        'Lea atentamente la lista de ingredientes, preste atención a trazas de alérgenos y reacciones cruzadas. ' +
        'El escáner de Aclearo le ayuda a orientarse con los productos, pero no sustituye la lectura de la etiqueta ni la consulta con su médico.',
    },
    'asthma-diary': {
      title: 'Asma bronquial: llevar un diario',
      summary: 'Por qué registrar el PEF y los síntomas respiratorios.',
      body:
        'Las mediciones regulares del flujo espiratorio máximo ayudan a seguir los cambios a lo largo del tiempo. ' +
        'La aplicación visualiza valores y zonas orientadas a GINA respecto al mejor personal, ' +
        'pero no emite conclusiones clínicas: la interpretación corresponde a su médico tratante.',
    },
    'asthma-pef-basics': {
      title: 'Pico de flujo en el asma',
      summary: 'Cómo medir el PEF y qué significan las zonas respecto al mejor valor.',
      body:
        'El PEF se mide con un picoflujómetro, normalmente por la mañana y por la noche. ' +
        'El mejor personal lo determina el médico. Orientación GINA: verde ≥80 %, amarilla 50–79 %, roja <50 %.',
    },
    'asthma-act-basics': {
      title: 'Test de control del asma (ACT)',
      summary: 'Escala breve de autocontrol en 4 semanas.',
      body:
        'ACT tiene 5 preguntas sobre síntomas y limitación de actividad en las últimas 4 semanas. ' +
        '20–25: buen control; 16–19: parcial; ≤15: no controlado (GINA). Comente el resultado con su médico.',
    },
    'asthma-triggers': {
      title: 'Desencadenantes del empeoramiento del asma',
      summary: 'Qué suele empeorar la respiración.',
      body:
        'Infecciones virales, alérgenos, humo, ejercicio en frío, estrés y algunos fármacos son frecuentes. ' +
        'Registre desencadenantes en el diario para ayudar al médico.',
    },
    'asthma-when-to-see-doctor': {
      title: 'Cuándo acudir al médico por asma',
      summary: 'Señales que requieren consulta o urgencias.',
      body:
        'Llame a emergencias por disnea grave, labios azules o falta de alivio con el rescate prescrito. ' +
        'Programe visita si el PEF permanece en zona amarilla o roja, ACT ≤15 o aumentan los despertares nocturnos.',
    },
    'pollen-calendar-moscow': {
      title: 'Calendario del polen: región central',
      summary: 'Picos de abedul, gramíneas y ambrosía por mes.',
      body:
        'Abril–mayo: polen de árboles (abedul, aliso). Junio–julio: polen de gramíneas. Agosto–septiembre: ambrosía y artemisa. ' +
        'Los datos son orientativos: confirme la previsión con su médico tratante.',
    },
    'cross-reactions': {
      title: 'Reacciones cruzadas',
      summary: 'La relación entre el polen de abedul y la manzana, los frutos secos y las verduras.',
      body:
        'Con alergia al polen de abedul, pueden aparecer reacciones a manzana, pera, zanahoria y frutos secos (síndrome de alergia oral). ' +
        'El escáner tiene en cuenta estas relaciones al analizar los productos.',
    },
    'asit-patient-info': {
      title: 'Inmunoterapia: información general para pacientes',
      summary: 'Qué es la inmunoterapia específica con alérgenos.',
      body:
        'La inmunoterapia se prescribe únicamente por un médico tras la evaluación. En el diario de inmunoterapia, registre las fechas de toma y las reacciones subjetivas. ' +
        'La aplicación no selecciona pautas ni ajusta dosis.',
    },
    'anaphylaxis-info': {
      title: 'Anafilaxia: orientación general',
      summary: 'Cuándo llamar a los servicios de emergencia y qué comunicar al personal sanitario.',
      body:
        'Si aparecen signos de una reacción grave, llame a los servicios de emergencia. La pantalla SOS muestra la información introducida por el usuario. ' +
        'La aplicación no prescribe tratamiento: siga las indicaciones de su médico y las guías de atención de urgencias.',
    },
    'symptom-scale-rhinitis': {
      title: 'Escala de síntomas de rinitis',
      summary: 'Descripción de referencia de los niveles de gravedad.',
      body:
        'Leve: estornudos ocasionales, congestión sin molestia significativa. ' +
        'Moderada: síntomas diarios que afectan el sueño o el trabajo. ' +
        'Grave: síntomas persistentes que limitan sustancialmente la actividad. La valoración la realiza un médico.',
    },
  },
  wellness: {
    status: {
      good: {
        title: 'Bueno',
        summary: 'Las condiciones ambientales y las entradas del diario no sugieren riesgos elevados.',
      },
      moderate: {
        title: 'Moderado',
        summary: 'Hay factores individuales a vigilar: consulte las recomendaciones.',
      },
      attention: {
        title: 'Atención reforzada',
        summary: 'Varios factores pueden afectar cómo se siente.',
      },
      'high-risk': {
        title: 'Riesgo alto',
        summary: 'Recomendamos minimizar los desencadenantes y consultar a su médico.',
      },
    },
    pollenTier: {
      low: 'Bajo',
      mid: 'Medio',
      high: 'Alto',
    },
    aqiTier: {
      low: 'Buena',
      mid: 'Moderada',
      high: 'Mala',
      noData: 'Sin datos',
    },
    recommendations: {
      pollen: {
        title: 'Reducir la exposición al polen',
        text: 'El nivel de polen de «{label}» es {tier}. Limite los paseos al aire libre durante las horas de máximo polen diurno.',
      },
      aqi: {
        title: 'Calidad del aire',
        text: 'El índice EAQI es {tier}. Las personas sensibles deberían reducir la actividad al aire libre.',
      },
      symptoms: {
        title: 'Síntomas del diario',
        text: 'Síntomas registrados en las últimas 48 horas. Siga la evolución; contacte con su médico si empeoran.',
      },
      symptomsWeek: {
        title: 'Síntomas del diario',
        text: 'Síntomas registrados en {days} de los últimos 7 días. Siga la evolución; contacte con su médico si empeoran.',
      },
      clinicalScale: {
        title: 'Escala {label}',
        text: 'Última puntuación: {total} ({level}). Comente el control con su médico.',
      },
      crossReaction: {
        title: 'Posibles reacciones cruzadas',
        text: 'Con polen elevado, posible reacción a: {allergens}. Téngalo en cuenta en la alimentación y al aire libre.',
      },
      food: {
        title: 'Alérgenos alimentarios',
        text: 'En su perfil: {allergens}. Revise los ingredientes con el escáner antes de comprar productos nuevos.',
      },
      stable: {
        title: 'Día estable',
        text: 'Los indicadores ambientales y las entradas del diario no sugieren riesgos elevados.',
      },
      envUnavailable: {
        title: 'Sin datos ambientales',
        text: 'No se pudo cargar polen ni calidad del aire. El índice refleja solo el diario.',
      },
      seasonalPollen: {
        title: 'Temporada de polen en su región',
        text: 'Pico de «{label}» según el calendario regional. Planifique exposición y tratamiento con su médico.',
      },
    },
    pollenLabels: {
      alder_pollen: 'Aliso',
      birch_pollen: 'Abedul',
      grass_pollen: 'Festuca',
      mugwort_pollen: 'Artemisia',
      olive_pollen: 'Olivo',
      ragweed_pollen: 'Ambrosía',
    },
    locationDefault: 'Madrid',
    envUnavailableSummary:
      'Datos de Open-Meteo no disponibles. El índice usa solo el diario; sin factores ambientales.',
  },
  scanner: {
    verdicts: {
      'Выявлено множество совпадений': 'Se encontraron múltiples coincidencias',
      'Есть совпадения': 'Se encontraron coincidencias',
      'Возможна перекрёстная реакция': 'Posible reacción cruzada',
      'Нет явных совпадений': 'No hay coincidencias evidentes',
    },
    reasons: {
      high: 'Se encontraron coincidencias significativas{productSuffix}: {matches}.',
      medium: 'Se encontró una coincidencia potencialmente significativa{productSuffix}: {label}.',
      low: 'No se encontró coincidencia evidente con los alérgenos del perfil{productSuffix}, pero esto no descarta una reacción individual.',
    },
    crossSuffix: '(reacción cruzada)',
    traceSuffix: '(trazas / may contain)',
    productNotFound:
      'Producto no encontrado en Open Food Facts. La verificación se realizó usando el código de barras como texto.',
    restaurantMenu: 'Carta del restaurante',
  },
  diaryValidation: {
    fillField: 'Complete el campo «{{label}}».',
    noDescription: 'Sin descripción',
  },
};

export default esContent;
