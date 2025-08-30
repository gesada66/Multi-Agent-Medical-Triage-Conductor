import { LlmProvider } from '@/lib/adapters/llm/types';
import { AnthropicProvider } from '@/lib/adapters/llm/AnthropicProvider';
import { CachedPromptTemplates } from './prompts/CachedPromptTemplates';
import { logger } from '@/lib/logger';

export interface BatchTriageRequest {
  id: string;
  patientId: string;
  input: string;
  mode: 'patient' | 'clinician';
  priority: 'immediate' | 'urgent' | 'routine' | 'batch'; // batch = lowest priority
}

export interface BatchTriageResult {
  requestId: string;
  success: boolean;
  evidence?: any;
  risk?: any;
  plan?: any;
  error?: string;
  processingTime: number;
}

export class BatchTriageOrchestrator {
  private provider: LlmProvider;
  private pendingRequests: Map<string, BatchTriageRequest> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchWaitTime = 10000; // 10 seconds for triage batching
  private readonly maxBatchSize = 50; // Smaller batches for medical use case

  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async processTriage(request: BatchTriageRequest): Promise<BatchTriageResult> {
    const startTime = Date.now();

    // Handle immediate/urgent cases with direct processing
    if (request.priority === 'immediate' || request.priority === 'urgent') {
      return await this.processDirectTriage(request, startTime);
    }

    // Handle routine/batch cases with batch processing
    if (this.provider instanceof AnthropicProvider && request.priority === 'batch') {
      return await this.processBatchTriage(request, startTime);
    }

    // Default to direct processing for routine cases
    return await this.processDirectTriage(request, startTime);
  }

