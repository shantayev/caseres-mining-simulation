/** Parse one CSV row (RFC 4180-style quoted fields). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      fields.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields.map(f => f.trim());
}

export interface GetCsvFieldOptions {
  /** Merge extra comma-separated segments (unquoted industrial_placements). */
  mergeExtraCommas?: boolean;
}

/**
 * Read a column by header name. Handles rows where `industrial_placements`
 * was exported unquoted and split on the comma in `type:x,y`.
 */
export function getCsvField(
  header: string[],
  values: string[],
  columnName: string,
  options: GetCsvFieldOptions = {}
): string {
  const idx = header.indexOf(columnName);
  if (idx < 0) return '';

  const extra = values.length - header.length;
  if (options.mergeExtraCommas && extra > 0 && columnName === 'industrial_placements') {
    return values.slice(idx, idx + extra + 1).join(',');
  }

  return values[idx] ?? '';
}

/** Escape a field for CSV when it contains commas, quotes, or newlines. */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
