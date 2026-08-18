import { isTruncatedFinishReason } from 'librechat-data-provider';

/** Minimal shape of an aggregated AIMessage/chunk needed to read a provider's
 *  stop/finish reason across chat-completions, Anthropic, Bedrock Converse,
 *  Google, and the OpenAI Responses API. */
export interface TruncationCheckMessage {
  tool_calls?: unknown[];
  tool_call_chunks?: unknown[];
  additional_kwargs?: {
    stop_reason?: string | null;
  };
  response_metadata?: {
    stopReason?: string | null;
    stop_reason?: string | null;
    finish_reason?: string | null;
    finishReason?: string | null;
    messageStop?: { stopReason?: string | null };
    incomplete_details?: { reason?: string | null };
  };
}

const MAX_TOKEN_VALUES = new Set(['max_tokens', 'max_token', 'maxtokens', 'max_output_tokens']);
const LENGTH_VALUES = new Set(['length']);

function normalizeStopValue(value: string | null | undefined): 'length' | 'max_tokens' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (MAX_TOKEN_VALUES.has(normalized)) {
    return 'max_tokens';
  }
  if (LENGTH_VALUES.has(normalized)) {
    return 'length';
  }
  return null;
}

/**
 * Reads the truncation stop reason off an aggregated model message, covering
 * every provider shape LibreChat streams:
 * - `response_metadata.stopReason` (Bedrock Converse, non-streaming)
 * - `response_metadata.messageStop.stopReason` (Bedrock Converse streaming)
 * - `response_metadata.stop_reason` (Anthropic, non-streaming)
 * - `additional_kwargs.stop_reason` (Anthropic streaming `message_delta`)
 * - `response_metadata.finish_reason` (OpenAI chat-completions / compatible)
 * - `response_metadata.incomplete_details.reason` (OpenAI Responses API)
 * - `response_metadata.finishReason` (Google)
 *
 * Returns the normalized reason when the model stopped because it hit the
 * output token ceiling, otherwise `null`. Mirrors (does not import — the
 * equivalent helper in `@librechat/agents` is an internal, unexported
 * implementation detail used only to guard truncated tool calls) the same
 * field-checking logic so LibreChat can surface a `finish_reason` on the
 * persisted/streamed message for plain-text truncation.
 */
export function getTruncationStopReason(
  message: TruncationCheckMessage | null | undefined,
): 'length' | 'max_tokens' | null {
  const meta = message?.response_metadata;
  const additionalKwargs = message?.additional_kwargs;
  if (meta == null && additionalKwargs == null) {
    return null;
  }
  const candidates = [
    meta?.stopReason,
    meta?.stop_reason,
    meta?.finish_reason,
    meta?.finishReason,
    meta?.messageStop?.stopReason,
    meta?.incomplete_details?.reason,
    additionalKwargs?.stop_reason,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeStopValue(candidate);
    if (normalized != null) {
      return normalized;
    }
  }
  return null;
}

/** True when the message still carries an in-progress tool call. A truncated
 *  tool call's arguments are necessarily incomplete — the SDK's own
 *  `OutputTruncationError` already fails that case fast as a run error, so
 *  callers here should skip plain-text truncation handling for it. */
export function hasOpenToolCall(message: TruncationCheckMessage | null | undefined): boolean {
  return (message?.tool_calls?.length ?? 0) > 0 || (message?.tool_call_chunks?.length ?? 0) > 0;
}

export { isTruncatedFinishReason };
