import type { LocaleContent } from './types';

const enContent: LocaleContent = {
  diarySections: {
    Симптомы: {
      title: 'Symptoms',
      steps: {
        symptomCode: {
          label: 'Symptoms (from catalog)',
        },
        symptoms: {
          label: 'What symptoms are present?',
          placeholder: 'For example: itching, lip swelling, cough',
        },
        intensity: {
          label: 'How severe are the symptoms?',
          choices: [
            '0 — none',
            '1',
            '2',
            '3',
            '4',
            '5 — moderate',
            '6',
            '7',
            '8',
            '9',
            '10 — very severe',
          ],
        },
        symptomAreas: {
          label: 'Symptom areas',
          choices: ['Nose', 'Eyes', 'Breathing', 'Skin', 'GI tract', 'General'],
        },
        onset: {
          label: 'When did it start?',
          placeholder: 'For example: this morning, 2 hours ago',
        },
      },
    },
    Лекарство: {
      title: 'Medicine',
      steps: {
        medicine: {
          label: 'Medication name',
          placeholder: 'For example: cetirizine',
        },
        dosage: {
          label: 'Dosage',
          placeholder: 'For example: 10 mg, 1 tablet',
        },
        takenAt: {
          label: 'Time taken',
          placeholder: 'For example: 08:30',
        },
        effect: {
          label: 'Effect or side reaction',
          placeholder: 'Did it help? Were there any side effects?',
        },
        medicineForm: { label: 'Form (auto)' },
        medicineActiveSubstance: { label: 'Active substance (auto)' },
        medicineUsage: { label: 'Usage (auto)' },
        medicineAgeNote: { label: 'Age restriction (auto)' },
        medicineSource: { label: 'Recognition source (auto)' },
        medicinePhotos: { label: 'Package photo' },
      },
    },
    Питание: {
      title: 'Nutrition',
      steps: {
        food: {
          label: 'What was eaten?',
          placeholder: 'Dishes, foods, drinks',
        },
        foodComponents: {
          label: 'Dish ingredients',
        },
        allergens: {
          label: 'Possible allergens in food',
          placeholder: 'Milk, nuts, gluten…',
        },
        reaction: {
          label: 'Reaction after eating',
          choices: ['No reaction', 'Mild', 'Moderate', 'Severe'],
        },
      },
    },
    Триггер: {
      title: 'Trigger',
      steps: {
        trigger: {
          label: 'What was the trigger?',
          placeholder: 'Pollen, animal, stress, food…',
        },
        context: {
          label: 'Where and under what circumstances?',
          placeholder: 'Home, outdoors, visiting…',
        },
        triggerNotes: {
          label: 'Additional details',
          placeholder: 'What else is important to record?',
        },
      },
    },
    Кожа: {
      title: 'Skin',
      steps: {
        skinArea: {
          label: 'Which skin area is affected?',
          placeholder: 'Face, hands, neck…',
        },
        appearance: {
          label: 'What does the skin look like?',
          placeholder: 'Redness, rash, dryness, swelling…',
        },
        itching: {
          label: 'Itch intensity',
          choices: ['None', 'Mild', 'Moderate', 'Severe'],
        },
        skinPhotos: {
          label: 'Photos of manifestations',
        },
        skinNotes: {
          label: 'What helped or worsened the condition?',
        },
      },
    },
    Пикфлоуметрия: {
      title: 'Peak flow',
      steps: {
        pefTime: {
          label: 'Measurement time',
          choices: ['Morning', 'Evening'],
        },
        pefValue: {
          label: 'PEF value (L/min)',
          placeholder: 'For example: 320',
        },
        pefBest: {
          label: 'Best value for the period (if known)',
          placeholder: 'For example: 400',
        },
        pefNotes: {
          label: 'Comment',
          placeholder: 'Well-being, attack, medications…',
        },
      },
    },
    АСИТ: {
      title: 'SCIT',
      steps: {
        asitDrug: {
          label: 'Medication name',
          placeholder: 'As prescribed by your doctor',
        },
        asitSchedule: {
          label: 'Dosing schedule (description)',
          placeholder: 'As told by your doctor, without dose adjustments',
        },
        asitTakenAt: {
          label: 'Date and time taken',
          placeholder: 'June 18, 10:00',
        },
        asitReaction: {
          label: 'Subjective reaction',
          choices: ['No reaction', 'Mild', 'Moderate', 'Severe'],
        },
      },
    },
    Терапия: {
      title: 'Prescribed therapy',
      steps: {
        therapyDrug: { label: 'Medication', placeholder: 'As prescribed by your doctor' },
        therapyDosage: { label: 'Dosage', placeholder: 'e.g. 1 tablet, 2 puffs' },
        therapyTakenAt: { label: 'Date and time taken', placeholder: 'June 18, 10:00' },
        therapyStatus: { label: 'Schedule adherence', choices: ['On time', 'Late', 'Missed'] },
        therapyReaction: { label: 'Reaction / side effect', choices: ['None', 'Mild', 'Moderate', 'Severe'] },
        therapyComment: { label: 'Comment', placeholder: 'Well-being, special circumstances…' },
      },
    },
    'Визит к врачу': {
      title: 'Doctor visit',
      steps: {
        visitDoctorType: {
          label: 'Type of doctor',
          choices: ['Allergist', 'Pediatrician', 'Pulmonologist', 'Immunologist', 'Other'],
        },
        visitDate: {
          label: 'Visit date and time',
          placeholder: 'June 25, 14:30',
        },
        visitComment: {
          label: 'Comment',
          placeholder: 'Prepare a 30-day report',
        },
      },
    },
    Заметка: {
      title: 'Note',
      steps: {
        noteTitle: {
          label: 'Short title',
          placeholder: 'For example: allergist visit',
        },
        noteBody: {
          label: 'Detailed note',
          placeholder: 'Any observations you want to save',
        },
      },
    },
  },
  diaryTypes: {
    Симптомы: 'Symptoms',
    Лекарство: 'Medicine',
    Питание: 'Nutrition',
    Триггер: 'Trigger',
    Кожа: 'Skin',
    Пикфлоуметрия: 'Peak flow',
    АСИТ: 'SCIT',
    Терапия: 'Prescribed therapy',
    'Визит к врачу': 'Doctor visit',
    Заметка: 'Note',
  },
  reportBlocks: {
    symptoms: 'Symptoms',
    medicine: 'Medications',
    food: 'Nutrition',
    triggers: 'Triggers',
    peakflow: 'Peak flow',
    asit: 'SCIT',
    skin: 'Skin manifestations',
    notes: 'Notes',
    therapy: 'Therapy',
  },
  emergencyRelations: {
    relative: 'Relative',
    trusted: 'Trusted contact',
    doctor: 'Doctor',
  },
  allergenCategories: {
    food: 'Food',
    environmental: 'Environment',
    medication: 'Medications',
    insect: 'Insects',
  },
  expertHero: {
    name: 'MD, PhD, Prof. Yuri Solomonovich Smolkin',
    role: 'President of ADAIR, Scientific Director of the National Clinical Research Center',
    subtitle: 'Chief Medical Expert of Aclearo',
  },
  expertDisclaimer:
    'Expert content is for informational and reference purposes only and is not a medical prescription.',
  expertCategories: {
    recommendations: 'Allergy type recommendations',
    'pollen-calendar': 'Seasonal pollen calendar',
    'allergen-guide': 'Allergen guide',
    asit: 'SCIT protocols',
    emergency: 'Emergency care',
    'symptom-scales': 'Symptom severity scales',
  },
  expertArticles: {
    'pollinosis-basics': {
      title: 'Pollinosis: what patients should know',
      summary: 'Seasonal symptoms, pollen exposure prevention, when to see a doctor.',
      body:
        'Pollinosis causes nasal congestion, sneezing, itchy eyes, and sometimes cough. ' +
        'Monitor the pollen forecast in your region, ventilate your home during low-pollen hours, ' +
        'and use saline rinses as agreed with your doctor. Any therapy changes should only be made with an allergist.',
    },
    'food-allergy-tips': {
      title: 'Food allergy: reading labels',
      summary: 'How to check ingredients and what to ask the manufacturer.',
      body:
        'Read ingredient lists carefully, watch for traces of allergens and cross-reactions. ' +
        'The Aclearo scanner helps you navigate products, but it does not replace reading the label and consulting your doctor.',
    },
    'asthma-diary': {
      title: 'Bronchial asthma: keeping a diary',
      summary: 'Why to record PEF and breathing symptoms.',
      body:
        'Regular peak expiratory flow measurements help track changes over time. ' +
        'The app visualizes values and GINA-oriented zones relative to your personal best, ' +
        'but does not make clinical conclusions — interpretation is done by your treating physician.',
    },
    'asthma-pef-basics': {
      title: 'Peak flow in asthma',
      summary: 'How to measure PEF and what zones relative to personal best mean.',
      body:
        'Peak expiratory flow (PEF) is measured with a peak flow meter, usually morning and evening. ' +
        'Personal best is your maximum during good control; your doctor determines it. ' +
        'GINA-oriented guidance: green zone ≥80% of best, yellow 50–79%, red <50%. ' +
        'Zones help notice worsening but do not replace your doctor\'s action plan.',
    },
    'asthma-act-basics': {
      title: 'Asthma Control Test (ACT)',
      summary: 'Brief self-monitoring scale over 4 weeks.',
      body:
        'ACT has 5 questions about symptoms and activity limits over the past 4 weeks. ' +
        'Scores 20–25 suggest good control, 16–19 partial control, ≤15 uncontrolled asthma (GINA). ' +
        'Complete the test in the diary and discuss results with your doctor.',
    },
    'asthma-triggers': {
      title: 'Asthma exacerbation triggers',
      summary: 'What commonly provokes breathing worsening.',
      body:
        'Common triggers include viral infections, allergens (pollen, mites, animals), ' +
        'tobacco smoke, exercise in cold air, stress, and some medicines. ' +
        'Log triggers in your diary to help your doctor adjust prevention. ' +
        'The list is individual; an allergist creates your avoidance plan.',
    },
    'asthma-when-to-see-doctor': {
      title: 'When to see a doctor for asthma',
      summary: 'Signals requiring consultation or emergency care.',
      body:
        'Call emergency services for severe breathlessness, blue lips, inability to speak full sentences, ' +
        'or no relief from reliever medication as prescribed. ' +
        'Schedule a visit if PEF stays in yellow or red zones, ACT ≤15, ' +
        'night waking from cough or breathlessness increases, or reliever use rises. ' +
        'The app reminds about scales but does not replace medical care.',
    },
    'pollen-calendar-moscow': {
      title: 'Pollen calendar: Central region',
      summary: 'Peaks of birch, grasses, and ragweed by month.',
      body:
        'April–May: tree pollen (birch, alder). June–July: grass pollen. August–September: ragweed and mugwort. ' +
        'Data is approximate — confirm the forecast with your treating physician.',
    },
    'cross-reactions': {
      title: 'Cross-reactions',
      summary: 'The link between birch pollen and apple, nuts, and vegetables.',
      body:
        'With birch pollen allergy, reactions to apple, pear, carrot, and nuts are possible (oral allergy syndrome). ' +
        'The scanner takes these links into account when checking products.',
    },
    'asit-patient-info': {
      title: 'SCIT: general information for patients',
      summary: 'What allergen-specific immunotherapy is.',
      body:
        'SCIT is prescribed only by a doctor after examination. In the SCIT diary, record intake dates and subjective reactions. ' +
        'The app does not select regimens or adjust dosages.',
    },
    'anaphylaxis-info': {
      title: 'Anaphylaxis: general guidance',
      summary: 'When to call emergency services and what to tell medics.',
      body:
        'If signs of a severe reaction appear, call emergency services. The SOS screen shows information entered by the user. ' +
        "The app does not prescribe treatment — follow your doctor's instructions and emergency care guidelines.",
    },
    'symptom-scale-rhinitis': {
      title: 'Rhinitis symptom scale',
      summary: 'Reference description of severity levels.',
      body:
        'Mild: occasional sneezing, congestion without significant discomfort. ' +
        'Moderate: daily symptoms affecting sleep or work. ' +
        'Severe: persistent symptoms substantially limiting activity. Assessment is made by a doctor.',
    },
  },
  wellness: {
    status: {
      good: {
        title: 'Good',
        summary: 'Environmental conditions and diary entries do not suggest elevated risks.',
      },
      moderate: {
        title: 'Moderate',
        summary: 'There are individual factors to watch — see recommendations.',
      },
      attention: {
        title: 'Increased attention',
        summary: 'Several factors may affect how you feel.',
      },
      'high-risk': {
        title: 'High risk',
        summary: 'We recommend minimizing triggers and consulting your doctor.',
      },
    },
    pollenTier: {
      low: 'Low',
      mid: 'Medium',
      high: 'High',
    },
    aqiTier: {
      low: 'Good',
      mid: 'Moderate',
      high: 'Poor',
      noData: 'No data',
    },
    recommendations: {
      pollen: {
        title: 'Reduce pollen exposure',
        text: 'Pollen level for «{label}» is {tier}. Limit outdoor walks during peak daytime pollen hours.',
      },
      aqi: {
        title: 'Air quality',
        text: 'EAQI index is {tier}. Sensitive individuals should reduce outdoor activity.',
      },
      symptoms: {
        title: 'Diary symptoms',
        text: 'Symptoms recorded in the last 48 hours. Track changes; contact your doctor if they worsen.',
      },
      symptomsWeek: {
        title: 'Diary symptoms',
        text: 'Symptoms recorded on {days} of the last 7 days. Track changes; contact your doctor if they worsen.',
      },
      clinicalScale: {
        title: 'Scale {label}',
        text: 'Latest score: {total} ({level}). Discuss control with your doctor.',
      },
      crossReaction: {
        title: 'Possible cross-reactions',
        text: 'With elevated pollen, possible reaction to: {allergens}. Consider this for food and outdoor exposure.',
      },
      foodAllergens: {
        title: 'Food allergens',
        text: 'In your profile: {allergens}. Check ingredients with the scanner before buying new products.',
      },
      stable: {
        title: 'Stable day',
        text: 'Environmental indicators and diary entries do not suggest elevated risks.',
      },
      envUnavailable: {
        title: 'Environment data unavailable',
        text: 'Could not load pollen and air quality. The index reflects diary entries only.',
      },
      seasonalPollen: {
        title: 'Pollen season in your region',
        text: 'Peak season for «{label}» in your regional calendar. Plan exposure and medication with your doctor.',
      },
    },
    pollenLabels: {
      alder_pollen: 'Alder',
      birch_pollen: 'Birch',
      grass_pollen: 'Timothy grass',
      mugwort_pollen: 'Mugwort',
      olive_pollen: 'Olive',
      ragweed_pollen: 'Ragweed',
    },
    locationDefault: 'Moscow',
    envUnavailableSummary:
      'Open-Meteo data is unavailable. The index uses diary data only; environmental factors are not included.',
  },
  scanner: {
    verdicts: {
      'Выявлено множество совпадений': 'Multiple matches found',
      'Есть совпадения': 'Matches found',
      'Возможна перекрёстная реакция': 'Possible cross-reaction',
      'Возможны следы аллергена': 'Possible allergen traces',
      'Нет явных совпадений': 'No obvious matches',
    },
    reasons: {
      high: 'Significant matches found{productSuffix}: {matches}.',
      medium: 'Potentially significant match found{productSuffix}: {label}.',
      low: 'No obvious overlap with profile allergens found{productSuffix}, but this does not rule out an individual reaction.',
    },
    crossSuffix: '(cross-reaction)',
    traceSuffix: '(traces / may contain)',
    productNotFound:
      'Product not found in Open Food Facts. Check was performed using the barcode as text.',
    restaurantMenu: 'Restaurant menu',
  },
  diaryValidation: {
    fillField: 'Fill in the field «{label}».',
    noDescription: 'No description',
  },
};

export default enContent;
