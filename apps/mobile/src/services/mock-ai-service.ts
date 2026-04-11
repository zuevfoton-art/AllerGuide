export function runMockScan({ mode, text, profile }: { mode: 'product'|'menu'|'medicine'; text: string; profile?: any; }) {
  const allergies: string[] = profile?.allergies ? JSON.parse(profile.allergies) : [];
  const normalized = text.toLowerCase();
  const matches = allergies.filter((item) => normalized.includes(item.toLowerCase().split(' ')[0]));

  if (matches.length >= 2) {
    return {
      verdict: 'Выявлено множество совпадений',
      reason: `Mock AI обнаружил несколько совпадений состава с активным профилем: ${matches.join(', ')}.`,
      matches,
      mode,
      level: 'high',
    };
  }
  if (matches.length === 1) {
    return {
      verdict: 'Есть частичные совпадения',
      reason: `Mock AI обнаружил одно потенциально значимое совпадение: ${matches[0]}.`,
      matches,
      mode,
      level: 'medium',
    };
  }
  return {
    verdict: 'Нет явных совпадений',
    reason: 'Mock AI не нашёл явных пересечений с текущими аллергенами профиля, но это не исключает индивидуальную реакцию.',
    matches,
    mode,
    level: 'low',
  };
}
