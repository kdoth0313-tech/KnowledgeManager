/**
 * Highlight search keywords in text by wrapping matches in <mark> tags.
 * Case-insensitive. Splits query into individual terms.
 * Escapes HTML in the original text first.
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim() || !text) return escapeHtml(text)

  const escaped = escapeHtml(text)
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)

  if (terms.length === 0) return escaped

  // Build a single regex that matches any term, case-insensitive
  const escapedTerms = terms.map((t) => escapeRegex(t))
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi')

  return escaped.replace(regex, '<mark>$1</mark>')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
