const COMBINING_MARKS = /\p{M}/gu;

function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

export function matchesTitle(title: string | null, query: string): boolean {
  if (title === null) {
    return false;
  }

  return normalizeForSearch(title).includes(normalizeForSearch(query.trim()));
}
