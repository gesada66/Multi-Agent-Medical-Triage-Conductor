import { LlmProvider } from './types';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { ConfigManager } from '../../config';
import { logger } from '../../logger';

export class ProviderFactory {
  private static instance: LlmProvider | null = null;

  static createProvider(): LlmProvider {
    if (this.instance) {
      return this.instance;
    }

    const config = ConfigManager.getConfig();
    
    switch (config.modelProvider) {
      case 'openai':
        if (!config.openaiApiKey && !config.mockLlmResponses) {
          throw new Error('OpenAI API key is required when using OpenAI provider');
        }
        this.instance = new OpenAIProvider(
          config.openaiApiKey || 'sk-mock-key',
          config.llmModel,
          config.embeddingsModel,
          config.openaiOrgId
        );
        logger.info('Initialized OpenAI provider', { 
          model: config.llmModel,
          embeddings: config.embeddingsModel 
        });
        break;

      case 'anthropic':
        if (!config.anthropicApiKey && !config.mockLlmResponses) {
          throw new Error('Anthropic API key is required when using Anthropic provider');
        }
        const batchOptions = config.anthropicEnableBatching ? {
          enableBatching: true,
          batchSize: config.anthropicBatchSize,
          maxWaitTimeMs: config.anthropicBatchWaitTime,
          batchingThreshold: config.anthropicBatchThreshold,
        } : undefined;

        this.instance = new AnthropicProvider(
          config.anthropicApiKey || 'sk-ant-mock-key',
          config.anthropicModel,
          config.anthropicEnableCaching,
          config.anthropicSonnetModel,
          config.anthropicUseSmartRouting,
          batchOptions
        );
        logger.info('Initialized Anthropic provider', { 
          defaultModel: config.anthropicModel,
          sonnetModel: config.anthropicSonnetModel,
          cachingEnabled: config.anthropicEnableCaching,
          smartRoutingEnabled: config.anthropicUseSmartRouting,
          batchingEnabled: config.anthropicEnableBatching,
          batchSize: config.anthropicBatchSize,
          batchThreshold: config.anthropicBatchThreshold
        });
        break;

      case 'azure':
        if (!config.azureOpenaiEndpoint || !config.azureOpenaiApiKey) {
          throw new Error('Azure OpenAI endpoint and API key are required when using Azure provider');
        }
        // TODO: Implement AzureProvider
        throw new Error('Azure provider not yet implemented');

      default:
        throw new Error(`Unsupported model provider: ${config.modelProvider}`);
    }

    return this.instance;
  }

  static resetProvider(): void {
    this.instance = null;
  }

