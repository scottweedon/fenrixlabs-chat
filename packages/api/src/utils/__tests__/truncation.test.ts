import { getTruncationStopReason, hasOpenToolCall } from '../truncation';

describe('getTruncationStopReason', () => {
  it('returns null when there is no metadata at all', () => {
    expect(getTruncationStopReason(undefined)).toBeNull();
    expect(getTruncationStopReason(null)).toBeNull();
    expect(getTruncationStopReason({})).toBeNull();
  });

  it('returns null for a normal stop', () => {
    expect(getTruncationStopReason({ response_metadata: { finish_reason: 'stop' } })).toBeNull();
    expect(getTruncationStopReason({ response_metadata: { stop_reason: 'end_turn' } })).toBeNull();
  });

  it('detects OpenAI chat-completions finish_reason', () => {
    expect(
      getTruncationStopReason({ response_metadata: { finish_reason: 'length' } }),
    ).toBe('length');
  });

  it('detects Anthropic non-streaming stop_reason', () => {
    expect(
      getTruncationStopReason({ response_metadata: { stop_reason: 'max_tokens' } }),
    ).toBe('max_tokens');
  });

  it('detects Anthropic streaming message_delta via additional_kwargs', () => {
    expect(
      getTruncationStopReason({ additional_kwargs: { stop_reason: 'max_tokens' } }),
    ).toBe('max_tokens');
  });

  it('detects Bedrock Converse non-streaming stopReason', () => {
    expect(getTruncationStopReason({ response_metadata: { stopReason: 'max_tokens' } })).toBe(
      'max_tokens',
    );
  });

  it('detects Bedrock Converse streaming messageStop.stopReason', () => {
    expect(
      getTruncationStopReason({
        response_metadata: { messageStop: { stopReason: 'max_tokens' } },
      }),
    ).toBe('max_tokens');
  });

  it('detects Google finishReason', () => {
    expect(getTruncationStopReason({ response_metadata: { finishReason: 'MAX_TOKENS' } })).toBe(
      'max_tokens',
    );
  });

  it('detects OpenAI Responses API incomplete_details.reason', () => {
    expect(
      getTruncationStopReason({
        response_metadata: { incomplete_details: { reason: 'max_output_tokens' } },
      }),
    ).toBe('max_tokens');
  });

  it('normalizes "length" and "max_tokens" variants case-insensitively', () => {
    expect(getTruncationStopReason({ response_metadata: { finish_reason: 'LENGTH' } })).toBe(
      'length',
    );
    expect(getTruncationStopReason({ response_metadata: { finish_reason: 'MaxTokens' } })).toBe(
      'max_tokens',
    );
  });
});

describe('hasOpenToolCall', () => {
  it('returns false when there are no tool calls', () => {
    expect(hasOpenToolCall(undefined)).toBe(false);
    expect(hasOpenToolCall({})).toBe(false);
  });

  it('returns true when tool_calls is non-empty', () => {
    expect(hasOpenToolCall({ tool_calls: [{ id: 'a' }] })).toBe(true);
  });

  it('returns true when tool_call_chunks is non-empty', () => {
    expect(hasOpenToolCall({ tool_call_chunks: [{ id: 'a' }] })).toBe(true);
  });
});
