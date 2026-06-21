jest.mock('../ai', () => ({
  callDeepSeek: jest.fn(),
}));

jest.mock('../../storage/database', () => ({
  getAnchorCards: jest.fn(),
  getAllFrontTextsByLanguage: jest.fn(),
  getAvgIntervalByLanguage: jest.fn(),
  getTemplateFields: jest.fn(),
}));

import { buildDailyWordsPrompt, dedupAndRank, generateDailyWords } from '../dailyWords';
import { DailyWord, AnchorCard, TemplateField } from '../../models/types';
import { callDeepSeek } from '../ai';
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage, getTemplateFields } from '../../storage/database';

const mockedCallDeepSeek = jest.mocked(callDeepSeek);
const mockedGetAnchorCards = jest.mocked(getAnchorCards);
const mockedGetAllFrontTexts = jest.mocked(getAllFrontTextsByLanguage);
const mockedGetAvgInterval = jest.mocked(getAvgIntervalByLanguage);
const mockedGetTemplateFields = jest.mocked(getTemplateFields);

describe('buildDailyWordsPrompt', () => {
  test('produces system and user prompts with anchors', () => {
    const anchors: AnchorCard[] = [
      { front_text: 'bonjour', back_text: 'hello' },
      { front_text: 'merci', back_text: 'thank you' },
      { front_text: 'au revoir', back_text: 'goodbye' },
    ];

    const { system, user } = buildDailyWordsPrompt('French', anchors);

    expect(system).toContain('language tutor');
    expect(system).toContain('15 new words');
    expect(user).toContain('French');
    expect(user).toContain('bonjour');
    expect(user).toContain('hello');
    expect(user).toContain('merci');
    expect(user).toContain('thank you');
    expect(user).toContain('au revoir');
    expect(user).toContain('goodbye');
  });

  test('adapts prompt when anchors are empty', () => {
    const { system, user } = buildDailyWordsPrompt('Spanish', []);

    expect(system).toContain('language tutor');
    expect(user).toContain('Spanish');
    expect(user).toContain('complete beginner');
  });

  test('handles fewer than 3 anchors', () => {
    const anchors: AnchorCard[] = [
      { front_text: 'hola', back_text: 'hello' },
    ];

    const { user } = buildDailyWordsPrompt('Spanish', anchors);
    expect(user).toContain('hola');
    expect(user).toContain('hello');
  });

  test('includes template fields in user prompt for custom templates', () => {
    const anchors: AnchorCard[] = [
      { front_text: '你好', back_text: 'hello' },
    ];
    const templateFields: TemplateField[] = [
      { id: 1, template_id: 2, name: '汉字', side: 'front', position: 0 },
      { id: 2, template_id: 2, name: '翻译', side: 'back', position: 0 },
      { id: 3, template_id: 2, name: '拼音', side: 'back', position: 1 },
    ];

    const { user } = buildDailyWordsPrompt('Chinese', anchors, templateFields);

    expect(user).toContain('汉字');
    expect(user).toContain('翻译');
    expect(user).toContain('拼音');
    expect(user).toContain('"fields"');
  });

  test('uses simple front/back format for Basic template', () => {
    const anchors: AnchorCard[] = [];
    const templateFields: TemplateField[] = [
      { id: 1, template_id: 1, name: 'Front', side: 'front', position: 0 },
      { id: 2, template_id: 1, name: 'Back', side: 'back', position: 0 },
    ];

    const { user } = buildDailyWordsPrompt('French', anchors, templateFields);

    expect(user).toContain('"front"');
    expect(user).toContain('"back"');
    expect(user).not.toContain('"fields"');
  });

  test('uses simple front/back format when no template fields provided', () => {
    const { user } = buildDailyWordsPrompt('German', []);

    expect(user).toContain('"front"');
    expect(user).toContain('"back"');
  });
});