  static async estimateUsageCosts(): Promise<{
    provider: string;
    estimatedMonthlyCost: number;
    potentialCacheSavings: number;
  }> {
    const config = ConfigManager.getConfig();
    const costOptimization = ConfigManager.getCostOptimizationSettings();

    // Updated cost estimates (in USD per 1M tokens) - December 2024 pricing
    const costEstimates = {
      openai: {
        input: 0.50,  // GPT-4o-mini input
        output: 1.50, // GPT-4o-mini output
        embeddings: 0.02 // text-embedding-3-small
      },
      anthropic: {
        // Haiku pricing (primary model)
        haikuInput: 0.25,   // Claude 3.5 Haiku input
        haikuOutput: 1.25,  // Claude 3.5 Haiku output
        haikuCached: 0.025, // 90% discount on cached tokens
        haikuBatch: 0.125,  // 50% discount for batch processing
        haikuBatchCached: 0.0125, // Combined: 90% cache + 50% batch discount
        
        // Sonnet pricing (for complex tasks)
        sonnetInput: 3.00,   // Claude 3.5 Sonnet input  
        sonnetOutput: 15.00, // Claude 3.5 Sonnet output
        sonnetCached: 0.30,  // 90% discount on cached tokens
        sonnetBatch: 1.50,   // 50% discount for batch processing
        sonnetBatchCached: 0.15 // Combined: 90% cache + 50% batch discount
      },
      azure: {
        input: 0.50,  // Similar to OpenAI
        output: 1.50,
        embeddings: 0.02
      }
    };

    const provider = config.modelProvider;
    const costs = costEstimates[provider];

    if (!costs) {
      return {
        provider,
        estimatedMonthlyCost: 0,
        potentialCacheSavings: 0
      };
    }

    // Estimate based on typical usage patterns
    const dailyRequests = 100; // Estimated daily triage requests
    const avgInputTokens = 800; // System prompt + user input
    const avgOutputTokens = 300; // Typical response length
    const monthlyRequests = dailyRequests * 30;

    let estimatedMonthlyCost = 0;
    let potentialCacheSavings = 0;

    if (provider === 'anthropic' && costOptimization.anthropicCachingEnabled) {
      // With smart routing + caching + batching enabled
      const cacheHitRate = costOptimization.cacheHitRateTarget;
      const systemPromptTokens = 600; // Estimated system prompt size
      
      // Estimate model usage split (80% Haiku, 20% Sonnet for complex tasks)
      const haikuUsageRate = 0.8;
      const sonnetUsageRate = 0.2;
      
      // Estimate batch usage (60% of routine requests can be batched)
      const batchUsageRate = 0.6;
      
      const haikuDirectRequests = monthlyRequests * haikuUsageRate * (1 - batchUsageRate);
      const haikuBatchRequests = monthlyRequests * haikuUsageRate * batchUsageRate;
      const sonnetDirectRequests = monthlyRequests * sonnetUsageRate * (1 - batchUsageRate);
      const sonnetBatchRequests = monthlyRequests * sonnetUsageRate * batchUsageRate;
      
      // Haiku direct costs (with caching)
      const haikuDirectCachedInput = (haikuDirectRequests * systemPromptTokens * cacheHitRate * costs.haikuCached) / 1000000;
      const haikuDirectUncachedInput = (haikuDirectRequests * (avgInputTokens - systemPromptTokens) * costs.haikuInput) / 1000000;
      const haikuDirectUncachedSystem = (haikuDirectRequests * systemPromptTokens * (1 - cacheHitRate) * costs.haikuInput) / 1000000;
      const haikuDirectOutput = (haikuDirectRequests * avgOutputTokens * costs.haikuOutput) / 1000000;
      
      // Haiku batch costs (with caching + batch discount)
      const haikuBatchCachedInput = (haikuBatchRequests * systemPromptTokens * cacheHitRate * costs.haikuBatchCached) / 1000000;
      const haikuBatchUncachedInput = (haikuBatchRequests * (avgInputTokens - systemPromptTokens) * costs.haikuBatch) / 1000000;
      const haikuBatchUncachedSystem = (haikuBatchRequests * systemPromptTokens * (1 - cacheHitRate) * costs.haikuBatch) / 1000000;
      const haikuBatchOutput = (haikuBatchRequests * avgOutputTokens * costs.haikuOutput * 0.5) / 1000000; // 50% batch discount on output too
      
      // Sonnet direct costs (with caching)
      const sonnetDirectCachedInput = (sonnetDirectRequests * systemPromptTokens * cacheHitRate * costs.sonnetCached) / 1000000;
      const sonnetDirectUncachedInput = (sonnetDirectRequests * (avgInputTokens - systemPromptTokens) * costs.sonnetInput) / 1000000;
      const sonnetDirectUncachedSystem = (sonnetDirectRequests * systemPromptTokens * (1 - cacheHitRate) * costs.sonnetInput) / 1000000;
      const sonnetDirectOutput = (sonnetDirectRequests * avgOutputTokens * costs.sonnetOutput) / 1000000;
      
      // Sonnet batch costs (with caching + batch discount)  
      const sonnetBatchCachedInput = (sonnetBatchRequests * systemPromptTokens * cacheHitRate * costs.sonnetBatchCached) / 1000000;
      const sonnetBatchUncachedInput = (sonnetBatchRequests * (avgInputTokens - systemPromptTokens) * costs.sonnetBatch) / 1000000;
      const sonnetBatchUncachedSystem = (sonnetBatchRequests * systemPromptTokens * (1 - cacheHitRate) * costs.sonnetBatch) / 1000000;
      const sonnetBatchOutput = (sonnetBatchRequests * avgOutputTokens * costs.sonnetOutput * 0.5) / 1000000; // 50% batch discount on output too

      estimatedMonthlyCost = 
        haikuDirectCachedInput + haikuDirectUncachedInput + haikuDirectUncachedSystem + haikuDirectOutput +
        haikuBatchCachedInput + haikuBatchUncachedInput + haikuBatchUncachedSystem + haikuBatchOutput +
        sonnetDirectCachedInput + sonnetDirectUncachedInput + sonnetDirectUncachedSystem + sonnetDirectOutput +
        sonnetBatchCachedInput + sonnetBatchUncachedInput + sonnetBatchUncachedSystem + sonnetBatchOutput;
      
      // Calculate savings compared to using only Sonnet without any optimizations
      const allSonnetNoOptimizationsCost = 
        (monthlyRequests * avgInputTokens * costs.sonnetInput) / 1000000 + 
        (monthlyRequests * avgOutputTokens * costs.sonnetOutput) / 1000000;
      potentialCacheSavings = allSonnetNoOptimizationsCost - estimatedMonthlyCost;
    } else {
      // Without caching
      const inputCost = (monthlyRequests * avgInputTokens * costs.input) / 1000000;
      const outputCost = (monthlyRequests * avgOutputTokens * costs.output) / 1000000;
      estimatedMonthlyCost = inputCost + outputCost;

      if (provider === 'anthropic') {
        // Potential savings if caching + smart routing was enabled
        const systemPromptTokens = 600;
        const cacheHitRate = 0.8;
        const haikuUsageRate = 0.8;
        
        // Current cost (assuming Sonnet for all requests)
        const currentSystemCost = (monthlyRequests * systemPromptTokens * costs.sonnetInput) / 1000000;
        const currentOutputCost = (monthlyRequests * avgOutputTokens * costs.sonnetOutput) / 1000000;
        const currentTotalCost = currentSystemCost + currentOutputCost;
        
        // Optimized cost with Haiku + caching
        const optimizedHaikuCost = (monthlyRequests * haikuUsageRate * avgInputTokens * costs.haikuInput) / 1000000;
        const optimizedSonnetCost = (monthlyRequests * (1 - haikuUsageRate) * avgInputTokens * costs.sonnetInput) / 1000000;
        const optimizedOutputCost = 
          (monthlyRequests * haikuUsageRate * avgOutputTokens * costs.haikuOutput) / 1000000 +
          (monthlyRequests * (1 - haikuUsageRate) * avgOutputTokens * costs.sonnetOutput) / 1000000;
        const optimizedTotalCost = optimizedHaikuCost + optimizedSonnetCost + optimizedOutputCost;
        
        potentialCacheSavings = currentTotalCost - optimizedTotalCost;
      }
    }

    return {
      provider,
      estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
      potentialCacheSavings: Math.round(potentialCacheSavings * 100) / 100
    };
  }
}