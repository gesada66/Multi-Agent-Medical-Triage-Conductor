import { Anthropic } from '@anthropic-ai/sdk';
import { BatchRequest, BatchResponse, BatchJob, ChatMessage, BatchProcessingOptions } from './types';
import { logger } from '../../logger';

export class BatchProcessor {
  private client: Anthropic;
  private pendingRequests: Map<string, BatchRequest> = new Map();
  private batchCallbacks: Map<string, (result: BatchResponse) => void> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private options: Required<BatchProcessingOptions>;

  constructor(client: Anthropic, options: BatchProcessingOptions = {}) {
    this.client = client;
    this.options = {
      batchSize: options.batchSize || 100,
      maxWaitTimeMs: options.maxWaitTimeMs || 5000, // 5 seconds
      enableBatching: options.enableBatching ?? true,
      batchingThreshold: options.batchingThreshold || 5, // Minimum requests to trigger batch
    };
  }

  async processRequest(
    customId: string,
    messages: ChatMessage[],
    model: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.options.enableBatching) {
      // Fallback to direct API call if batching disabled
      return this.processSingleRequest(messages, model, systemPrompt, options);
    }

    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest = {
        customId,
        method: 'POST',
        url: '/v1/messages',
        body: {
          model,
          max_tokens: options?.maxTokens || 4000,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          system: systemPrompt,
          temperature: options?.temperature || 0.1,
        },
      };

      this.pendingRequests.set(customId, batchRequest);
      this.batchCallbacks.set(customId, (result: BatchResponse) => {
        if (result.error) {
          reject(new Error(`Batch request failed: ${result.error.message}`));
        } else if (result.result) {
          resolve(result.result.content[0]?.text || '');
        } else {
          reject(new Error('No result in batch response'));
        }
      });

      this.scheduleBatchProcessing();
    });
  }

  private async processSingleRequest(
    messages: ChatMessage[],
    model: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.1,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  private scheduleBatchProcessing(): void {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Process immediately if we hit batch size threshold
    if (this.pendingRequests.size >= this.options.batchSize) {
      this.processBatch();
      return;
    }

    // Process after timeout if we have minimum requests
    if (this.pendingRequests.size >= this.options.batchingThreshold) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.options.maxWaitTimeMs);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.pendingRequests.size === 0) return;

    const requests = Array.from(this.pendingRequests.values());
    const requestIds = Array.from(this.pendingRequests.keys());
    
    // Clear pending requests
    this.pendingRequests.clear();
    
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      logger.info('Processing batch request', {
        batchSize: requests.length,
        requestIds: requestIds.slice(0, 5), // Log first 5 IDs
      });

      // Create batch using Anthropic SDK
      const batch = await this.client.messages.batches.create({
        requests,
      });

      logger.info('Batch created', {
        batchId: batch.id,
        status: batch.processing_status,
        requestCount: requests.length,
      });

      // Poll for completion
      const results = await this.pollBatchCompletion(batch.id);
      
      // Process results and trigger callbacks
      results.forEach(result => {
        const callback = this.batchCallbacks.get(result.customId);
        if (callback) {
          callback(result);
          this.batchCallbacks.delete(result.customId);
        }
      });

    } catch (error) {
      logger.error('Batch processing failed', { error: error.message });
      
      // Fallback: process requests individually
      await this.processBatchFallback(requestIds);
    }
  }

  private async pollBatchCompletion(batchId: string): Promise<BatchResponse[]> {
    const maxWaitTime = 60 * 60 * 1000; // 1 hour max wait
    const pollInterval = 10 * 1000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const batch = await this.client.messages.batches.retrieve(batchId);
        
        logger.info('Batch status check', {
          batchId,
          status: batch.processing_status,
          succeeded: batch.request_counts.succeeded,
          errored: batch.request_counts.errored,
        });

        if (batch.processing_status === 'completed') {
          // Download results
          if (batch.archive_url) {
            const response = await fetch(batch.archive_url);
            const resultsText = await response.text();
            
            return resultsText
              .trim()
              .split('\n')
              .map(line => JSON.parse(line) as BatchResponse);
          }
        }

        if (batch.processing_status === 'failed' || batch.processing_status === 'expired') {
          throw new Error(`Batch ${batch.processing_status}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        logger.error('Batch polling error', { batchId, error: error.message });
        throw error;
      }
    }

    throw new Error('Batch processing timeout');
  }

  private async processBatchFallback(requestIds: string[]): Promise<void> {
    logger.info('Processing batch fallback', { requestCount: requestIds.length });
    
    // Process each request individually as fallback
    for (const requestId of requestIds) {
      const callback = this.batchCallbacks.get(requestId);
      if (callback) {
        try {
          // Note: This is a simplified fallback - in practice, you'd need to reconstruct the original request
          callback({
            customId: requestId,
            error: {
              type: 'batch_failed',
              message: 'Batch processing failed, request not processed'
            }
          });
        } catch (error) {
          logger.error('Fallback processing error', { requestId, error: error.message });
        }
        this.batchCallbacks.delete(requestId);
      }
    }
  }

  async flush(): Promise<void> {
    // Force process any pending requests
    if (this.pendingRequests.size > 0) {
      await this.processBatch();
    }
  }

  getBatchStats(): {
    pendingRequests: number;
    pendingCallbacks: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      pendingCallbacks: this.batchCallbacks.size,
    };
  }

  updateOptions(newOptions: Partial<BatchProcessingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}