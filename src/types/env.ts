/**
 * Cloudflare Workers Environment Bindings
 * Auto-generated types for wrangler.toml configuration
 */

export interface Env {
  // D1 Database
  DB: D1Database;

  // Queues
  AUTOMATION_QUEUE: Queue;
  SMS_QUEUE: Queue;
  AUTOMATION_DLQ: Queue;
  SMS_DLQ: Queue;

  // Workers AI
  AI: Ai;

  // KV Cache
  CACHE: KVNamespace;

  // Secrets (set via wrangler secret put)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  WIX_WEBHOOK_SECRET: string;
  MANYCHAT_WEBHOOK_SECRET: string;
  CLICKSEND_API_KEY: string;
  CLICKSEND_USERNAME: string;
  SMS_WEBHOOK_SECRET: string;

  // Environment Variables (from wrangler.toml [vars])
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'production';
  FRONTEND_URL: string;
  SMS_PROVIDER: 'clicksend' | 'messagemedia';
  SMS_FROM_NUMBER: string;
  WIX_SITE_ID: string;
  WIX_BOOKING_CALENDAR_ID: string;
  MANYCHAT_PAGE_ID: string;
  GOOGLE_OAUTH_REDIRECT_URI: string;
  AI_MODEL_WARMNESS: string;
  AI_MODEL_INTENT: string;
  AI_MAX_TOKENS: number;
  WARMNESS_RECALC_INTERVAL_HOURS: number;
  SPEED_TO_LEAD_TARGET_MINUTES: number;
}

/**
 * Cloudflare D1 Database interface
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Cloudflare Queue interface
 */
export interface Queue<Body = unknown> {
  send(message: Body, options?: QueueSendOptions): Promise<void>;
  sendBatch(messages: MessageSendRequest<Body>[]): Promise<void>;
}

export interface QueueSendOptions {
  contentType?: 'text' | 'bytes' | 'json' | 'v8';
  delaySeconds?: number;
}

export interface MessageSendRequest<Body = unknown> {
  body: Body;
  contentType?: 'text' | 'bytes' | 'json' | 'v8';
  delaySeconds?: number;
}

export interface Message<Body = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: Body;
  retry(): void;
  ack(): void;
}

export interface MessageBatch<Body = unknown> {
  readonly queue: string;
  readonly messages: Message<Body>[];
  retryAll(): void;
  ackAll(): void;
}

/**
 * Cloudflare Workers AI interface
 */
export interface Ai {
  run(model: string, inputs: AiTextGenerationInput): Promise<AiTextGenerationOutput>;
  run(model: string, inputs: AiTextClassificationInput): Promise<AiTextClassificationOutput>;
  run(model: string, inputs: AiEmbeddingInput): Promise<AiEmbeddingOutput>;
}

export interface AiTextGenerationInput {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  seed?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface AiTextGenerationOutput {
  response: string;
  model?: string;
  tokens_used?: number;
}

export interface AiTextClassificationInput {
  text: string;
}

export interface AiTextClassificationOutput {
  label: string;
  score: number;
}

export interface AiEmbeddingInput {
  text: string | string[];
}

export interface AiEmbeddingOutput {
  shape: number[];
  data: number[][];
}

/**
 * Cloudflare KV Namespace interface
 */
export interface KVNamespace {
  get(key: string, options?: { type: 'text' }): Promise<string | null>;
  get(key: string, options: { type: 'json' }): Promise<any | null>;
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: { name: string; expiration?: number; metadata?: any }[];
  list_complete: boolean;
  cursor?: string;
}
