import { callDeepSeek } from '../ai';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('callDeepSeek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns parsed content on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"result":"ok"}' } }],
      }),
    });

    const result = await callDeepSeek('sk-test', 'You are helpful', 'Say hello');
    expect(result).toBe('{"result":"ok"}');
  });

  test('returns null on API error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await callDeepSeek('sk-bad', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await callDeepSeek('sk-test', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('returns null when response has no choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await callDeepSeek('sk-test', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('uses custom model when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
    });

    await callDeepSeek('sk-test', 'sys', 'msg', { model: 'deepseek-chat', maxTokens: 512, temperature: 0.3 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.max_tokens).toBe(512);
    expect(body.temperature).toBe(0.3);
  });

  test('defaults model to deepseek-v4-flash', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
    });

    await callDeepSeek('sk-test', 'sys', 'msg');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-v4-flash');
  });
});
