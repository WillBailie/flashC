import { TemplateField } from '../models/types';

export interface ImportedCard {
  front_text: string;
  back_text: string;
  field_values?: Record<string, string>;
}

function sortFields(fields: TemplateField[]): TemplateField[] {
  const front = fields.filter((f) => f.side === 'front').sort((a, b) => a.position - b.position);
  const back = fields.filter((f) => f.side === 'back').sort((a, b) => a.position - b.position);
  return [...front, ...back];
}

export function parseCSV(content: string, fields?: TemplateField[]): ImportedCard[] {
  const lines = content.trim().split('\n');
  const cards: ImportedCard[] = [];

  const hasHeader = fields && fields.length > 0;
  let headerMap: Record<string, number> | null = null;

  let lineIdx = 0;
  if (hasHeader) {
    const firstParts = parseCSVLine(lines[0].trim());
    headerMap = {};
    firstParts.forEach((h, i) => {
      headerMap![h.trim()] = i;
    });
    lineIdx = 1;
  }

  const sortedFields = fields ? sortFields(fields) : [];

  for (; lineIdx < lines.length; lineIdx++) {
    const trimmed = lines[lineIdx].trim();
    if (!trimmed) continue;

    const parts = parseCSVLine(trimmed);
    if (parts.length < 2) continue;

    if (hasHeader && headerMap && sortedFields.length > 0) {
      const values: Record<string, string> = {};
      for (const f of sortedFields) {
        const colIdx = headerMap[f.name];
        if (colIdx !== undefined && colIdx < parts.length) {
          values[f.name] = parts[colIdx].trim();
        }
      }
      const frontField = sortedFields.find((f) => f.side === 'front');
      const backField = sortedFields.find((f) => f.side === 'back');
      cards.push({
        front_text: frontField ? (values[frontField.name] ?? '') : parts[0]?.trim() ?? '',
        back_text: backField ? (values[backField.name] ?? '') : parts[1]?.trim() ?? '',
        field_values: values,
      });
    } else if (sortedFields.length > 0) {
      const values: Record<string, string> = {};
      sortedFields.forEach((f, i) => {
        if (i < parts.length) {
          values[f.name] = parts[i].trim();
        }
      });
      const frontField = sortedFields.find((f) => f.side === 'front');
      const backField = sortedFields.find((f) => f.side === 'back');
      cards.push({
        front_text: frontField ? (values[frontField.name] ?? '') : parts[0]?.trim() ?? '',
        back_text: backField ? (values[backField.name] ?? '') : parts[1]?.trim() ?? '',
        field_values: values,
      });
    } else {
      cards.push({
        front_text: parts[0].trim(),
        back_text: parts[1].trim(),
      });
    }
  }

  return cards;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseJSON(content: string, fields?: TemplateField[]): ImportedCard[] {
  const data = JSON.parse(content);

  const sortedFields = fields ? sortFields(fields) : [];

  const mapItem = (item: any): ImportedCard => {
    if (sortedFields.length > 0) {
      const values: Record<string, string> = {};
      for (const f of sortedFields) {
        const prefixedKey = `${f.side}:${f.name}`;
        if (typeof item[prefixedKey] === 'string') {
          values[f.name] = item[prefixedKey];
        } else if (typeof item[f.name] === 'string') {
          values[f.name] = item[f.name];
        }
      }
      const frontField = sortedFields.find((f) => f.side === 'front');
      const backField = sortedFields.find((f) => f.side === 'back');

      let frontText =
        (frontField ? values[frontField.name] || undefined : undefined) ??
        item.front ?? item.front_text ?? item.question;
      let backText =
        (backField ? values[backField.name] || undefined : undefined) ??
        item.back ?? item.back_text ?? item.answer;

      if (!frontText || !backText) {
        const keys = Object.keys(item).filter((k) => typeof item[k] === 'string');
        if (keys.length >= 2) {
          frontText = frontText ?? item[keys[0]];
          backText = backText ?? item[keys[1]];
        }
      }

      return {
        front_text: typeof frontText === 'string' ? frontText : '',
        back_text: typeof backText === 'string' ? backText : '',
        field_values: values,
      };
    }

    if (typeof item.front === 'string' && typeof item.back === 'string') {
      return { front_text: item.front, back_text: item.back };
    }
    if (typeof item.front_text === 'string' && typeof item.back_text === 'string') {
      return { front_text: item.front_text, back_text: item.back_text };
    }
    if (typeof item.question === 'string' && typeof item.answer === 'string') {
      return { front_text: item.question, back_text: item.answer };
    }
    const keys = Object.keys(item).filter((k) => typeof item[k] === 'string');
    if (keys.length >= 2) {
      return { front_text: item[keys[0]], back_text: item[keys[1]] };
    }
    throw new Error('Invalid card format. Expected {front, back}, {front_text, back_text}, or {question, answer}');
  };

  if (Array.isArray(data)) {
    return data.map(mapItem);
  }

  if (data.cards && Array.isArray(data.cards)) {
    return parseJSON(JSON.stringify(data.cards), fields);
  }

  throw new Error('Invalid JSON format. Expected an array or {cards: [...]}');
}
