/** Escape AI/website-derived text before inserting it into an HTML template.
 * React JSX escapes automatically; this is specifically for HTML strings.
 */
export function escapeHtmlText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] || char));
}
