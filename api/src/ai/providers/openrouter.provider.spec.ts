import type { ConfigService } from '@nestjs/config';

import { OpenRouterProvider } from './openrouter.provider';

describe('OpenRouterProvider', () => {
  const originalFetch = global.fetch;
  const config = {
    get: (key: string) =>
      ({
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_SITE_URL: 'https://example.test',
        OPENROUTER_APP_TITLE: 'TUS',
      })[key],
  } as ConfigService;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends a text response and reads output and token usage', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'answer' }],
            },
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
            cost: 0.002,
          },
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    const result = await new OpenRouterProvider(config).runText(
      'system',
      'question',
      '~openai/gpt-sol-latest',
      { maxTokens: 100, responseFormat: 'json_object' },
    );

    expect(result).toEqual({
      content: 'answer',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        costUSD: 0.002,
      },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/responses');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'HTTP-Referer': 'https://example.test',
      'X-OpenRouter-Title': 'TUS',
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: '~openai/gpt-sol-latest',
      instructions: 'system',
      input: 'question',
      max_output_tokens: 100,
      text: { format: { type: 'json_object' } },
    });
  });

  it('sends image data through the Responses API', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output_text: 'image description',
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    await new OpenRouterProvider(config).runVision(
      {
        systemPrompt: 'describe',
        userPrompt: 'what is shown?',
        imageBase64: 'aGVsbG8=',
        mimeType: 'image/png',
      },
      '~openai/gpt-sol-latest',
    );

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(request.body as string) as {
      input: Array<{ content: unknown }>;
    };
    expect(body.input[0].content).toEqual([
      { type: 'input_text', text: 'what is shown?' },
      { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' },
    ]);
  });

  it('returns embedding vectors', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ embedding: [0.1, 0.2] }],
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    await expect(
      new OpenRouterProvider(config).runEmbedding(
        'text',
        'openai/text-embedding-3-small',
      ),
    ).resolves.toEqual([0.1, 0.2]);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/embeddings');
  });

  it('surfaces an incomplete response error', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'failed',
          error: { message: 'provider unavailable' },
        }),
        { status: 200 },
      ),
    );

    await expect(
      new OpenRouterProvider(config).runText(
        'system',
        'question',
        '~openai/gpt-sol-latest',
      ),
    ).rejects.toThrow('provider unavailable');
  });
});
