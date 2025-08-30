import { z } from 'zod';

const configSchema = z.object({
  // Application
  appMode: z.enum(['LOCAL', 'CLOUD']).default('LOCAL'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Model Provider
  modelProvider: z.enum(['openai', 'anthropic', 'azure']).default('anthropic'),
  
  // OpenAI
  openaiApiKey: z.string().optional(),
  openaiOrgId: z.string().optional(),
  llmModel: z.string().default('gpt-4o-mini'),
  embeddingsModel: z.string().default('text-embedding-3-small'),
  
  // Anthropic (with caching + batching)
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().default('claude-3-5-haiku-20241022'),
  anthropicSonnetModel: z.string().default('claude-3-5-sonnet-20241022'),
  anthropicEnableCaching: z.boolean().default(true),
  anthropicCacheTtl: z.number().default(3600),
  anthropicUseSmartRouting: z.boolean().default(true),
  anthropicEnableBatching: z.boolean().default(true),
  anthropicBatchSize: z.number().default(100),
  anthropicBatchWaitTime: z.number().default(5000),
  anthropicBatchThreshold: z.number().default(5),
  
  // Azure
  azureOpenaiEndpoint: z.string().optional(),
  azureOpenaiApiKey: z.string().optional(),
  azureOpenaiDeploymentName: z.string().optional(),
  azureOpenaiApiVersion: z.string().default('2024-02-01'),
  
  // Data Storage
  vectorDbPath: z.string().default('./.data/triage.sqlite'),
  fhirRepoType: z.enum(['local', 'hapi', 'azure']).default('local'),
  hapiFhirBaseUrl: z.string().optional(),
  
  // Logging & Monitoring
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableTelemetry: z.boolean().default(true),
  otelServiceName: z.string().default('triage-conductor'),
  otelExporterOtlpEndpoint: z.string().optional(),
  
  // Security
  sessionSecret: z.string().optional(),
  enableRateLimiting: z.boolean().default(true),
  maxRequestsPerMinute: z.number().default(60),
  
  // Performance & Caching
  enableResponseCaching: z.boolean().default(true),
  cacheTtlSeconds: z.number().default(300),
  maxConcurrentAgents: z.number().default(5),
  
  // Content Safety
  enableContentFiltering: z.boolean().default(true),
  maxInputLength: z.number().default(2000),
  minConfidenceThreshold: z.number().default(0.6),
  
  // Cost Optimization
  enablePromptCaching: z.boolean().default(true),
  cacheHitRateTarget: z.number().default(0.8),
  logCacheMetrics: z.boolean().default(true),
  estimateTokenCosts: z.boolean().default(true),
  
  // Feature Flags
  enableVoiceInput: z.boolean().default(false),
  enableMultiLanguage: z.boolean().default(false),
  enableAdvancedReasoning: z.boolean().default(false),
  enableMemoryRag: z.boolean().default(false),

  // Azure AI Search (Memory RAG)
  azureSearchServiceName: z.string().optional(),
  azureSearchAdminKey: z.string().optional(),
  azureSearchApiVersion: z.string().default('2023-11-01'),
  azureSearchIndexName: z.string().default('medical-triage-cases'),
  
  // Development
  enableApiDocs: z.boolean().default(false),
  enableDebugRoutes: z.boolean().default(false),
  mockLlmResponses: z.boolean().default(false),
});

type Config = z.infer<typeof configSchema>;

class ConfigManager {
  private static instance: Config;
  
  static getConfig(): Config {
    if (!this.instance) {
      this.instance = this.loadConfig();
    }
    return this.instance;
  }

  static clearCache(): void {
    this.instance = undefined as any;
  }
  
  private static loadConfig(): Config {
    const rawConfig = {
      // Application
      appMode: process.env.APP_MODE,
      nodeEnv: process.env.NODE_ENV,
      
      // Model Provider
      modelProvider: process.env.MODEL_PROVIDER,
      
      // OpenAI
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiOrgId: process.env.OPENAI_ORG_ID,
      llmModel: process.env.LLM_MODEL,
      embeddingsModel: process.env.EMBEDDINGS_MODEL,
      
      // Anthropic
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      anthropicModel: process.env.ANTHROPIC_MODEL,
      anthropicSonnetModel: process.env.ANTHROPIC_SONNET_MODEL,
      anthropicEnableCaching: process.env.ANTHROPIC_ENABLE_CACHING === 'true',
      anthropicCacheTtl: parseInt(process.env.ANTHROPIC_CACHE_TTL || '3600'),
      anthropicUseSmartRouting: process.env.ANTHROPIC_USE_SMART_ROUTING === 'true',
      anthropicEnableBatching: process.env.ANTHROPIC_ENABLE_BATCHING === 'true',
      anthropicBatchSize: parseInt(process.env.ANTHROPIC_BATCH_SIZE || '100'),
      anthropicBatchWaitTime: parseInt(process.env.ANTHROPIC_BATCH_WAIT_TIME || '5000'),
      anthropicBatchThreshold: parseInt(process.env.ANTHROPIC_BATCH_THRESHOLD || '5'),
      
      // Azure
      azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenaiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      azureOpenaiApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      
      // Data Storage
      vectorDbPath: process.env.VECTOR_DB_PATH,
      fhirRepoType: process.env.FHIR_REPO_TYPE,
      hapiFhirBaseUrl: process.env.HAPI_FHIR_BASE_URL,
      
      // Logging & Monitoring
      logLevel: process.env.LOG_LEVEL,
      enableTelemetry: process.env.ENABLE_TELEMETRY !== 'false',
      otelServiceName: process.env.OTEL_SERVICE_NAME,
      otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      
      // Security
      sessionSecret: process.env.SESSION_SECRET,
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60'),
      
      // Performance & Caching
      enableResponseCaching: process.env.ENABLE_RESPONSE_CACHING !== 'false',
      cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300'),
      maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS || '5'),
      
      // Content Safety
      enableContentFiltering: process.env.ENABLE_CONTENT_FILTERING !== 'false',
      maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '2000'),
      minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.6'),
      
      // Cost Optimization
      enablePromptCaching: process.env.ENABLE_PROMPT_CACHING !== 'false',
      cacheHitRateTarget: parseFloat(process.env.CACHE_HIT_RATE_TARGET || '0.8'),
      logCacheMetrics: process.env.LOG_CACHE_METRICS !== 'false',
      estimateTokenCosts: process.env.ESTIMATE_TOKEN_COSTS !== 'false',
      
      // Feature Flags
      enableVoiceInput: process.env.ENABLE_VOICE_INPUT === 'true',
      enableMultiLanguage: process.env.ENABLE_MULTI_LANGUAGE === 'true',
      enableAdvancedReasoning: process.env.ENABLE_ADVANCED_REASONING === 'true',
      enableMemoryRag: process.env.ENABLE_MEMORY_RAG === 'true',

      // Azure AI Search
      azureSearchServiceName: process.env.AZURE_SEARCH_SERVICE_NAME,
      azureSearchAdminKey: process.env.AZURE_SEARCH_ADMIN_KEY,
      azureSearchApiVersion: process.env.AZURE_SEARCH_API_VERSION,
      azureSearchIndexName: process.env.AZURE_SEARCH_INDEX_NAME,
      
      // Development
      enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
      enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true',
      mockLlmResponses: process.env.MOCK_LLM_RESPONSES === 'true',
    };
    
    const result = configSchema.safeParse(rawConfig);
    
    if (!result.success) {
      console.error('Configuration validation failed:', result.error.issues);
      throw new Error('Invalid configuration. Check your environment variables.');
    }
    
    return result.data;
  }
  
  static validateRequiredKeys(): void {
    const config = this.getConfig();
    const errors: string[] = [];
    
    // Skip validation if mock mode is enabled
    if (config.mockLlmResponses) {
      return;
    }
    
    // Validate provider-specific required keys
    switch (config.modelProvider) {
      case 'openai':
        if (!config.openaiApiKey) {
          errors.push('OPENAI_API_KEY is required when using OpenAI provider');
        }
        break;
        
      case 'anthropic':
        if (!config.anthropicApiKey) {
          errors.push('ANTHROPIC_API_KEY is required when using Anthropic provider');
        }
        break;
        
      case 'azure':
        if (!config.azureOpenaiEndpoint || !config.azureOpenaiApiKey) {
          errors.push('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required when using Azure provider');
        }
        break;
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }

  static getCostOptimizationSettings(): {
    enablePromptCaching: boolean;
    cacheHitRateTarget: number;
    logCacheMetrics: boolean;
    estimateTokenCosts: boolean;
    anthropicCachingEnabled: boolean;
  } {
    const config = this.getConfig();
    
    return {
      enablePromptCaching: config.enablePromptCaching,
      cacheHitRateTarget: config.cacheHitRateTarget,
      logCacheMetrics: config.logCacheMetrics,
      estimateTokenCosts: config.estimateTokenCosts,
      anthropicCachingEnabled: config.modelProvider === 'anthropic' && config.anthropicEnableCaching,
    };
  }
}

export { ConfigManager, type Config };