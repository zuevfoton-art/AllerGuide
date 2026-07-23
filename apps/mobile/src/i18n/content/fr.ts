import type { LocaleContent } from './types';

const frContent: LocaleContent = {
  diarySections: {
    Симптомы: {
      title: 'Symptômes',
      steps: {
        symptoms: {
          label: 'Quels symptômes sont présents ?',
          placeholder: 'Par exemple : démangeaisons, gonflement des lèvres, toux',
        },
        intensity: {
          label: 'Quelle est l\'intensité des symptômes ?',
          choices: [
            '0 — aucun',
            '1',
            '2',
            '3',
            '4',
            '5 — modéré',
            '6',
            '7',
            '8',
            '9',
            '10 — très intense',
          ],
        },
        symptomAreas: {
          label: 'Zones touchées',
          choices: ['Nez', 'Yeux', 'Respiration', 'Peau', 'Appareil digestif', 'Général'],
        },
        onset: {
          label: 'Quand cela a-t-il commencé ?',
          placeholder: 'Par exemple : ce matin, il y a 2 heures',
        },
      },
    },
    Лекарство: {
      title: 'Médicament',
      steps: {
        medicine: {
          label: 'Nom du médicament',
          placeholder: 'Par exemple : cétirizine',
        },
        dosage: {
          label: 'Posologie',
          placeholder: 'Par exemple : 10 mg, 1 comprimé',
        },
        takenAt: {
          label: 'Heure de la prise',
          placeholder: 'Par exemple : 08:30',
        },
        effect: {
          label: 'Effet ou réaction indésirable',
          placeholder: 'A-t-il aidé ? Y a-t-il eu des effets secondaires ?',
        },
      },
    },
    Питание: {
      title: 'Alimentation',
      steps: {
        food: {
          label: 'Qu\'a-t-on mangé ?',
          placeholder: 'Plats, aliments, boissons',
        },
        foodComponents: {
          label: 'Ingrédients du plat',
        },
        allergens: {
          label: 'Allergènes alimentaires possibles',
          placeholder: 'Lait, fruits à coque, gluten…',
        },
        reaction: {
          label: 'Réaction après le repas',
          choices: ['Aucune réaction', 'Légère', 'Modérée', 'Sévère'],
        },
      },
    },
    Триггер: {
      title: 'Déclencheur',
      steps: {
        trigger: {
          label: 'Quel a été le déclencheur ?',
          placeholder: 'Pollen, animal, stress, aliment…',
        },
        context: {
          label: 'Où et dans quelles circonstances ?',
          placeholder: 'À domicile, en extérieur, en visite…',
        },
        triggerNotes: {
          label: 'Détails supplémentaires',
          placeholder: 'Qu\'est-ce d\'autre est important à noter ?',
        },
      },
    },
    Кожа: {
      title: 'Peau',
      steps: {
        skinArea: {
          label: 'Quelle zone de peau est touchée ?',
          placeholder: 'Visage, mains, cou…',
        },
        appearance: {
          label: 'À quoi ressemble la peau ?',
          placeholder: 'Rougeur, éruption, sécheresse, gonflement…',
        },
        itching: {
          label: 'Intensité des démangeaisons',
          choices: ['Aucune', 'Légère', 'Modérée', 'Sévère'],
        },
        skinNotes: {
          label: 'Qu\'est-ce qui a amélioré ou aggravé l\'état ?',
        },
      },
    },
    Пикфлоуметрия: {
      title: 'Débit expiratoire de pointe',
      steps: {
        pefTime: {
          label: 'Heure de la mesure',
          choices: ['Matin', 'Soir'],
        },
        pefValue: {
          label: 'Valeur DEP (L/min)',
          placeholder: 'Par exemple : 320',
        },
        pefBest: {
          label: 'Meilleure valeur de la période (si connue)',
          placeholder: 'Par exemple : 400',
        },
        pefNotes: {
          label: 'Commentaire',
          placeholder: 'État général, crise, médicaments…',
        },
      },
    },
    АСИТ: {
      title: 'Immunothérapie',
      steps: {
        asitDrug: {
          label: 'Nom du médicament',
          placeholder: 'Selon la prescription de votre médecin',
        },
        asitSchedule: {
          label: 'Schéma posologique (description)',
          placeholder: 'Selon les indications de votre médecin, sans ajuster les doses',
        },
        asitTakenAt: {
          label: 'Date et heure de la prise',
          placeholder: '18 juin, 10:00',
        },
        asitReaction: {
          label: 'Réaction subjective',
          choices: ['Aucune réaction', 'Légère', 'Modérée', 'Sévère'],
        },
      },
    },
    'Визит к врачу': {
      title: 'Consultation médicale',
      steps: {
        visitDoctorType: {
          label: 'Type de médecin',
          choices: ['Allergologue', 'Pédiatre', 'Pneumologue', 'Immunologue', 'Autre'],
        },
        visitDate: {
          label: 'Date et heure de la consultation',
          placeholder: '25 juin, 14:30',
        },
        visitComment: {
          label: 'Commentaire',
          placeholder: 'Préparer un rapport sur 30 jours',
        },
      },
    },
    Заметка: {
      title: 'Note',
      steps: {
        noteTitle: {
          label: 'Titre court',
          placeholder: 'Par exemple : consultation chez l\'allergologue',
        },
        noteBody: {
          label: 'Note détaillée',
          placeholder: 'Toute observation que vous souhaitez conserver',
        },
      },
    },
  },
  diaryTypes: {
    Симптомы: 'Symptômes',
    Лекарство: 'Médicament',
    Питание: 'Alimentation',
    Триггер: 'Déclencheur',
    Кожа: 'Peau',
    Пикфлоуметрия: 'Débit expiratoire de pointe',
    АСИТ: 'Immunothérapie',
    'Визит к врачу': 'Consultation médicale',
    Заметка: 'Note',
  },
  reportBlocks: {
    symptoms: 'Symptômes',
    medicine: 'Médicaments',
    food: 'Alimentation',
    triggers: 'Déclencheurs',
    peakflow: 'Débit expiratoire de pointe',
    asit: 'Immunothérapie',
    skin: 'Manifestations cutanées',
    notes: 'Notes',
  },
  emergencyRelations: {
    relative: 'Proche',
    trusted: 'Contact de confiance',
    doctor: 'Médecin',
  },
  allergenCategories: {
    food: 'Aliments',
    environmental: 'Environnement',
    medication: 'Médicaments',
    insect: 'Insectes',
  },
  expertHero: {
    name: 'Pr. Yuri Solomonovich Smolkin, MD, PhD',
    role: 'Président de l\'ADAIR, Directeur scientifique du Centre national de recherche clinique',
    subtitle: 'Expert médical en chef d\'Aclearo',
  },
  expertDisclaimer:
    'Le contenu d\'experts est fourni à titre informatif et de référence uniquement et ne constitue pas une prescription médicale.',
  expertCategories: {
    recommendations: 'Recommandations selon le type d\'allergie',
    'pollen-calendar': 'Calendrier saisonnier du pollen',
    'allergen-guide': 'Guide des allergènes',
    asit: 'Protocoles d\'immunothérapie',
    emergency: 'Soins d\'urgence',
    'symptom-scales': 'Échelles de gravité des symptômes',
  },
  expertArticles: {
    'pollinosis-basics': {
      title: 'Pollinose : ce que le patient doit savoir',
      summary: 'Symptômes saisonniers, prévention de l\'exposition au pollen, quand consulter un médecin.',
      body:
        'La pollinose provoque une congestion nasale, des éternuements, des démangeaisons oculaires et parfois une toux. ' +
        'Consultez la prévision pollinique de votre région, aérez votre logement aux heures de faible pollen ' +
        'et utilisez des lavages au sérum physiologique selon l\'accord avec votre médecin. Toute modification thérapeutique ne doit être faite qu\'avec un allergologue.',
    },
    'food-allergy-tips': {
      title: 'Allergie alimentaire : lecture des étiquettes',
      summary: 'Comment vérifier les ingrédients et quoi demander au fabricant.',
      body:
        'Lisez attentivement la liste des ingrédients, surveillez les traces d\'allergènes et les réactions croisées. ' +
        'Le scanner Aclearo vous aide à vous orienter parmi les produits, mais ne remplace pas la lecture de l\'étiquette ni la consultation de votre médecin.',
    },
    'asthma-diary': {
      title: 'Asthme bronchique : tenir un journal',
      summary: 'Pourquoi enregistrer le DEP et les symptômes respiratoires.',
      body:
        'Des mesures régulières du débit expiratoire de pointe aident à suivre l\'évolution dans le temps. ' +
        'L\'application visualise les valeurs et les zones orientées GINA par rapport au meilleur personnel, ' +
        'mais ne tire pas de conclusions cliniques — l\'interprétation relève de votre médecin traitant.',
    },
    'asthma-pef-basics': {
      title: 'Débit de pointe dans l\'asthme',
      summary: 'Comment mesurer le DEP et comprendre les zones.',
      body:
        'Le DEP se mesure avec un débimètre de pointe, le matin et le soir en général. ' +
        'Le meilleur personnel est fixé par le médecin. Repères GINA : vert ≥80 %, jaune 50–79 %, rouge <50 %.',
    },
    'asthma-act-basics': {
      title: 'Test de contrôle de l\'asthme (ACT)',
      summary: 'Échelle d\'autocontrôle sur 4 semaines.',
      body:
        'L\'ACT comporte 5 questions sur les symptômes des 4 dernières semaines. ' +
        '20–25 : bon contrôle ; 16–19 : partiel ; ≤15 : non contrôlé (GINA). Discutez-en avec votre médecin.',
    },
    'asthma-triggers': {
      title: 'Déclencheurs d\'aggravation de l\'asthme',
      summary: 'Ce qui aggrave souvent la respiration.',
      body:
        'Infections, allergènes, tabac, effort au froid, stress et certains médicaments sont fréquents. ' +
        'Notez les déclencheurs dans le journal pour aider votre médecin.',
    },
    'asthma-when-to-see-doctor': {
      title: 'Quand consulter pour l\'asthme',
      summary: 'Signaux nécessitant consultation ou urgences.',
      body:
        'Appelez les secours en cas de détresse respiratoire sévère ou d\'absence d\'effet du secours prescrit. ' +
        'Consultez si le DEP reste en zone jaune ou rouge, ACT ≤15 ou réveils nocturnes accrus.',
    },
    'pollen-calendar-moscow': {
      title: 'Calendrier pollinique : région centrale',
      summary: 'Pics de bouleau, graminées et ambroisie par mois.',
      body:
        'Avril–mai : pollen d\'arbres (bouleau, aulne). Juin–juillet : pollen de graminées. Août–septembre : ambroisie et armoise. ' +
        'Les données sont indicatives — confirmez la prévision avec votre médecin traitant.',
    },
    'cross-reactions': {
      title: 'Réactions croisées',
      summary: 'Le lien entre le pollen de bouleau et la pomme, les fruits à coque et les légumes.',
      body:
        'En cas d\'allergie au pollen de bouleau, des réactions à la pomme, à la poire, à la carotte et aux fruits à coque sont possibles (syndrome d\'allergie orale). ' +
        'Le scanner prend ces liens en compte lors de l\'analyse des produits.',
    },
    'asit-patient-info': {
      title: 'Immunothérapie : informations générales pour les patients',
      summary: 'Ce qu\'est l\'immunothérapie spécifique aux allergènes.',
      body:
        'L\'immunothérapie est prescrite uniquement par un médecin après examen. Dans le journal d\'immunothérapie, notez les dates de prise et les réactions subjectives. ' +
        'L\'application ne choisit pas les schémas ni n\'ajuste les doses.',
    },
    'anaphylaxis-info': {
      title: 'Anaphylaxie : recommandations générales',
      summary: 'Quand appeler les services d\'urgence et quoi dire aux secouristes.',
      body:
        'Si des signes de réaction sévère apparaissent, appelez les services d\'urgence. L\'écran SOS affiche les informations saisies par l\'utilisateur. ' +
        'L\'application ne prescrit pas de traitement — suivez les instructions de votre médecin et les recommandations de prise en charge d\'urgence.',
    },
    'symptom-scale-rhinitis': {
      title: 'Échelle des symptômes de rhinite',
      summary: 'Description de référence des niveaux de gravité.',
      body:
        'Léger : éternuements occasionnels, congestion sans gêne significative. ' +
        'Modéré : symptômes quotidiens affectant le sommeil ou le travail. ' +
        'Sévère : symptômes persistants limitant substantiellement l\'activité. L\'évaluation est faite par un médecin.',
    },
  },
  wellness: {
    status: {
      good: {
        title: 'Bon',
        summary: 'Les conditions environnementales et les entrées du journal ne suggèrent pas de risques élevés.',
      },
      moderate: {
        title: 'Modéré',
        summary: 'Il y a des facteurs individuels à surveiller — voir les recommandations.',
      },
      attention: {
        title: 'Attention accrue',
        summary: 'Plusieurs facteurs peuvent affecter votre état.',
      },
      'high-risk': {
        title: 'Risque élevé',
        summary: 'Nous recommandons de minimiser les déclencheurs et de consulter votre médecin.',
      },
    },
    pollenTier: {
      low: 'Faible',
      mid: 'Moyen',
      high: 'Élevé',
    },
    aqiTier: {
      low: 'Bonne',
      mid: 'Modérée',
      high: 'Mauvaise',
      noData: 'Pas de données',
    },
    recommendations: {
      pollen: {
        title: 'Réduire l\'exposition au pollen',
        text: 'Le niveau de pollen pour « {label} » est {tier}. Limitez les promenades en extérieur aux heures de pic diurne du pollen.',
      },
      aqi: {
        title: 'Qualité de l\'air',
        text: 'L\'indice EAQI est {tier}. Les personnes sensibles devraient réduire l\'activité en extérieur.',
      },
      symptoms: {
        title: 'Symptômes du journal',
        text: 'Symptômes enregistrés au cours des 48 dernières heures. Suivez l\'évolution ; contactez votre médecin s\'ils s\'aggravent.',
      },
      symptomsWeek: {
        title: 'Symptômes du journal',
        text: 'Symptômes enregistrés sur {days} des 7 derniers jours. Suivez l\'évolution ; contactez votre médecin s\'ils s\'aggravent.',
      },
      clinicalScale: {
        title: 'Échelle {label}',
        text: 'Dernière évaluation : {total} points ({level}). Discutez du contrôle avec votre médecin.',
      },
      crossReaction: {
        title: 'Réactions croisées possibles',
        text: 'Avec un pollen élevé, réaction possible à : {allergens}. À prendre en compte pour l\'alimentation et les sorties.',
      },
      food: {
        title: 'Allergènes alimentaires',
        text: 'Dans votre profil : {allergens}. Vérifiez les ingrédients avec le scanner avant d\'acheter de nouveaux produits.',
      },
      stable: {
        title: 'Journée stable',
        text: 'Les indicateurs environnementaux et les entrées du journal ne suggèrent pas de risques élevés.',
      },
      envUnavailable: {
        title: 'Données environnementales indisponibles',
        text: 'Impossible de charger le pollen et la qualité de l\'air. L\'indice reflète uniquement le journal.',
      },
      seasonalPollen: {
        title: 'Saison pollinique dans votre région',
        text: 'Pic de « {label} » selon le calendrier régional. Planifiez l\'exposition et le traitement avec votre médecin.',
      },
    },
    pollenLabels: {
      alder_pollen: 'Aulne',
      birch_pollen: 'Bouleau',
      grass_pollen: 'Fléole des prés',
      mugwort_pollen: 'Armoise',
      olive_pollen: 'Olive',
      ragweed_pollen: 'Ambroisie',
    },
    locationDefault: 'Paris',
    envUnavailableSummary:
      'Données Open-Meteo indisponibles. L\'indice utilise le journal uniquement; facteurs environnementaux exclus.',
  },
  scanner: {
    verdicts: {
      'Выявлено множество совпадений': 'Plusieurs correspondances détectées',
      'Есть совпадения': 'Correspondances détectées',
      'Возможна перекрёстная реакция': 'Réaction croisée possible',
      'Нет явных совпадений': 'Aucune correspondance évidente',
    },
    reasons: {
      high: 'Correspondances significatives détectées{productSuffix} : {matches}.',
      medium: 'Correspondance potentiellement significative détectée{productSuffix} : {label}.',
      low: 'Aucune correspondance évidente avec les allergènes du profil détectée{productSuffix}, mais cela n\'exclut pas une réaction individuelle.',
    },
    crossSuffix: '(réaction croisée)',
    traceSuffix: '(traces / may contain)',
    productNotFound:
      'Produit introuvable dans Open Food Facts. La vérification a été effectuée en utilisant le code-barres comme texte.',
    restaurantMenu: 'Carte du restaurant',
  },
  diaryValidation: {
    fillField: 'Remplissez le champ « {{label}} ».',
    noDescription: 'Pas de description',
  },
};

export default frContent;
