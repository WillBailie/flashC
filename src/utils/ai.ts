const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export interface DeepSeekOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: DeepSeekOptions
): Promise<string | null> {
  try {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? 'deepseek-v4-flash',
        messages,
        max_tokens: options?.maxTokens ?? 256,
        temperature: options?.temperature ?? 0.7,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('No response from AI');
    }

    return rawText;
  } catch (error: any) {
    const { Alert } = require('react-native');
    Alert.alert(
      'Generation Failed',
      error?.message || 'Could not generate content. Please try again.'
    );
    return null;
  }
}

interface ExampleResult {
  sentence: string;
  translation: string;
  pinyin: string;
}

export async function generateExample(
  word: string,
  language: string,
  apiKey: string
): Promise<ExampleResult | null> {
  const systemPrompt = '';
  const userPrompt = `Generate a natural ${language} sentence (max 15 words) using the word "${word}". Return ONLY valid JSON with no markdown formatting: {"sentence":"...","translation":"...","pinyin":"..."}`;

  const rawText = await callDeepSeek(apiKey, systemPrompt, userPrompt, {
    maxTokens: 256,
    temperature: 0.7,
  });

  if (!rawText) return null;

  try {
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as ExampleResult;
    if (!parsed.sentence || !parsed.translation) {
      throw new Error('Invalid response format');
    }
    return parsed;
  } catch (error: any) {
    const { Alert } = require('react-native');
    Alert.alert(
      'Generation Failed',
      error?.message || 'Could not generate an example. Please try again.'
    );
    return null;
  }
}
