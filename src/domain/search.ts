// Reglas de búsqueda de texto; no dependen del visor, PDF.js ni OCR.
export interface TextRange {
  start: number;
  end: number;
}

/**
 * Busca coincidencias sin distinguir mayúsculas de minúsculas.
 * Los acentos se consideran distintos ("sesion" no coincide con "sesión").
 */
export function findMatchRanges(text: string, query: string): TextRange[] {
  const needle = query.trim();

  if (needle.length === 0) return [];

  const haystack = text.toLocaleLowerCase('es');
  const target = needle.toLocaleLowerCase('es');
  const ranges: TextRange[] = [];

  let index = haystack.indexOf(target);

  while (index !== -1) {
    ranges.push({ start: index, end: index + target.length });
    index = haystack.indexOf(target, index + target.length);
  }

  return ranges;
}
