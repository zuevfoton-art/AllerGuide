/**
 * Cosmetic / household irritants that are not profile food allergens.
 * Used to annotate INCI labels without adding items to the profile wizard.
 */

export type InciIrritantGroup = 'fragrance-eu26' | 'preservative' | 'other';

export type InciIrritant = {
  id: string;
  nameRu: string;
  inci: string[];
  group: InciIrritantGroup;
};

export const INCI_IRRITANTS: InciIrritant[] = [
  { id: 'limonene', nameRu: 'Лимонен', inci: ['limonene', 'd-limonene', 'лимонен'], group: 'fragrance-eu26' },
  { id: 'linalool', nameRu: 'Линалоол', inci: ['linalool', 'линалоол'], group: 'fragrance-eu26' },
  { id: 'geraniol', nameRu: 'Гераниол', inci: ['geraniol', 'гераниол'], group: 'fragrance-eu26' },
  { id: 'citral', nameRu: 'Цитраль', inci: ['citral', 'цитраль'], group: 'fragrance-eu26' },
  { id: 'eugenol', nameRu: 'Эвгенол', inci: ['eugenol', 'эвгенол'], group: 'fragrance-eu26' },
  { id: 'coumarin', nameRu: 'Кумарин', inci: ['coumarin', 'кумарин'], group: 'fragrance-eu26' },
  { id: 'cinnamal', nameRu: 'Циннамаль', inci: ['cinnamal', 'cinnamaldehyde', 'циннамаль'], group: 'fragrance-eu26' },
  { id: 'cinnamyl-alcohol', nameRu: 'Коричный спирт', inci: ['cinnamyl alcohol', 'коричный спирт'], group: 'fragrance-eu26' },
  { id: 'citronellol', nameRu: 'Цитронеллол', inci: ['citronellol', 'цитронеллол'], group: 'fragrance-eu26' },
  { id: 'farnesol', nameRu: 'Фарнезол', inci: ['farnesol', 'фарнезол'], group: 'fragrance-eu26' },
  { id: 'benzyl-alcohol', nameRu: 'Бензиловый спирт', inci: ['benzyl alcohol', 'бензиловый спирт'], group: 'fragrance-eu26' },
  { id: 'benzyl-benzoate', nameRu: 'Бензилбензоат', inci: ['benzyl benzoate'], group: 'fragrance-eu26' },
  { id: 'benzyl-salicylate', nameRu: 'Бензилсалицилат', inci: ['benzyl salicylate'], group: 'fragrance-eu26' },
  { id: 'hexyl-cinnamal', nameRu: 'Гексилциннамаль', inci: ['hexyl cinnamal', 'hexylcinnamal'], group: 'fragrance-eu26' },
  { id: 'hydroxycitronellal', nameRu: 'Гидроксицитронеллаль', inci: ['hydroxycitronellal'], group: 'fragrance-eu26' },
  { id: 'isoeugenol', nameRu: 'Изоэвгенол', inci: ['isoeugenol'], group: 'fragrance-eu26' },
  { id: 'amyl-cinnamal', nameRu: 'Амилциннамаль', inci: ['amyl cinnamal', 'amylcinnamal'], group: 'fragrance-eu26' },
  { id: 'anise-alcohol', nameRu: 'Анисовый спирт', inci: ['anise alcohol'], group: 'fragrance-eu26' },
  { id: 'methylisothiazolinone', nameRu: 'Метилизотиазолинон', inci: ['methylisothiazolinone', 'mit', 'метилизотиазолинон'], group: 'preservative' },
  { id: 'methylchloroisothiazolinone', nameRu: 'Метилхлороизотиазолинон', inci: ['methylchloroisothiazolinone', 'mci'], group: 'preservative' },
  { id: 'methylparaben', nameRu: 'Метилпарабен', inci: ['methylparaben', 'метилпарабен', 'paraben'], group: 'preservative' },
  { id: 'propylparaben', nameRu: 'Пропилпарабен', inci: ['propylparaben', 'пропилпарабен'], group: 'preservative' },
  { id: 'formaldehyde', nameRu: 'Формальдегид', inci: ['formaldehyde', 'формальдегид', 'dmdm hydantoin', 'quaternium-15', 'imidazolidinyl urea'], group: 'preservative' },
  { id: 'lanolin', nameRu: 'Ланолин', inci: ['lanolin', 'ланолин', 'lanolin alcohol'], group: 'other' },
  { id: 'ppd', nameRu: 'ППД', inci: ['p-phenylenediamine', 'ppd', 'п-фенилендиамин'], group: 'other' },
];

export function findInciIrritants(text: string): InciIrritant[] {
  const haystack = text.toLowerCase();
  if (!haystack.trim()) return [];
  return INCI_IRRITANTS.filter((item) =>
    item.inci.some((alias) => haystack.includes(alias.toLowerCase())),
  );
}
