export function csvDocument(rows: (string | number | null | undefined)[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    // Prevent spreadsheet formula execution, including leading whitespace/control characters.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
