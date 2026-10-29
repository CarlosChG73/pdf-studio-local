// Valida posiciones físicas y equivalencias editoriales puntuales, sin inferir desplazamientos.
export function clampPage(page: number, totalPages: number): number {
  const total = Math.max(1, totalPages);

  if (!Number.isFinite(page)) return 1;

  return Math.min(Math.max(1, Math.trunc(page)), total);
}

/** A single user-confirmed equivalence; never extrapolated to adjacent pages. */
export interface EditorialPageReference {
  physicalPage: number;
  editorialPage: number;
}

export function validEditorialReference(reference: EditorialPageReference, totalPages: number): boolean {
  return Number.isSafeInteger(reference.physicalPage) && Number.isSafeInteger(reference.editorialPage)
    && reference.physicalPage >= 1 && reference.physicalPage <= totalPages && reference.editorialPage >= 1;
}

export function physicalToEditorial(page: number, reference: EditorialPageReference | null): number | null {
  return reference?.physicalPage === page ? reference.editorialPage : null;
}

export function editorialToPhysical(label: string, reference: EditorialPageReference | null): number | null {
  if (!reference || !/^[0-9]+$/.test(label)) return null;
  const editorial = Number(label);
  return editorial === reference.editorialPage ? reference.physicalPage : null;
}
