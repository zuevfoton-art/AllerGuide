export type AllergenCategory = 'food' | 'environmental' | 'medication' | 'insect';

export interface AllergenRecord {
  id: string;
  name: string;
  category: AllergenCategory;
  popular: boolean;
  keywords: string[];
}

export const ALLERGEN_CATEGORY_LABELS: Record<AllergenCategory, string> = {
  food: 'Еда',
  environmental: 'Среда',
  medication: 'Лекарства',
  insect: 'Насекомые',
};

export const ALLERGENS: AllergenRecord[] = [
  {
    id: 'milk',
    name: 'Молоко',
    category: 'food',
    popular: true,
    keywords: ['молоко', 'лактоза', 'казеин', 'сыворотка', 'сливки'],
  },
  {
    id: 'goat-milk',
    name: 'Козье молоко',
    category: 'food',
    popular: false,
    keywords: ['козье молоко', 'козь', 'козин'],
  },
  {
    id: 'eggs',
    name: 'Яйца',
    category: 'food',
    popular: true,
    keywords: ['яйц', 'альбумин', 'овальбумин'],
  },
  {
    id: 'peanut',
    name: 'Арахис',
    category: 'food',
    popular: true,
    keywords: ['арахис'],
  },
  {
    id: 'tree-nuts',
    name: 'Орехи',
    category: 'food',
    popular: true,
    keywords: ['орех', 'миндаль', 'фундук', 'грецкий'],
  },
  {
    id: 'hazelnut',
    name: 'Фундук',
    category: 'food',
    popular: false,
    keywords: ['фундук', 'лещина'],
  },
  {
    id: 'fish',
    name: 'Рыба',
    category: 'food',
    popular: true,
    keywords: ['рыба', 'рыбный', 'лосось', 'треска'],
  },
  {
    id: 'seafood',
    name: 'Морепродукты',
    category: 'food',
    popular: false,
    keywords: ['кревет', 'мидии', 'кальмар', 'краб', 'морепродукт'],
  },
  {
    id: 'wheat-gluten',
    name: 'Пшеница / глютен',
    category: 'food',
    popular: true,
    keywords: ['глютен', 'пшениц', 'мука'],
  },
  {
    id: 'soy',
    name: 'Соя',
    category: 'food',
    popular: true,
    keywords: ['соя', 'соев'],
  },
  {
    id: 'sesame',
    name: 'Кунжут',
    category: 'food',
    popular: false,
    keywords: ['кунжут', 'sesame'],
  },
  {
    id: 'beef',
    name: 'Говядина',
    category: 'food',
    popular: false,
    keywords: ['говядин', 'телят'],
  },
  {
    id: 'chicken',
    name: 'Курица',
    category: 'food',
    popular: false,
    keywords: ['куриц', 'курин', 'индейк'],
  },
  {
    id: 'pork',
    name: 'Свинина',
    category: 'food',
    popular: false,
    keywords: ['свинин', 'свиной'],
  },
  {
    id: 'citrus',
    name: 'Цитрусовые',
    category: 'food',
    popular: false,
    keywords: ['цитрус', 'апельсин', 'лимон', 'мандарин'],
  },
  {
    id: 'apple',
    name: 'Яблоко',
    category: 'food',
    popular: false,
    keywords: ['яблок', 'яблочн'],
  },
  {
    id: 'carrot',
    name: 'Морковь',
    category: 'food',
    popular: false,
    keywords: ['морков'],
  },
  {
    id: 'banana',
    name: 'Банан',
    category: 'food',
    popular: false,
    keywords: ['банан'],
  },
  {
    id: 'kiwi',
    name: 'Киви',
    category: 'food',
    popular: false,
    keywords: ['киви'],
  },
  {
    id: 'avocado',
    name: 'Авокадо',
    category: 'food',
    popular: false,
    keywords: ['авокадо'],
  },
  {
    id: 'strawberry',
    name: 'Клубника',
    category: 'food',
    popular: false,
    keywords: ['клубник', 'земляник'],
  },
  {
    id: 'tomato',
    name: 'Томаты',
    category: 'food',
    popular: false,
    keywords: ['томат', 'помидор'],
  },
  {
    id: 'honey',
    name: 'Мёд',
    category: 'food',
    popular: false,
    keywords: ['мёд', 'мед', 'прополис'],
  },
  {
    id: 'birch-pollen',
    name: 'Пыльца берёзы',
    category: 'environmental',
    popular: true,
    keywords: ['берёз', 'берез'],
  },
  {
    id: 'ragweed-pollen',
    name: 'Пыльца амброзии',
    category: 'environmental',
    popular: false,
    keywords: ['амброз'],
  },
  {
    id: 'dust-mites',
    name: 'Пыль клещей',
    category: 'environmental',
    popular: true,
    keywords: ['клещ', 'домашняя пыль'],
  },
  {
    id: 'house-dust',
    name: 'Бытовая пыль',
    category: 'environmental',
    popular: false,
    keywords: ['пыль', 'пылев'],
  },
  {
    id: 'mold',
    name: 'Плесень',
    category: 'environmental',
    popular: false,
    keywords: ['плесен', 'грибок', 'aspergillus'],
  },
  {
    id: 'cat-dander',
    name: 'Шерсть кошек',
    category: 'environmental',
    popular: false,
    keywords: ['кошк', 'кошач'],
  },
  {
    id: 'dog-dander',
    name: 'Шерсть собак',
    category: 'environmental',
    popular: false,
    keywords: ['собак', 'собач'],
  },
  {
    id: 'latex',
    name: 'Латекс',
    category: 'environmental',
    popular: false,
    keywords: ['латекс', 'каучук'],
  },
  {
    id: 'penicillin',
    name: 'Пенициллин',
    category: 'medication',
    popular: true,
    keywords: ['пенициллин'],
  },
  {
    id: 'aspirin',
    name: 'Аспирин',
    category: 'medication',
    popular: false,
    keywords: ['аспирин', 'салицил'],
  },
  {
    id: 'insect-stings',
    name: 'Укусы насекомых',
    category: 'insect',
    popular: false,
    keywords: ['пчел', 'ос', 'шершн', 'комар', 'насеком'],
  },
];

const allergenById = new Map(ALLERGENS.map((item) => [item.id, item]));
const allergenByName = new Map(ALLERGENS.map((item) => [item.name, item]));

export function getAllAllergens(): AllergenRecord[] {
  return ALLERGENS;
}

export function getPopularAllergens(): AllergenRecord[] {
  return ALLERGENS.filter((item) => item.popular);
}

export function getAllergensByCategory(category: AllergenCategory): AllergenRecord[] {
  return ALLERGENS.filter((item) => item.category === category);
}

export function findAllergenById(id: string): AllergenRecord | undefined {
  return allergenById.get(id);
}

export function findAllergenByName(name: string): AllergenRecord | undefined {
  return allergenByName.get(name);
}

export function buildAllergenKeywordsMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (const allergen of ALLERGENS) {
    map[allergen.name.toLowerCase()] = allergen.keywords;
  }

  return map;
}

export function getAllAllergenNames(): string[] {
  return ALLERGENS.map((item) => item.name);
}
