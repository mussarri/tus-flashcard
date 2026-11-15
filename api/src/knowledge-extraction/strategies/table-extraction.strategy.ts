/** Normalize structured tables before sending their actual rows to AI. */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function cell(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function inferTableFromText(content: string): ParsedTable {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const markdownRows = lines.filter((line) => line.includes('|'));

  if (markdownRows.length >= 2) {
    const parsed = markdownRows.map(splitMarkdownRow);
    const headers = parsed[0] ?? [];
    if (!headers.length || headers.some((header) => !header)) {
      throw new Error('Markdown table has empty headers');
    }
    const rows = parsed
      .slice(1)
      .filter(
        (row) =>
          row.some(Boolean) && !row.every((value) => /^:?-{3,}:?$/.test(value)),
      );
    if (rows.some((row) => row.length !== headers.length)) {
      throw new Error('Markdown table rows do not match headers');
    }
    return { headers, rows };
  }

  const rows = lines
    .filter((line) => /^[-*•]|^\d+[.)]/.test(line))
    .map((line) => [line.replace(/^[-*•\d.)\s]+/, '').trim()])
    .filter((row) => Boolean(row[0]));
  return { headers: rows.length ? ['Madde'] : [], rows };
}

function splitMarkdownRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let escaped = false;
  let codeDelimiter = 0;
  for (let i = 0; i < line.length; i++) {
    const character = line[i];
    if (escaped) {
      current += character === '|' ? '|' : `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '`') {
      let count = 1;
      while (line[i + count] === '`') count++;
      if (codeDelimiter === 0) codeDelimiter = count;
      else if (codeDelimiter === count) codeDelimiter = 0;
      current += '`'.repeat(count);
      i += count - 1;
      continue;
    }
    if (character === '|' && codeDelimiter === 0) {
      cells.push(cell(current));
      current = '';
    } else {
      current += character;
    }
  }
  if (escaped) current += '\\';
  cells.push(cell(current));
  if (line.trimStart().startsWith('|')) cells.shift();
  if (line.trimEnd().endsWith('|')) cells.pop();
  return cells;
}

function normalizeTable(value: unknown): ParsedTable | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as { headers?: unknown; rows?: unknown };
  if (!Array.isArray(object.headers) || !Array.isArray(object.rows))
    return null;
  const headers = object.headers.map(cell);
  if (!headers.length || headers.some((header) => !header)) return null;
  const rows = object.rows
    .map((row: unknown) => {
      if (Array.isArray(row)) return row.map(cell);
      if (row && typeof row === 'object') {
        const values = row as Record<string, unknown>;
        const mapped = headers.map((header) => cell(values[header]));
        return mapped;
      }
      return null;
    })
    .filter((row): row is string[] => row !== null)
    .filter((row: string[]) => row.some(Boolean));
  return headers.length &&
    rows.length &&
    rows.every((row) => row.length === headers.length)
    ? { headers, rows }
    : null;
}

export function parseTables(
  tableData: unknown,
  content: string,
): ParsedTable[] {
  if (Array.isArray(tableData)) {
    const tables = tableData
      .map(normalizeTable)
      .filter((table): table is ParsedTable => table !== null);
    if (tables.length !== tableData.length)
      throw new Error('Invalid structured table data');
    return tables;
  }
  if (tableData != null) {
    const structured = normalizeTable(tableData);
    if (!structured) throw new Error('Invalid structured table data');
    return [structured];
  }
  const inferred = inferTableFromText(content);
  return inferred.headers.length && inferred.rows.length ? [inferred] : [];
}

export function chunkTable(
  table: ParsedTable,
  maxRows = 15,
  maxChars = 7000,
): ParsedTable[] {
  const chunks: ParsedTable[] = [];
  let rows: string[][] = [];
  let size = JSON.stringify(table.headers).length;
  for (const row of table.rows) {
    const rowSize = JSON.stringify(row).length;
    if (rows.length && (rows.length >= maxRows || size + rowSize > maxChars)) {
      chunks.push({ headers: table.headers, rows });
      rows = [];
      size = JSON.stringify(table.headers).length;
    }
    rows.push(row);
    size += rowSize;
  }
  if (rows.length) chunks.push({ headers: table.headers, rows });
  return chunks;
}
