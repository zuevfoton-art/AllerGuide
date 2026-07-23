import type { LocaleContent } from './types';

const deContent: LocaleContent = {
  diarySections: {
    Симптомы: {
      title: 'Symptome',
      steps: {
        symptoms: {
          label: 'Welche Symptome liegen vor?',
          placeholder: 'Zum Beispiel: Juckreiz, Lippenschwellung, Husten',
        },
        intensity: {
          label: 'Wie stark sind die Symptome?',
          choices: [
            '0 — keine',
            '1',
            '2',
            '3',
            '4',
            '5 — mäßig',
            '6',
            '7',
            '8',
            '9',
            '10 — sehr stark',
          ],
        },
        symptomAreas: {
          label: 'Betroffene Bereiche',
          choices: ['Nase', 'Augen', 'Atmung', 'Haut', 'Verdauungstrakt', 'Allgemein'],
        },
        onset: {
          label: 'Wann hat es begonnen?',
          placeholder: 'Zum Beispiel: heute Morgen, vor 2 Stunden',
        },
      },
    },
    Лекарство: {
      title: 'Medikament',
      steps: {
        medicine: {
          label: 'Name des Medikaments',
          placeholder: 'Zum Beispiel: Cetirizin',
        },
        dosage: {
          label: 'Dosierung',
          placeholder: 'Zum Beispiel: 10 mg, 1 Tablette',
        },
        takenAt: {
          label: 'Einnahmezeit',
          placeholder: 'Zum Beispiel: 08:30',
        },
        effect: {
          label: 'Wirkung oder Nebenreaktion',
          placeholder: 'Hat es geholfen? Gab es Nebenwirkungen?',
        },
      },
    },
    Питание: {
      title: 'Ernährung',
      steps: {
        food: {
          label: 'Was wurde gegessen?',
          placeholder: 'Gerichte, Lebensmittel, Getränke',
        },
        foodComponents: {
          label: 'Zutaten des Gerichts',
        },
        allergens: {
          label: 'Mögliche Allergene in den Lebensmitteln',
          placeholder: 'Milch, Nüsse, Gluten…',
        },
        reaction: {
          label: 'Reaktion nach dem Essen',
          choices: ['Keine Reaktion', 'Leicht', 'Mäßig', 'Schwer'],
        },
      },
    },
    Триггер: {
      title: 'Auslöser',
      steps: {
        trigger: {
          label: 'Was war der Auslöser?',
          placeholder: 'Pollen, Tier, Stress, Lebensmittel…',
        },
        context: {
          label: 'Wo und unter welchen Umständen?',
          placeholder: 'Zuhause, im Freien, beim Besuch…',
        },
        triggerNotes: {
          label: 'Zusätzliche Details',
          placeholder: 'Was ist sonst wichtig festzuhalten?',
        },
      },
    },
    Кожа: {
      title: 'Haut',
      steps: {
        skinArea: {
          label: 'Welcher Hautbereich ist betroffen?',
          placeholder: 'Gesicht, Hände, Hals…',
        },
        appearance: {
          label: 'Wie sieht die Haut aus?',
          placeholder: 'Rötung, Ausschlag, Trockenheit, Schwellung…',
        },
        itching: {
          label: 'Juckreizintensität',
          choices: ['Keiner', 'Leicht', 'Mäßig', 'Schwer'],
        },
        skinNotes: {
          label: 'Was hat den Zustand verbessert oder verschlechtert?',
        },
      },
    },
    Пикфлоуметрия: {
      title: 'Peak-Flow',
      steps: {
        pefTime: {
          label: 'Messzeitpunkt',
          choices: ['Morgens', 'Abends'],
        },
        pefValue: {
          label: 'PEF-Wert (L/min)',
          placeholder: 'Zum Beispiel: 320',
        },
        pefBest: {
          label: 'Bester Wert im Zeitraum (falls bekannt)',
          placeholder: 'Zum Beispiel: 400',
        },
        pefNotes: {
          label: 'Kommentar',
          placeholder: 'Befinden, Anfall, Medikamente…',
        },
      },
    },
    АСИТ: {
      title: 'Hyposensibilisierung',
      steps: {
        asitDrug: {
          label: 'Name des Medikaments',
          placeholder: 'Wie vom Arzt verordnet',
        },
        asitSchedule: {
          label: 'Dosierungsschema (Beschreibung)',
          placeholder: 'Wie vom Arzt angegeben, ohne Dosisanpassungen',
        },
        asitTakenAt: {
          label: 'Datum und Uhrzeit der Einnahme',
          placeholder: '18. Juni, 10:00',
        },
        asitReaction: {
          label: 'Subjektive Reaktion',
          choices: ['Keine Reaktion', 'Leicht', 'Mäßig', 'Schwer'],
        },
      },
    },
    'Визит к врачу': {
      title: 'Arztbesuch',
      steps: {
        visitDoctorType: {
          label: 'Art des Arztes',
          choices: ['Allergologe', 'Kinderarzt', 'Pneumologe', 'Immunologe', 'Sonstige'],
        },
        visitDate: {
          label: 'Datum und Uhrzeit des Besuchs',
          placeholder: '25. Juni, 14:30',
        },
        visitComment: {
          label: 'Kommentar',
          placeholder: '30-Tage-Bericht vorbereiten',
        },
      },
    },
    Заметка: {
      title: 'Notiz',
      steps: {
        noteTitle: {
          label: 'Kurzer Titel',
          placeholder: 'Zum Beispiel: Besuch beim Allergologen',
        },
        noteBody: {
          label: 'Ausführliche Notiz',
          placeholder: 'Alle Beobachtungen, die Sie speichern möchten',
        },
      },
    },
  },
  diaryTypes: {
    Симптомы: 'Symptome',
    Лекарство: 'Medikament',
    Питание: 'Ernährung',
    Триггер: 'Auslöser',
    Кожа: 'Haut',
    Пикфлоуметрия: 'Peak-Flow',
    АСИТ: 'Hyposensibilisierung',
    'Визит к врачу': 'Arztbesuch',
    Заметка: 'Notiz',
  },
  reportBlocks: {
    symptoms: 'Symptome',
    medicine: 'Medikamente',
    food: 'Ernährung',
    triggers: 'Auslöser',
    peakflow: 'Peak-Flow',
    asit: 'Hyposensibilisierung',
    skin: 'Hautmanifestationen',
    notes: 'Notizen',
  },
  emergencyRelations: {
    relative: 'Verwandter',
    trusted: 'Vertrauensperson',
    doctor: 'Arzt',
  },
  allergenCategories: {
    food: 'Lebensmittel',
    environmental: 'Umwelt',
    medication: 'Medikamente',
    insect: 'Insekten',
  },
  expertHero: {
    name: 'Prof. Dr. Yuri Solomonovich Smolkin, MD, PhD',
    role: 'Präsident von ADAIR, Wissenschaftlicher Leiter des Nationalen Klinischen Forschungszentrums',
    subtitle: 'Leitender medizinischer Experte von Aclearo',
  },
  expertDisclaimer:
    'Experteninhalte dienen ausschließlich Informations- und Referenzzwecken und stellen keine medizinische Verschreibung dar.',
  expertCategories: {
    recommendations: 'Empfehlungen nach Allergietyp',
    'pollen-calendar': 'Saisonaler Pollenkalender',
    'allergen-guide': 'Allergenführer',
    asit: 'Hyposensibilisierungsprotokolle',
    emergency: 'Notfallversorgung',
    'symptom-scales': 'Schweregradskalen für Symptome',
  },
  expertArticles: {
    'pollinosis-basics': {
      title: 'Pollinose: Was Patienten wissen sollten',
      summary: 'Saisonale Symptome, Vorbeugung der Pollenexposition, wann ein Arzt aufgesucht werden sollte.',
      body:
        'Pollinose verursacht verstopfte Nase, Niesen, juckende Augen und manchmal Husten. ' +
        'Beachten Sie die Pollenprognose in Ihrer Region, lüften Sie Ihre Wohnung zu Zeiten mit geringer Pollenbelastung ' +
        'und verwenden Sie Spülungen mit Kochsalzlösung gemäß Absprache mit Ihrem Arzt. Therapieänderungen sollten nur mit einem Allergologen vorgenommen werden.',
    },
    'food-allergy-tips': {
      title: 'Nahrungsmittelallergie: Etiketten lesen',
      summary: 'Wie man Inhaltsstoffe prüft und was man den Hersteller fragen sollte.',
      body:
        'Lesen Sie die Zutatenlisten sorgfältig, achten Sie auf Spuren von Allergenen und Kreuzreaktionen. ' +
        'Der Aclearo-Scanner hilft bei der Orientierung bei Produkten, ersetzt aber nicht das Lesen der Etikette und die Rücksprache mit Ihrem Arzt.',
    },
    'asthma-diary': {
      title: 'Bronchialasthma: Tagebuch führen',
      summary: 'Warum PEF und Atemwegsymptome dokumentieren.',
      body:
        'Regelmäßige Messungen des exspiratorischen Spitzenflusses helfen, Veränderungen im Zeitverlauf zu verfolgen. ' +
        'Die App visualisiert Werte und GINA-orientierte Zonen relativ zum Bestwert, ' +
        'zieht aber keine klinischen Schlüsse — die Interpretation obliegt Ihrem behandelnden Arzt.',
    },
    'asthma-pef-basics': {
      title: 'Peak-Flow bei Asthma',
      summary: 'PEF messen und Bedeutung der Zonen relativ zum Bestwert.',
      body:
        'Der exspiratorische Spitzenfluss wird mit einem Peak-Flow-Meter gemessen, meist morgens und abends. ' +
        'Der Bestwert ist Ihr Maximum bei guter Kontrolle; er wird vom Arzt festgelegt. ' +
        'GINA-orientiert: grüne Zone ≥80 %, gelbe 50–79 %, rote <50 %. Zonen ersetzen nicht den Aktionsplan des Arztes.',
    },
    'asthma-act-basics': {
      title: 'Asthma-Kontrolltest (ACT)',
      summary: 'Kurze Selbstkontrollskala über 4 Wochen.',
      body:
        'ACT umfasst 5 Fragen zu Symptomen und Aktivitätseinschränkung der letzten 4 Wochen. ' +
        '20–25 Punkte: gute Kontrolle, 16–19: teilweise, ≤15: unkontrolliert (GINA). Besprechen Sie das Ergebnis mit Ihrem Arzt.',
    },
    'asthma-triggers': {
      title: 'Auslöser von Asthmaverschlechterungen',
      summary: 'Was häufig Atemwegsbeschwerden verschlimmert.',
      body:
        'Häufige Auslöser: Virusinfekte, Allergene, Rauch, Kältebelastung, Stress, manche Medikamente. ' +
        'Dokumentieren Sie Auslöser im Tagebuch — das hilft dem Arzt bei der Prävention.',
    },
    'asthma-when-to-see-doctor': {
      title: 'Wann zum Arzt bei Asthma',
      summary: 'Warnsignale für Konsultation oder Notfall.',
      body:
        'Notruf bei schwerer Atemnot, blauen Lippen oder fehlender Wirkung des Notfallmedikaments. ' +
        'Termin, wenn PEF dauerhaft in gelber/roter Zone, ACT ≤15 oder nächtliches Erwachen zunimmt.',
    },
    'pollen-calendar-moscow': {
      title: 'Pollenkalender: Zentralregion',
      summary: 'Höhepunkte von Birke, Gräsern und Beifuß nach Monat.',
      body:
        'April–Mai: Baumpollen (Birke, Erle). Juni–Juli: Gräserpollen. August–September: Beifuß und Wermut. ' +
        'Die Daten sind ungefähr — bestätigen Sie die Prognose mit Ihrem behandelnden Arzt.',
    },
    'cross-reactions': {
      title: 'Kreuzreaktionen',
      summary: 'Der Zusammenhang zwischen Birkenpollen und Apfel, Nüssen und Gemüse.',
      body:
        'Bei Birkenpollenallergie sind Reaktionen auf Apfel, Birne, Karotte und Nüsse möglich (orales Allergiesyndrom). ' +
        'Der Scanner berücksichtigt diese Zusammenhänge bei der Produktprüfung.',
    },
    'asit-patient-info': {
      title: 'Hyposensibilisierung: Allgemeine Informationen für Patienten',
      summary: 'Was allergenspezifische Immuntherapie ist.',
      body:
        'Die Hyposensibilisierung wird nur vom Arzt nach Untersuchung verordnet. Im Hyposensibilisierungstagebuch erfassen Sie Einnahmedaten und subjektive Reaktionen. ' +
        'Die App wählt keine Schemata aus und passt keine Dosierungen an.',
    },
    'anaphylaxis-info': {
      title: 'Anaphylaxie: Allgemeine Hinweise',
      summary: 'Wann den Notruf wählen und was dem Rettungspersonal mitteilen.',
      body:
        'Bei Anzeichen einer schweren Reaktion rufen Sie den Notruf. Der SOS-Bildschirm zeigt vom Nutzer eingegebene Informationen. ' +
        'Die App verschreibt keine Behandlung — folgen Sie den Anweisungen Ihres Arztes und den Notfallrichtlinien.',
    },
    'symptom-scale-rhinitis': {
      title: 'Rhinitis-Symptomskala',
      summary: 'Referenzbeschreibung der Schweregrade.',
      body:
        'Leicht: gelegentliches Niesen, Verstopfung ohne nennenswerte Beschwerden. ' +
        'Mäßig: tägliche Symptome, die Schlaf oder Arbeit beeinträchtigen. ' +
        'Schwer: anhaltende Symptome, die die Aktivität erheblich einschränken. Die Beurteilung erfolgt durch einen Arzt.',
    },
  },
  wellness: {
    status: {
      good: {
        title: 'Gut',
        summary: 'Umweltbedingungen und Tagebucheinträge deuten nicht auf erhöhte Risiken hin.',
      },
      moderate: {
        title: 'Mäßig',
        summary: 'Es gibt individuelle Faktoren, die beobachtet werden sollten — siehe Empfehlungen.',
      },
      attention: {
        title: 'Erhöhte Aufmerksamkeit',
        summary: 'Mehrere Faktoren können Ihr Befinden beeinflussen.',
      },
      'high-risk': {
        title: 'Hohes Risiko',
        summary: 'Wir empfehlen, Auslöser zu minimieren und Ihren Arzt zu konsultieren.',
      },
    },
    pollenTier: {
      low: 'Niedrig',
      mid: 'Mittel',
      high: 'Hoch',
    },
    aqiTier: {
      low: 'Gut',
      mid: 'Mäßig',
      high: 'Schlecht',
      noData: 'Keine Daten',
    },
    recommendations: {
      pollen: {
        title: 'Pollenexposition reduzieren',
        text: 'Pollenbelastung für «{label}» ist {tier}. Begrenzen Sie Spaziergänge im Freien während der täglichen Pollenspitzen.',
      },
      aqi: {
        title: 'Luftqualität',
        text: 'EAQI-Index ist {tier}. Empfindliche Personen sollten Aktivitäten im Freien reduzieren.',
      },
      symptoms: {
        title: 'Tagebuchsymptome',
        text: 'Symptome der letzten 48 Stunden erfasst. Veränderungen beobachten; bei Verschlechterung Arzt kontaktieren.',
      },
      symptomsWeek: {
        title: 'Tagebuchsymptome',
        text: 'Symptome an {days} der letzten 7 Tage erfasst. Veränderungen beobachten; bei Verschlechterung Arzt kontaktieren.',
      },
      clinicalScale: {
        title: 'Skala {label}',
        text: 'Letzte Bewertung: {total} Punkte ({level}). Kontrolle mit dem Arzt besprechen.',
      },
      crossReaction: {
        title: 'Mögliche Kreuzreaktionen',
        text: 'Bei erhöhtem Pollenflug mögliche Reaktion auf: {allergens}. Bei Ernährung und Aufenthalt im Freien beachten.',
      },
      food: {
        title: 'Nahrungsmittelallergene',
        text: 'In Ihrem Profil: {allergens}. Prüfen Sie Inhaltsstoffe mit dem Scanner, bevor Sie neue Produkte kaufen.',
      },
      stable: {
        title: 'Stabiler Tag',
        text: 'Umweltindikatoren und Tagebucheinträge deuten nicht auf erhöhte Risiken hin.',
      },
      envUnavailable: {
        title: 'Keine Umweltdaten',
        text: 'Pollen und Luftqualität konnten nicht geladen werden. Der Index basiert nur auf dem Tagebuch.',
      },
      seasonalPollen: {
        title: 'Pollensaison in Ihrer Region',
        text: 'Hauptsaison für «{label}» laut regionalem Kalender. Planen Sie Belastung und Therapie mit Ihrem Arzt.',
      },
    },
    pollenLabels: {
      alder_pollen: 'Erle',
      birch_pollen: 'Birke',
      grass_pollen: 'Wiesenlieschgras',
      mugwort_pollen: 'Beifuß',
      olive_pollen: 'Olive',
      ragweed_pollen: 'Beifußambrosie',
    },
    locationDefault: 'Berlin',
    envUnavailableSummary:
      'Open-Meteo-Daten nicht verfügbar. Der Index nutzt nur Tagebuchdaten; Umweltfaktoren fehlen.',
  },
  scanner: {
    verdicts: {
      'Выявлено множество совпадений': 'Mehrere Übereinstimmungen gefunden',
      'Есть совпадения': 'Übereinstimmungen gefunden',
      'Возможна перекрёстная реакция': 'Mögliche Kreuzreaktion',
      'Нет явных совпадений': 'Keine offensichtlichen Übereinstimmungen',
    },
    reasons: {
      high: 'Signifikante Übereinstimmungen gefunden{productSuffix}: {matches}.',
      medium: 'Potenziell signifikante Übereinstimmung gefunden{productSuffix}: {label}.',
      low: 'Keine offensichtliche Überschneidung mit Profilallergenen gefunden{productSuffix}, dies schließt jedoch keine individuelle Reaktion aus.',
    },
    crossSuffix: '(Kreuzreaktion)',
    traceSuffix: '(Spuren / may contain)',
    productNotFound:
      'Produkt nicht in Open Food Facts gefunden. Die Prüfung wurde unter Verwendung des Barcodes als Text durchgeführt.',
    restaurantMenu: 'Speisekarte',
  },
  diaryValidation: {
    fillField: 'Füllen Sie das Feld «{{label}}» aus.',
    noDescription: 'Keine Beschreibung',
  },
};

export default deContent;
