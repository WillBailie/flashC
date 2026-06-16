interface ExampleResult {
  sentence: string;
  translation: string;
  pinyin: string;
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function buildPrompt(word: string, language: string): string {
  return `Generate a natural ${language} sentence (max 15 words) using the word "${word}". Return ONLY valid JSON with no markdown formatting: {"sentence":"...","translation":"...","pinyin":"..."}`;
}

export async function generateExample(
  word: string,
  language: string,
  apiKey: string
): Promise<ExampleResult | null> {
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'user', content: buildPrompt(word, language) },
        ],
        max_tokens: 256,
        temperature: 0.7,
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
