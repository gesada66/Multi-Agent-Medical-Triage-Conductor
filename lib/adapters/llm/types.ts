export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableCaching?: boolean;
}

export interface LlmProvider {
  embed(texts: string[]): Promise<number[][]>;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export interface CacheStats {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalInputTokens: number;
  outputTokens: number;
  cacheSavings: number;
}

export interface PromptTemplate {
  id: string;
  agentType: string;
  content: string;
  cacheable: boolean;
  version: string;
}

export interface BatchRequest {
  customId: string;
  method: 'POST';
  url: '/v1/messages';
  body: {
    model: string;
    max_tokens: number;
    messages: ChatMessage[];
    system?: string;
    temperature?: number;
  };
}

export interface BatchResponse {
  customId: string;
  result?: {
    type: 'message';
    id: string;
    model: string;
    role: 'assistant';
    content: Array<{ type: 'text'; text: string }>;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface BatchJob {
  id: string;
  type: 'message_batch';
  processing_status: 'in_progress' | 'completed' | 'failed' | 'expired';
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  ended_at?: string;
  created_at: string;
  expires_at: string;
  archive_url?: string;
}

export interface BatchProcessingOptions {
  batchSize?: number;
  maxWaitTimeMs?: number;
  enableBatching?: boolean;
  batchingThreshold?: number;
}