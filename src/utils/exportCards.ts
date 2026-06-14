import { getCardsByDeckId, getTemplateFields, getDeckById } from '../storage/database';
import { Card, TemplateField } from '../models/types';
import { parseFieldValues } from './cards';

export async function exportDeckToCSV(deckId: number): Promise<string> {
  const deck = await getDeckById(deckId);
  const cards = await getCardsByDeckId(deckId);

  const templateIds = new Set(cards.filter((c) => c.template_id != null).map((c) => c.template_id!));
  const fieldsMap = new Map<number, TemplateField[]>();
  for (const tid of templateIds) {
    fieldsMap.set(tid, await getTemplateFields(tid));
  }

  const allFieldNames = new Set<string>();
  const cardRows: Array<{ front: string; back: string; fields: Record<string, string> }> = [];

  for (const card of cards) {
    const fields = card.template_id ? (fieldsMap.get(card.template_id) ?? []) : [];
    const values = parseFieldValues(card.field_values);

    const frontFields = fields.filter((f) => f.side === 'front');
    const backFields = fields.filter((f) => f.side === 'back');
    const rowFields: Record<string, string> = {};

    for (const f of frontFields) {
      const normalized = `front:${f.name}`;
      rowFields[normalized] = values[f.name] ?? '';
      allFieldNames.add(normalized);
    }
    for (const f of backFields) {
      const normalized = `back:${f.name}`;
      rowFields[normalized] = values[f.name] ?? '';
      allFieldNames.add(normalized);
    }

    if (frontFields.length === 0 && backFields.length === 0) {
      rowFields['front:Front'] = card.front_text;
      rowFields['back:Back'] = card.back_text;
      allFieldNames.add('front:Front');
      allFieldNames.add('back:Back');
      cardRows.push({ front: card.front_text, back: card.back_text, fields: rowFields });
    } else {
      cardRows.push({ front: card.front_text, back: card.back_text, fields: rowFields });
    }
  }

  const sortedFields = Array.from(allFieldNames).sort();
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = sortedFields.map(escape).join(',');
  const rows = cardRows.map((row) =>
    sortedFields.map((f) => escape(row.fields[f] ?? '')).join(',')
  );

  return [header, ...rows].join('\n');
}

export async function exportDeckToJSON(deckId: number): Promise<string> {
  const deck = await getDeckById(deckId);
  const cards = await getCardsByDeckId(deckId);

  const templateIds = new Set(cards.filter((c) => c.template_id != null).map((c) => c.template_id!));
  const fieldsMap = new Map<number, TemplateField[]>();
  for (const tid of templateIds) {
    fieldsMap.set(tid, await getTemplateFields(tid));
  }

  const output = cards.map((card) => {
    const fields = card.template_id ? (fieldsMap.get(card.template_id) ?? []) : [];
    const values = parseFieldValues(card.field_values);

    const cardData: Record<string, unknown> = {
      front_text: card.front_text,
      back_text: card.back_text,
    };

    for (const f of fields) {
      cardData[`${f.side}:${f.name}`] = values[f.name] ?? '';
    }

    return cardData;
  });

  return JSON.stringify(output, null, 2);
}
