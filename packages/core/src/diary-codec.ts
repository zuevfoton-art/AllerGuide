export interface StructuredDiaryPayload {
  v: 1;
  answers: Record<string, string>;
}

export function decodeDiaryDetails(details: string): StructuredDiaryPayload | null {
  try {
    const parsed = JSON.parse(details) as StructuredDiaryPayload;
    if (parsed?.v === 1 && parsed.answers && typeof parsed.answers === 'object') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
