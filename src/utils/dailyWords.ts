import { DailyWord, AnchorCard, TemplateField } from '../models/types';
import { callDeepSeek } from './ai';
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage, getTemplateFields } from '../storage/database';

const SYSTEM_PROMPT = `You are a language tutor creating a daily vocabulary drop. Given words the student recently reviewed, generate 15 new words at a similar difficulty level. Each word should be naturally adjacent to the anchors — same topic domain, complexity tier, and word type (noun/verb/adj). Return ONLY valid JSON.`;

export function buildDailyWordsPrompt(
  language: string,
  anchors: AnchorCard[],
  templateFields?: TemplateField[]
): { system: string; user: string } {
  const sortedFields = templateFields
    ? [...templateFields].sort((a, b) => {
        if (a.side !== b.side) return a.side === 'front' ? -1 : 1;
        return a.position - b.position;
      })
    : [];
  const frontFields = sortedFields.filter(f => f.side === 'front');
  const backFields = sortedFields.filter(f => f.side === 'back');
  const isBasicTemplate = frontFields.length === 1 && backFields.length === 1
    && frontFields[0].name === 'Front' && backFields[0].name === 'Back';

  if (anchors.length === 0) {
    if (isBasicTemplate || sortedFields.length === 0) {
      return {
        system: SYSTEM_PROMPT,
        user: `Language: ${language}. The learner is a complete beginner.
Generate 15 new ${language} words appropriate for elementary level.
Rate each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`,
      };
    }
    return {
      system: SYSTEM_PROMPT,
      user: `Language: ${language}. The learner is a complete beginner.
Template fields (front): ${frontFields.map(f => f.name).join(', ')}
Template fields (back): ${backFields.map(f => f.name).join(', ')}

Generate 15 new ${language} words appropriate for elementary level.
For each word, provide values for ALL fields listed above.
Rate each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"fields": {${sortedFields.map(f => `"${f.name}":"..."`).join(',')}},"complexity":3}, ...]}`,
    };
  }

  const anchorLines = anchors
    .map((a, i) => `${i + 1}. "${a.front_text}" = "${a.back_text}"`)
    .join('\n');

  if (isBasicTemplate || sortedFields.length === 0) {
    return {
      system: SYSTEM_PROMPT,
      user: `Language: ${language}.
Anchors:
${anchorLines}

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`,
    };
  }

  return {
    system: SYSTEM_PROMPT,
    user: `Language: ${language}.
Anchors:
${anchorLines}
Template fields (front): ${frontFields.map(f => f.name).join(', ')}
Template fields (back): ${backFields.map(f => f.name).join(', ')}

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
For each word, provide values for ALL fields listed above.
Return ONLY valid JSON: {"words": [{"fields": {${sortedFields.map(f => `"${f.name}":"..."`).join(',')}},"complexity":3}, ...]}`,
  };
}

export function dedupAndRank(
  candidates: DailyWord[],
  knownWords: string[],
  targetLevel: number
): DailyWord[] {
  const knownLower = new Set(knownWords.map((w) => w.toLowerCase().trim()));

  const deduped = candidates.filter((c) => {
    const frontLower = c.front.toLowerCase().trim();
    return !knownLower.has(frontLower);
  });

  deduped.sort((a, b) => {
    const fitA = Math.abs(a.complexity - targetLevel);
    const fitB = Math.abs(b.complexity - targetLevel);
    if (fitA !== fitB) return fitA - fitB;
    return a.complexity - b.complexity;
  });

  return deduped;
}

function parseWordsResponse(rawText: string, templateFields?: TemplateField[]): DailyWord[] {
  const cleaned = rawText.replace(/```(?:json)?\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.words || !Array.isArray(parsed.words)) {
    throw new Error('Invalid response format: missing words array');
  }
  return parsed.words.map((w: any) => {
    let front: string;
    let back: string;
    let fields: Record<string, string>;
    if (w.fields && typeof w.fields === 'object') {
      fields = w.fields;
      const frontFields = templateFields?.filter(f => f.side === 'front').sort((a, b) => a.position - b.position) ?? [];
      const backFields = templateFields?.filter(f => f.side === 'back').sort((a, b) => a.position - b.position) ?? [];
      front = frontFields.length > 0 ? fields[frontFields[0].name] || '' : '';
      back = backFields.length > 0 ? fields[backFields[0].name] || '' : '';
    } else {
      front = String(w.front || '');
      back = String(w.back || '');
      fields = { Front: front, Back: back };
    }
    return {
      fields,
      front,
      back,
      complexity: Number(w.complexity) || 1,
    };
  });
}

function computeTargetLevel(avgInterval: number): number {
  if (avgInterval <= 0) return 1;
  const level = Math.ceil(avgInterval / 7);
  return Math.max(1, Math.min(5, level));
}

export async function generateDailyWords(
  language: string,
  apiKey: string,
  templateId?: number
): Promise<DailyWord[] | null> {
  if (!language || !apiKey) return null;

  const anchors = await getAnchorCards(language);
  let templateFields: TemplateField[] = [];
  if (templateId) {
    templateFields = await getTemplateFields(templateId);
  }
  const { system, user } = buildDailyWordsPrompt(language, anchors, templateFields.length > 0 ? templateFields : undefined);

  const MAX_RETRIES = 2;
  let survivingWords: DailyWord[] = [];
  const knownWords = await getAllFrontTextsByLanguage(language);
  const avgInterval = await getAvgIntervalByLanguage(language);
  const targetLevel = computeTargetLevel(avgInterval);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const wordsToRequest = attempt === 0 ? 15 : 5 + survivingWords.length;

    const requestUser = attempt === 0
      ? user
      : `${user}\n\nPlease generate ${wordsToRequest} new words. Avoid previously suggested words.`;

    const rawText = await callDeepSeek(apiKey, system, requestUser, {
      maxTokens: 1024,
      temperature: 0.9,
    });

    if (!rawText) return null;

    try {
      const candidates = parseWordsResponse(rawText, templateFields.length > 0 ? templateFields : undefined);
      const ranked = dedupAndRank(candidates, knownWords, targetLevel);

      if (attempt === 0) {
        survivingWords = ranked;
      } else {
        const existingFronts = new Set(survivingWords.map((w) => w.front.toLowerCase()));
        const newWords = ranked.filter((w) => !existingFronts.has(w.front.toLowerCase()));
        survivingWords = [...survivingWords, ...newWords];
      }

      if (survivingWords.length >= 5) break;
    } catch {
      if (attempt === MAX_RETRIES) return survivingWords.length > 0 ? survivingWords : null;
    }
  }

  return survivingWords.slice(0, 5);
}
