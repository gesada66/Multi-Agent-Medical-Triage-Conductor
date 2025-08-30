import { LlmProvider } from '../../adapters/llm/types';
import { VectorStore, EmbeddingService } from '../../adapters/vector/types';
import { ConfigManager } from '../../config';
import { logger } from '../../logger';

// Standard agents
import { RiskStratifierAgent } from './RiskStratifierAgent';
// Memory-augmented agents
import { MemoryAugmentedRiskAgent } from './MemoryAugmentedRiskAgent';

export class AgentFactory {
  private static vectorStore: VectorStore | null = null;
  private static embeddingService: EmbeddingService | null = null;

  /**
   * Creates appropriate risk agent based on environment configuration
   * - Local development: Standard risk agent
   * - Azure deployment with Memory RAG: Memory-augmented risk agent
   */
  static async createRiskAgent(provider: LlmProvider): Promise<RiskStratifierAgent | MemoryAugmentedRiskAgent> {
    const config = ConfigManager.getConfig();

    if (config.enableMemoryRag && config.appMode === 'CLOUD') {
      logger.info('Creating Memory Augmented Risk Agent for Azure deployment');
      
      // Initialize vector store and embedding service for Azure
      const vectorStore = await this.getOrCreateVectorStore();
      const embeddingService = this.getOrCreateEmbeddingService(provider);

      if (vectorStore && embeddingService) {
        return new MemoryAugmentedRiskAgent(provider, vectorStore, embeddingService);
      } else {
        logger.warn('Memory RAG enabled but vector store/embedding service unavailable, falling back to standard agent');
        return new RiskStratifierAgent(provider);
      }
    }

    logger.info('Creating standard Risk Stratifier Agent for local development');
    return new RiskStratifierAgent(provider);
  }

  private static async getOrCreateVectorStore(): Promise<VectorStore | null> {
    if (this.vectorStore) {
      return this.vectorStore;
    }

    const config = ConfigManager.getConfig();

    // Only create vector store if Memory RAG is enabled and we're in cloud mode
    if (!config.enableMemoryRag || config.appMode !== 'CLOUD') {
      logger.info('Memory RAG disabled or not in cloud mode, skipping vector store initialization');
      return null;
    }

    if (!config.azureSearchServiceName || !config.azureSearchAdminKey) {
      logger.error('Azure Search credentials missing for Memory RAG');
      return null;
    }

    try {
      // Dynamic import to avoid loading Azure SDK in local development
      const { AzureAISearchStore } = await import('../../adapters/vector/AzureAISearchStore');
      
      this.vectorStore = new AzureAISearchStore({
        serviceName: config.azureSearchServiceName,
        adminKey: config.azureSearchAdminKey,
        apiVersion: config.azureSearchApiVersion,
        indexName: config.azureSearchIndexName
      });

      logger.info('Initialized Azure AI Search vector store', {
        serviceName: config.azureSearchServiceName,
        indexName: config.azureSearchIndexName
      });

      return this.vectorStore;
    } catch (error) {
      logger.error('Failed to initialize vector store', { error: error.message });
      return null;
    }
  }

  private static getOrCreateEmbeddingService(provider: LlmProvider): EmbeddingService | null {
    if (this.embeddingService) {
      return this.embeddingService;
    }

    try {
      // Use the same LLM provider for embeddings if it supports it
      this.embeddingService = new LlmEmbeddingAdapter(provider);
      
      logger.info('Initialized embedding service using LLM provider');
      return this.embeddingService;
    } catch (error) {
      logger.error('Failed to initialize embedding service', { error: error.message });
      return null;
    }
  }

  /**
   * Health check for Memory RAG components
   */
  static async healthCheckMemoryRag(): Promise<{
    vectorStore: boolean;
    embeddingService: boolean;
    memoryRagEnabled: boolean;
  }> {
    const config = ConfigManager.getConfig();
    const memoryRagEnabled = config.enableMemoryRag && config.appMode === 'CLOUD';

    if (!memoryRagEnabled) {
      return {
        vectorStore: false,
        embeddingService: false,
        memoryRagEnabled: false
      };
    }

    const vectorStore = await this.getOrCreateVectorStore();
    const embeddingService = this.embeddingService;

    return {
      vectorStore: vectorStore ? await vectorStore.healthCheck() : false,
      embeddingService: !!embeddingService,
      memoryRagEnabled: true
    };
  }

  /**
   * Get feature status for API responses
   */
  static getFeatureStatus(): {
    memoryRag: boolean;
    vectorDatabase: string;
    embeddingModel: string;
  } {
    const config = ConfigManager.getConfig();
    
    return {
      memoryRag: config.enableMemoryRag && config.appMode === 'CLOUD',
      vectorDatabase: config.enableMemoryRag ? 'Azure AI Search' : 'Disabled',
      embeddingModel: config.enableMemoryRag ? 'Azure OpenAI' : 'N/A'
    };
  }
}

/**
 * Adapter to use LLM provider for embeddings
 */
class LlmEmbeddingAdapter implements EmbeddingService {
  private provider: LlmProvider;

  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async embedText(text: string): Promise<number[]> {
    try {
      // Use provider's embed method
      const embeddings = await this.provider.embed([text]);
      return embeddings[0];
    } catch (error) {
      logger.error('Embedding generation failed', { error: error.message });
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await this.provider.embed(texts);
    } catch (error) {
      logger.error('Batch embedding generation failed', { error: error.message });
      throw error;
    }
  }
}