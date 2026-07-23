import type { LocaleContent } from './types';

const itContent: LocaleContent = {
  diarySections: {
    Симптомы: {
      title: 'Sintomi',
      steps: {
        symptoms: {
          label: 'Quali sintomi sono presenti?',
          placeholder: 'Ad esempio: prurito, gonfiore alle labbra, tosse',
        },
        intensity: {
          label: 'Quanto sono intensi i sintomi?',
          choices: [
            '0 — nessuno',
            '1',
            '2',
            '3',
            '4',
            '5 — moderato',
            '6',
            '7',
            '8',
            '9',
            '10 — molto intenso',
          ],
        },
        symptomAreas: {
          label: 'Aree interessate',
          choices: ['Naso', 'Occhi', 'Respirazione', 'Pelle', 'Apparato digerente', 'Generale'],
        },
        onset: {
          label: 'Quando è iniziato?',
          placeholder: 'Ad esempio: stamattina, 2 ore fa',
        },
      },
    },
    Лекарство: {
      title: 'Farmaco',
      steps: {
        medicine: {
          label: 'Nome del farmaco',
          placeholder: 'Ad esempio: cetirizina',
        },
        dosage: {
          label: 'Dosaggio',
          placeholder: 'Ad esempio: 10 mg, 1 compressa',
        },
        takenAt: {
          label: 'Orario di assunzione',
          placeholder: 'Ad esempio: 08:30',
        },
        effect: {
          label: 'Effetto o reazione avversa',
          placeholder: 'Ha fatto effetto? Ci sono stati effetti collaterali?',
        },
      },
    },
    Питание: {
      title: 'Alimentazione',
      steps: {
        food: {
          label: 'Cosa è stato mangiato?',
          placeholder: 'Piatti, alimenti, bevande',
        },
        foodComponents: {
          label: 'Ingredienti del piatto',
        },
        allergens: {
          label: 'Possibili allergeni negli alimenti',
          placeholder: 'Latte, frutta a guscio, glutine…',
        },
        reaction: {
          label: 'Reazione dopo il pasto',
          choices: ['Nessuna reazione', 'Lieve', 'Moderata', 'Grave'],
        },
      },
    },
    Триггер: {
      title: 'Fattore scatenante',
      steps: {
        trigger: {
          label: 'Qual è stato il fattore scatenante?',
          placeholder: 'Polline, animale, stress, cibo…',
        },
        context: {
          label: 'Dove e in quali circostanze?',
          placeholder: 'A casa, all\'aperto, in visita…',
        },
        triggerNotes: {
          label: 'Dettagli aggiuntivi',
          placeholder: 'Cos\'altro è importante registrare?',
        },
      },
    },
    Кожа: {
      title: 'Pelle',
      steps: {
        skinArea: {
          label: 'Quale area della pelle è interessata?',
          placeholder: 'Viso, mani, collo…',
        },
        appearance: {
          label: 'Com\'è la pelle?',
          placeholder: 'Arrossamento, eruzione, secchezza, gonfiore…',
        },
        itching: {
          label: 'Intensità del prurito',
          choices: ['Nessuno', 'Lieve', 'Moderato', 'Grave'],
        },
        skinNotes: {
          label: 'Cosa ha migliorato o peggiorato lo stato?',
        },
      },
    },
    Пикфлоуметрия: {
      title: 'Peak flow',
      steps: {
        pefTime: {
          label: 'Orario della misurazione',
          choices: ['Mattina', 'Sera'],
        },
        pefValue: {
          label: 'Valore PEF (L/min)',
          placeholder: 'Ad esempio: 320',
        },
        pefBest: {
          label: 'Miglior valore del periodo (se noto)',
          placeholder: 'Ad esempio: 400',
        },
        pefNotes: {
          label: 'Commento',
          placeholder: 'Benessere generale, crisi, farmaci…',
        },
      },
    },
    АСИТ: {
      title: 'Immunoterapia',
      steps: {
        asitDrug: {
          label: 'Nome del farmaco',
          placeholder: 'Come prescritto dal medico',
        },
        asitSchedule: {
          label: 'Schema posologico (descrizione)',
          placeholder: 'Come indicato dal medico, senza modificare le dosi',
        },
        asitTakenAt: {
          label: 'Data e ora di assunzione',
          placeholder: '18 giugno, 10:00',
        },
        asitReaction: {
          label: 'Reazione soggettiva',
          choices: ['Nessuna reazione', 'Lieve', 'Moderata', 'Grave'],
        },
      },
    },
    'Визит к врачу': {
      title: 'Visita medica',
      steps: {
        visitDoctorType: {
          label: 'Tipo di medico',
          choices: ['Allergologo', 'Pediatra', 'Pneumologo', 'Immunologo', 'Altro'],
        },
        visitDate: {
          label: 'Data e ora della visita',
          placeholder: '25 giugno, 14:30',
        },
        visitComment: {
          label: 'Commento',
          placeholder: 'Preparare un report di 30 giorni',
        },
      },
    },
    Заметка: {
      title: 'Nota',
      steps: {
        noteTitle: {
          label: 'Titolo breve',
          placeholder: 'Ad esempio: visita dall\'allergologo',
        },
        noteBody: {
          label: 'Nota dettagliata',
          placeholder: 'Qualsiasi osservazione che si desidera salvare',
        },
      },
    },
  },
  diaryTypes: {
    Симптомы: 'Sintomi',
    Лекарство: 'Farmaco',
    Питание: 'Alimentazione',
    Триггер: 'Fattore scatenante',
    Кожа: 'Pelle',
    Пикфлоуметрия: 'Peak flow',
    АСИТ: 'Immunoterapia',
    'Визит к врачу': 'Visita medica',
    Заметка: 'Nota',
  },
  reportBlocks: {
    symptoms: 'Sintomi',
    medicine: 'Farmaci',
    food: 'Alimentazione',
    triggers: 'Fattori scatenanti',
    peakflow: 'Peak flow',
    asit: 'Immunoterapia',
    skin: 'Manifestazioni cutanee',
    notes: 'Note',
  },
  emergencyRelations: {
    relative: 'Parente',
    trusted: 'Contatto fidato',
    doctor: 'Medico',
  },
  allergenCategories: {
    food: 'Alimenti',
    environmental: 'Ambiente',
    medication: 'Farmaci',
    insect: 'Insetti',
  },
  expertHero: {
    name: 'Prof. Yuri Solomonovich Smolkin, MD, PhD',
    role: 'Presidente di ADAIR, Direttore Scientifico del Centro Nazionale di Ricerca Clinica',
    subtitle: 'Esperto medico principale di Aclearo',
  },
  expertDisclaimer:
    'I contenuti degli esperti hanno finalità informative e di riferimento e non costituiscono una prescrizione medica.',
  expertCategories: {
    recommendations: 'Raccomandazioni per tipo di allergia',
    'pollen-calendar': 'Calendario stagionale del polline',
    'allergen-guide': 'Guida agli allergeni',
    asit: 'Protocolli di immunoterapia',
    emergency: 'Pronto soccorso',
    'symptom-scales': 'Scale di gravità dei sintomi',
  },
  expertArticles: {
    'pollinosis-basics': {
      title: 'Polinosi: cosa deve sapere il paziente',
      summary: 'Sintomi stagionali, prevenzione dell\'esposizione al polline, quando consultare un medico.',
      body:
        'La polinosi provoca congestione nasale, starnuti, prurito agli occhi e talvolta tosse. ' +
        'Consultate la previsione del polline nella vostra regione, aerate l\'abitazione nelle ore a basso polline ' +
        'e usate lavaggi con soluzione fisiologica come concordato con il medico. Qualsiasi modifica terapeutica deve essere effettuata solo con un allergologo.',
    },
    'food-allergy-tips': {
      title: 'Allergia alimentare: lettura delle etichette',
      summary: 'Come verificare gli ingredienti e cosa chiedere al produttore.',
      body:
        'Leggete attentamente l\'elenco degli ingredienti, prestate attenzione a tracce di allergeni e reazioni incrociate. ' +
        'Lo scanner Aclearo aiuta a orientarsi tra i prodotti, ma non sostituisce la lettura dell\'etichetta e la consultazione con il medico.',
    },
    'asthma-diary': {
      title: 'Asma bronchiale: tenere un diario',
      summary: 'Perché registrare il PEF e i sintomi respiratori.',
      body:
        'Misurazioni regolari del flusso espiratorio di picco aiutano a monitorare i cambiamenti nel tempo. ' +
        'L\'app visualizza valori e zone orientate GINA rispetto al migliore personale, ' +
        'ma non trae conclusioni cliniche: l\'interpretazione spetta al medico curante.',
    },
    'asthma-pef-basics': {
      title: 'Peak flow nell\'asma',
      summary: 'Come misurare il PEF e il significato delle zone.',
      body:
        'Il PEF si misura con un piccoflussimetro, di solito mattina e sera. ' +
        'Il migliore personale è definito dal medico. Orientamento GINA: verde ≥80 %, gialla 50–79 %, rossa <50 %.',
    },
    'asthma-act-basics': {
      title: 'Test di controllo dell\'asma (ACT)',
      summary: 'Breve scala di autovalutazione su 4 settimane.',
      body:
        'L\'ACT ha 5 domande sugli ultimi 4 settimane. ' +
        '20–25: buon controllo; 16–19: parziale; ≤15: non controllato (GINA). Discuta il risultato con il medico.',
    },
    'asthma-triggers': {
      title: 'Fattori scatenanti del peggioramento',
      summary: 'Cosa spesso peggiora la respirazione.',
      body:
        'Infezioni, allergeni, fumo, sforzo al freddo, stress e alcuni farmaci sono comuni. ' +
        'Registri i fattori scatenanti nel diario per aiutare il medico.',
    },
    'asthma-when-to-see-doctor': {
      title: 'Quando consultare il medico per l\'asma',
      summary: 'Segnali che richiedono consulto o urgenze.',
      body:
        'Chiami i soccorsi per dispnea grave o mancato effetto del farmaco di salvataggio prescritto. ' +
        'Fissi un appuntamento se il PEF resta in zona gialla o rossa, ACT ≤15 o aumentano i risvegli notturni.',
    },
    'pollen-calendar-moscow': {
      title: 'Calendario del polline: regione centrale',
      summary: 'Picchi di betulla, graminacee e ambrosia per mese.',
      body:
        'Aprile–maggio: polline arboreo (betulla, ontano). Giugno–luglio: polline delle graminacee. Agosto–settembre: ambrosia e assenzio. ' +
        'I dati sono indicativi: confermate la previsione con il medico curante.',
    },
    'cross-reactions': {
      title: 'Reazioni incrociate',
      summary: 'Il legame tra polline di betulla e mela, frutta a guscio e verdure.',
      body:
        'Con allergia al polline di betulla, sono possibili reazioni a mela, pera, carota e frutta a guscio (sindrome da allergia orale). ' +
        'Lo scanner tiene conto di questi legami durante la verifica dei prodotti.',
    },
    'asit-patient-info': {
      title: 'Immunoterapia: informazioni generali per i pazienti',
      summary: 'Cos\'è l\'immunoterapia specifica con allergeni.',
      body:
        'L\'immunoterapia è prescritta solo da un medico dopo la valutazione. Nel diario dell\'immunoterapia, registrate date di assunzione e reazioni soggettive. ' +
        'L\'app non seleziona schemi né regola le dosi.',
    },
    'anaphylaxis-info': {
      title: 'Anafilassi: indicazioni generali',
      summary: 'Quando chiamare i servizi di emergenza e cosa comunicare al personale sanitario.',
      body:
        'Se compaiono segni di reazione grave, chiamate i servizi di emergenza. La schermata SOS mostra le informazioni inserite dall\'utente. ' +
        'L\'app non prescrive trattamenti: seguite le indicazioni del medico e le linee guida per le emergenze.',
    },
    'symptom-scale-rhinitis': {
      title: 'Scala dei sintomi di rinite',
      summary: 'Descrizione di riferimento dei livelli di gravità.',
      body:
        'Lieve: starnuti occasionali, congestione senza disagio significativo. ' +
        'Moderata: sintomi quotidiani che influenzano sonno o lavoro. ' +
        'Grave: sintomi persistenti che limitano sostanzialmente l\'attività. La valutazione è effettuata da un medico.',
    },
  },
  wellness: {
    status: {
      good: {
        title: 'Buono',
        summary: 'Le condizioni ambientali e le voci del diario non suggeriscono rischi elevati.',
      },
      moderate: {
        title: 'Moderato',
        summary: 'Ci sono fattori individuali da monitorare: consultare le raccomandazioni.',
      },
      attention: {
        title: 'Attenzione aumentata',
        summary: 'Diversi fattori possono influire sul benessere.',
      },
      'high-risk': {
        title: 'Rischio elevato',
        summary: 'Consigliamo di ridurre al minimo i fattori scatenanti e consultare il medico.',
      },
    },
    pollenTier: {
      low: 'Basso',
      mid: 'Medio',
      high: 'Alto',
    },
    aqiTier: {
      low: 'Buona',
      mid: 'Moderata',
      high: 'Scarsa',
      noData: 'Nessun dato',
    },
    recommendations: {
      pollen: {
        title: 'Ridurre l\'esposizione al polline',
        text: 'Il livello di polline per «{label}» è {tier}. Limitate le passeggiate all\'aperto durante le ore di picco diurno del polline.',
      },
      aqi: {
        title: 'Qualità dell\'aria',
        text: 'L\'indice EAQI è {tier}. Le persone sensibili dovrebbero ridurre l\'attività all\'aperto.',
      },
      symptoms: {
        title: 'Sintomi del diario',
        text: 'Sintomi registrati nelle ultime 48 ore. Monitorate l\'evoluzione; contattate il medico se peggiorano.',
      },
      symptomsWeek: {
        title: 'Sintomi del diario',
        text: 'Sintomi registrati in {days} degli ultimi 7 giorni. Monitorate l\'evoluzione; contattate il medico se peggiorano.',
      },
      clinicalScale: {
        title: 'Scala {label}',
        text: 'Ultima valutazione: {total} punti ({level}). Discutete il controllo con il medico.',
      },
      crossReaction: {
        title: 'Possibili reazioni incrociate',
        text: 'Con polline elevato, possibile reazione a: {allergens}. Da considerare per alimentazione e attività all\'aperto.',
      },
      food: {
        title: 'Allergeni alimentari',
        text: 'Nel profilo: {allergens}. Verificate gli ingredienti con lo scanner prima di acquistare nuovi prodotti.',
      },
      stable: {
        title: 'Giornata stabile',
        text: 'Gli indicatori ambientali e le voci del diario non suggeriscono rischi elevati.',
      },
      envUnavailable: {
        title: 'Dati ambientali non disponibili',
        text: 'Impossibile caricare polline e qualità dell\'aria. L\'indice riflette solo il diario.',
      },
      seasonalPollen: {
        title: 'Stagione del polline nella tua regione',
        text: 'Picco di «{label}» secondo il calendario regionale. Pianifica esposizione e terapia con il medico.',
      },
    },
    pollenLabels: {
      alder_pollen: 'Ontano',
      birch_pollen: 'Betulla',
      grass_pollen: 'Festuca prati',
      mugwort_pollen: 'Artemisia',
      olive_pollen: 'Olivo',
      ragweed_pollen: 'Ambrosia',
    },
    locationDefault: 'Rome',
    envUnavailableSummary:
      'Dati Open-Meteo non disponibili. L\'indice usa solo il diario; fattori ambientali esclusi.',
  },
  scanner: {
    verdicts: {
      'Выявлено множество совпадений': 'Trovate più corrispondenze',
      'Есть совпадения': 'Trovate corrispondenze',
      'Возможна перекрёстная реакция': 'Possibile reazione incrociata',
      'Нет явных совпадений': 'Nessuna corrispondenza evidente',
    },
    reasons: {
      high: 'Trovate corrispondenze significative{productSuffix}: {matches}.',
      medium: 'Trovata corrispondenza potenzialmente significativa{productSuffix}: {label}.',
      low: 'Nessuna sovrapposizione evidente con gli allergeni del profilo trovata{productSuffix}, ma ciò non esclude una reazione individuale.',
    },
    crossSuffix: '(reazione incrociata)',
    traceSuffix: '(tracce / may contain)',
    productNotFound:
      'Prodotto non trovato in Open Food Facts. La verifica è stata eseguita utilizzando il codice a barre come testo.',
    restaurantMenu: 'Menu del ristorante',
  },
  diaryValidation: {
    fillField: 'Compilate il campo «{{label}}».',
    noDescription: 'Nessuna descrizione',
  },
};

export default itContent;