describe('dedupAndRank', () => {
  test('removes duplicates matching existing front_text (case-insensitive)', () => {
    const candidates: DailyWord[] = [
      { front: 'bonjour', back: 'hello', complexity: 1, fields: { Front: 'bonjour', Back: 'hello' } },
      { front: 'salut', back: 'hi', complexity: 2, fields: { Front: 'salut', Back: 'hi' } },
      { front: 'BONJOUR', back: 'hello again', complexity: 3, fields: { Front: 'BONJOUR', Back: 'hello again' } },
      { front: 'merci', back: 'thanks', complexity: 1, fields: { Front: 'merci', Back: 'thanks' } },
    ];

    const known = ['bonjour', 'au revoir'];
    const result = dedupAndRank(candidates, known, 2);

    expect(result).toHaveLength(2);
    expect(result[0].front).toBe('salut');
    expect(result[1].front).toBe('merci');
  });

  test('ranks by closeness to target complexity', () => {
    const candidates: DailyWord[] = [
      { front: 'word1', back: 't1', complexity: 1, fields: { Front: 'word1', Back: 't1' } },
      { front: 'word2', back: 't2', complexity: 3, fields: { Front: 'word2', Back: 't2' } },
      { front: 'word3', back: 't3', complexity: 5, fields: { Front: 'word3', Back: 't3' } },
      { front: 'word4', back: 't4', complexity: 2, fields: { Front: 'word4', Back: 't4' } },
    ];

    const result = dedupAndRank(candidates, [], 3);

    // Target is 3: word2 (0 diff) > word4 (1 diff) > word1 (2 diff) > word3 (2 diff, tiebroken by lower complexity)
    expect(result).toHaveLength(4);
    expect(result[0].front).toBe('word2');
    expect(result[1].front).toBe('word4');
    expect(result[2].front).toBe('word1');
    expect(result[3].front).toBe('word3');
  });

  test('returns empty array if all are duplicates', () => {
    const candidates: DailyWord[] = [
      { front: 'bonjour', back: 'hello', complexity: 1, fields: { Front: 'bonjour', Back: 'hello' } },
    ];

    const result = dedupAndRank(candidates, ['bonjour', 'merci'], 1);
    expect(result).toEqual([]);
  });

  test('returns all items sorted by fit when not limited', () => {
    const candidates: DailyWord[] = [
      { front: 'a', back: 'a', complexity: 1, fields: { Front: 'a', Back: 'a' } },
      { front: 'b', back: 'b', complexity: 2, fields: { Front: 'b', Back: 'b' } },
      { front: 'c', back: 'c', complexity: 3, fields: { Front: 'c', Back: 'c' } },
      { front: 'd', back: 'd', complexity: 4, fields: { Front: 'd', Back: 'd' } },
      { front: 'e', back: 'e', complexity: 5, fields: { Front: 'e', Back: 'e' } },
    ];

    const result = dedupAndRank(candidates, [], 3);
    expect(result).toHaveLength(5);
    expect(result[0].front).toBe('c'); // diff 0
    expect(result[1].front).toBe('b'); // diff 1
    expect(result[2].front).toBe('d'); // diff 1, higher complexity
    expect(result[3].front).toBe('a'); // diff 2
    expect(result[4].front).toBe('e'); // diff 2, higher complexity
  });

  test('sorts by fit score then complexity ascending on tie', () => {
    const candidates: DailyWord[] = [
      { front: 'a', back: 'a', complexity: 5, fields: { Front: 'a', Back: 'a' } },
      { front: 'b', back: 'b', complexity: 1, fields: { Front: 'b', Back: 'b' } },
    ];

    // Both complexity 5 and 1 have same |diff| from target 3: |5-3|=2, |1-3|=2
    // Tiebreak: lower complexity first, so 'b' (complexity 1) before 'a' (complexity 5)
    const result = dedupAndRank(candidates, [], 3);
    expect(result[0].front).toBe('b');
    expect(result[1].front).toBe('a');
  });
});

describe('generateDailyWords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when apiKey is empty', async () => {
    const result = await generateDailyWords('French', '');
    expect(result).toBeNull();
  });

  test('returns null when language is empty', async () => {
    const result = await generateDailyWords('', 'sk-test');
    expect(result).toBeNull();
  });

  test('returns null when DeepSeek fails', async () => {
    mockedGetAnchorCards.mockResolvedValue([
      { front_text: 'bonjour', back_text: 'hello' },
    ]);
    mockedGetAvgInterval.mockResolvedValue(7);
    mockedCallDeepSeek.mockResolvedValue(null);

    const result = await generateDailyWords('French', 'sk-test');
    expect(result).toBeNull();
  });

  test('parses successful response and returns top 5', async () => {
    mockedGetAnchorCards.mockResolvedValue([
      { front_text: 'bonjour', back_text: 'hello' },
    ]);
    mockedGetAllFrontTexts.mockResolvedValue(['bonjour']);
    mockedGetAvgInterval.mockResolvedValue(7);
    mockedCallDeepSeek.mockResolvedValue(JSON.stringify({
      words: [
        { front: 'bonjour', back: 'hello', complexity: 1 },
        { front: 'salut', back: 'hi', complexity: 1 },
        { front: 'merci', back: 'thanks', complexity: 2 },
        { front: 'pardon', back: 'sorry', complexity: 2 },
        { front: 'oui', back: 'yes', complexity: 1 },
        { front: 'non', back: 'no', complexity: 1 },
        { front: 'chat', back: 'cat', complexity: 3 },
      ],
    }));

    const result = await generateDailyWords('French', 'sk-test');
    expect(result).toHaveLength(5);
    expect(result![0].front).toBe('salut'); // 'bonjour' was deduped
  });

  test('parses fields format response for custom template', async () => {
    mockedGetAnchorCards.mockResolvedValue([]);
    mockedGetAllFrontTexts.mockResolvedValue([]);
    mockedGetAvgInterval.mockResolvedValue(0);
    mockedGetTemplateFields.mockResolvedValue([
      { id: 1, template_id: 2, name: '汉字', side: 'front', position: 0 },
      { id: 2, template_id: 2, name: '翻译', side: 'back', position: 0 },
      { id: 3, template_id: 2, name: '拼音', side: 'back', position: 1 },
    ] as TemplateField[]);
    mockedCallDeepSeek.mockResolvedValue(JSON.stringify({
      words: [
        { fields: { '汉字': '你好', '翻译': 'hello', '拼音': 'nǐ hǎo' }, complexity: 1 },
        { fields: { '汉字': '谢谢', '翻译': 'thanks', '拼音': 'xiè xiè' }, complexity: 1 },
        { fields: { '汉字': '再见', '翻译': 'goodbye', '拼音': 'zài jiàn' }, complexity: 2 },
        { fields: { '汉字': '对不起', '翻译': 'sorry', '拼音': 'duì bù qǐ' }, complexity: 2 },
        { fields: { '汉字': '高兴', '翻译': 'happy', '拼音': 'gāo xìng' }, complexity: 1 },
        { fields: { '汉字': '美丽', '翻译': 'beautiful', '拼音': 'měi lì' }, complexity: 3 },
      ],
    }));

    const result = await generateDailyWords('Chinese', 'sk-test', 2);
    expect(result).toHaveLength(5);
    expect(result![0].fields['汉字']).toBe('你好');
    expect(result![0].front).toBe('你好');
    expect(result![0].back).toBe('hello');
  });
});