  private async processDirectTriage(request: BatchTriageRequest, startTime: number): Promise<BatchTriageResult> {
    try {
      logger.info('Processing direct triage', { 
        requestId: request.id, 
        priority: request.priority 
      });

      const result = await this.executeSingleTriageWorkflow(request);

      return {
        requestId: request.id,
        success: true,
        ...result,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Direct triage failed', { 
        requestId: request.id, 
        error: error.message 
      });

      return {
        requestId: request.id,
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  private async processBatchTriage(request: BatchTriageRequest, startTime: number): Promise<BatchTriageResult> {
    return new Promise((resolve, reject) => {
      // Add to pending batch
      this.pendingRequests.set(request.id, request);

      // Set up completion callback
      const checkCompletion = () => {
        // This would be called when batch processing completes
        // For now, we'll use a timeout simulation
        setTimeout(() => {
          this.executeBatchedTriageWorkflow(request.id).then(result => {
            resolve({
              requestId: request.id,
              success: true,
              ...result,
              processingTime: Date.now() - startTime
            });
          }).catch(error => {
            resolve({
              requestId: request.id,
              success: false,
              error: error.message,
              processingTime: Date.now() - startTime
            });
          });
        }, this.batchWaitTime);
      };

      // Schedule batch processing
      this.scheduleBatchProcessing();
      checkCompletion();
    });
  }

  private scheduleBatchProcessing(): void {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Process immediately if we hit batch size
    if (this.pendingRequests.size >= this.maxBatchSize) {
      this.processBatchedRequests();
      return;
    }

    // Schedule batch processing
    this.batchTimer = setTimeout(() => {
      this.processBatchedRequests();
    }, this.batchWaitTime);
  }

  private async processBatchedRequests(): Promise<void> {
    if (this.pendingRequests.size === 0) return;

    const requests = Array.from(this.pendingRequests.values());
    logger.info('Processing batched triage requests', { 
      batchSize: requests.length,
      requestIds: requests.map(r => r.id).slice(0, 5) 
    });

    // Clear pending requests
    this.pendingRequests.clear();

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Process each request in the batch
    // In a real implementation, this would use the batch API more efficiently
    const batchPromises = requests.map(request => 
      this.executeBatchedTriageWorkflow(request.id)
    );

    try {
      await Promise.all(batchPromises);
      logger.info('Batch processing completed', { batchSize: requests.length });
    } catch (error) {
      logger.error('Batch processing failed', { error: error.message });
    }
  }

  private async executeSingleTriageWorkflow(request: BatchTriageRequest): Promise<{
    evidence: any;
    risk: any;
    plan: any;
  }> {
    // 1. Symptom Parser Agent
    const parserPrompt = CachedPromptTemplates.getCachedSystemPrompt('SymptomParserAgent');
    const evidence = await this.provider.chat([
      parserPrompt!,
      { role: 'user', content: `Parse symptoms: "${request.input}" for patient ${request.patientId}` }
    ], { temperature: 0.1 });

    // 2. Risk Stratifier Agent  
    const riskPrompt = CachedPromptTemplates.getCachedSystemPrompt('RiskStratifierAgent');
    const risk = await this.provider.chat([
      riskPrompt!,
      { role: 'user', content: `Assess risk for evidence: ${evidence}` }
    ], { temperature: 0.1 });

    // 3. Care Pathway Planner Agent
    const plannerPrompt = CachedPromptTemplates.getCachedSystemPrompt('CarePathwayPlannerAgent');
    const plan = await this.provider.chat([
      plannerPrompt!,
      { role: 'user', content: `Create care plan for evidence: ${evidence} and risk: ${risk}` }
    ], { temperature: 0.1 });

    // 4. Empathy Coach Agent (adapt for audience)
    const empathyPrompt = CachedPromptTemplates.getCachedSystemPrompt('EmpathyCoachAgent');
    const adaptedPlan = await this.provider.chat([
      empathyPrompt!,
      { role: 'user', content: `Adapt for ${request.mode} mode: ${plan}` }
    ], { temperature: 0.2 });

    return {
      evidence: JSON.parse(evidence || '{}'),
      risk: JSON.parse(risk || '{}'),
      plan: JSON.parse(adaptedPlan || '{}')
    };
  }

  private async executeBatchedTriageWorkflow(requestId: string): Promise<{
    evidence: any;
    risk: any;
    plan: any;
  }> {
    // For batched processing, we can optimize by:
    // 1. Using cached prompts (already implemented)
    // 2. Grouping similar requests together
    // 3. Processing multiple steps in parallel where possible

    // Simplified version - in production, this would be more sophisticated
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found in batch`);
    }

    return await this.executeSingleTriageWorkflow(request);
  }

  // Utility methods for batch management
  async flushBatch(): Promise<void> {
    if (this.provider instanceof AnthropicProvider) {
      await this.provider.flushBatch();
    }
    
    // Process any pending requests immediately
    if (this.pendingRequests.size > 0) {
      await this.processBatchedRequests();
    }
  }

  getBatchStats(): {
    pendingRequests: number;
    providerStats?: any;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      providerStats: this.provider instanceof AnthropicProvider 
        ? this.provider.getBatchStats() 
        : null
    };
  }

  // Method to determine optimal batching strategy based on load
  getRecommendedPriority(urgencyLevel: string, currentLoad: number): 'immediate' | 'urgent' | 'routine' | 'batch' {
    // Red flags always immediate
    if (urgencyLevel === 'immediate') return 'immediate';
    
    // High urgency cases
    if (urgencyLevel === 'urgent') return 'urgent';
    
    // For routine cases, use batching if system load is high
    if (urgencyLevel === 'routine') {
      return currentLoad > 0.7 ? 'batch' : 'routine';
    }

    return 'batch';
  }

  // Cost optimization: estimate savings from batching
  estimateBatchSavings(dailyRequests: number): {
    potentialSavings: number;
    batchableRequests: number;
    estimatedCostReduction: number;
  } {
    // Assume 60% of requests can be batched (non-urgent cases)
    const batchableRequests = Math.floor(dailyRequests * 0.6);
    
    // Batch API provides 50% savings
    const batchSavings = batchableRequests * 0.5;
    
    // Combined with other optimizations (Haiku + caching)
    const estimatedCostReduction = 0.97; // Up to 97% total savings

    return {
      potentialSavings: batchSavings,
      batchableRequests,
      estimatedCostReduction
    };
  }
}