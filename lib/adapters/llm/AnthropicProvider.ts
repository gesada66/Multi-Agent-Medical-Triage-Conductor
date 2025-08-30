import { Anthropic } from '@anthropic-ai/sdk';
import { LlmProvider, ChatMessage, ChatOptions, BatchProcessingOptions } from './types';
import { BatchProcessor } from './BatchProcessor';
import { logger } from '../../logger';

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;
  private defaultModel: string;
  private sonnetModel: string;
  private enablePromptCaching: boolean;
  private useSmartRouting: boolean;
  private batchProcessor: BatchProcessor | null = null;
  private requestCounter = 0;

  constructor(
    apiKey: string, 
    defaultModel = 'claude-3-5-haiku-20241022', 
    enablePromptCaching = true,
    sonnetModel = 'claude-3-5-sonnet-20241022',
    useSmartRouting = true,
    batchOptions?: BatchProcessingOptions
  ) {
    this.client = new Anthropic({
      apiKey,
    });
    this.defaultModel = defaultModel;
    this.sonnetModel = sonnetModel;
    this.enablePromptCaching = enablePromptCaching;
    this.useSmartRouting = useSmartRouting;

    // Initialize batch processor if options provided
    if (batchOptions?.enableBatching) {
      this.batchProcessor = new BatchProcessor(this.client, batchOptions);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Anthropic doesn't provide embedding models directly
    // This would typically use a different service or model
    throw new Error('Anthropic provider does not support embeddings. Use OpenAI or Azure provider for embeddings.');
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    try {
      // Check if mock mode is enabled
      if (process.env.MOCK_LLM_RESPONSES === 'true') {
        return this.getMockResponse(messages);
      }

      // Determine best model for this request
      const selectedModel = this.selectOptimalModel(messages, opts);
      const systemMessage = this.extractSystemMessage(messages);
      
      // Use batch processing if available and suitable
      if (this.batchProcessor && this.shouldUseBatching(opts)) {
        const customId = `triage-${++this.requestCounter}-${Date.now()}`;
        
        return await this.batchProcessor.processRequest(
          customId,
          messages,
          selectedModel,
          systemMessage ? this.formatSystemForBatch(systemMessage) : undefined,
          {
            temperature: opts?.temperature || 0.1,
            maxTokens: opts?.maxTokens || 4000
          }
        );
      }

      // Fallback to direct API call
      return await this.processSingleRequest(messages, selectedModel, systemMessage, opts);
    } catch (error) {
      logger.error('Anthropic API error', { error: error.message });
      throw new Error(`Anthropic API call failed: ${error.message}`);
    }
  }

  private async processSingleRequest(
    messages: ChatMessage[], 
    selectedModel: string, 
    systemMessage: string | undefined, 
    opts?: ChatOptions
  ): Promise<string> {
    // Convert messages to Anthropic format with prompt caching
    const anthropicMessages = this.formatMessagesWithCaching(messages);

    const response = await this.client.messages.create({
      model: selectedModel,
      max_tokens: opts?.maxTokens || 4000,
      temperature: opts?.temperature || 0.1,
      system: systemMessage ? this.formatSystemWithCaching(systemMessage) : undefined,
      messages: anthropicMessages,
    });

    // Log cache usage for cost tracking
    if (response.usage) {
      const cacheStats = this.extractCacheStats(response);
      logger.info('Anthropic API usage', {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheCreationInputTokens: cacheStats.cacheCreationInputTokens,
        cacheReadInputTokens: cacheStats.cacheReadInputTokens,
        model: selectedModel,
        modelSelectionReason: this.getModelSelectionReason(selectedModel),
        processingMode: 'direct'
      });
    }

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private formatMessagesWithCaching(messages: ChatMessage[]): Anthropic.Messages.MessageParam[] {
    // Filter out system messages (handled separately in Anthropic)
    const userMessages = messages.filter(m => m.role !== 'system');
    
    return userMessages.map((message, index) => {
      const content: Anthropic.Messages.MessageParam['content'] = [
        {
          type: 'text',
          text: message.content,
          // Enable caching for system prompts and long context
          ...(this.shouldCacheContent(message, index) && {
            cache_control: { type: 'ephemeral' }
          })
        }
      ];

      return {
        role: message.role as 'user' | 'assistant',
        content
      };
    });
  }

  private extractSystemMessage(messages: ChatMessage[]): string | undefined {
    const systemMessage = messages.find(m => m.role === 'system');
    return systemMessage?.content;
  }

  private formatSystemWithCaching(systemContent: string): Anthropic.Messages.MessageParam['content'] {
    if (!this.enablePromptCaching) {
      return systemContent;
    }

    // Cache system prompts as they're typically reused across requests
    return [
      {
        type: 'text',
        text: systemContent,
        cache_control: { type: 'ephemeral' }
      }
    ];
  }

  private shouldCacheContent(message: ChatMessage, index: number): boolean {
    if (!this.enablePromptCaching) return false;

    // Cache conditions:
    // 1. Long content (>500 characters) - likely to be reused
    // 2. System-like prompts that contain instructions
    // 3. Context that appears early in conversation
    const isLongContent = message.content.length > 500;
    const isInstructional = message.content.includes('You are') || 
                            message.content.includes('Guidelines:') ||
                            message.content.includes('Instructions:');
    const isEarlyContext = index < 2;

    return isLongContent || isInstructional || isEarlyContext;
  }

  private extractCacheStats(response: Anthropic.Messages.Message): {
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  } {
    // Extract cache usage from response metadata if available
    const usage = response.usage as any;
    return {
      cacheCreationInputTokens: usage?.cache_creation_input_tokens || 0,
      cacheReadInputTokens: usage?.cache_read_input_tokens || 0,
    };
  }

  // Utility method to create cached system prompts for agents
  createCachedSystemPrompt(agentType: string, basePrompt: string): ChatMessage {
    return {
      role: 'system',
      content: `${basePrompt}

[CACHED_CONTEXT: This prompt is cached for ${agentType} agent to optimize API costs]`,
    };
  }

  // Method to estimate cache savings
  estimateCacheSavings(messages: ChatMessage[]): {
    potentialSavings: number;
    cacheableTokens: number;
  } {
    let cacheableTokens = 0;
    
    messages.forEach((message, index) => {
      if (this.shouldCacheContent(message, index)) {
        // Rough token estimation (4 chars ≈ 1 token)
        cacheableTokens += Math.ceil(message.content.length / 4);
      }
    });

    // Anthropic prompt caching saves ~90% on cached tokens
    const potentialSavings = cacheableTokens * 0.9;

    return {
      potentialSavings,
      cacheableTokens,
    };
  }

  // Smart model selection based on task complexity
  private selectOptimalModel(messages: ChatMessage[], opts?: ChatOptions): string {
    // If model explicitly specified, use it
    if (opts?.model) {
      return opts.model;
    }

    // If smart routing disabled, use default
    if (!this.useSmartRouting) {
      return this.defaultModel;
    }

    // Check for complexity indicators that might require Sonnet
    const complexityIndicators = this.analyzeComplexity(messages);
    
    // Use Sonnet for high complexity tasks, Haiku for everything else
    if (complexityIndicators.requiresAdvancedReasoning) {
      return this.sonnetModel;
    }

    return this.defaultModel;
  }

  private analyzeComplexity(messages: ChatMessage[]): {
    requiresAdvancedReasoning: boolean;
    complexityScore: number;
    reasons: string[];
  } {
    let complexityScore = 0;
    const reasons: string[] = [];
    
    const allContent = messages.map(m => m.content).join(' ').toLowerCase();

    // High complexity indicators
    const highComplexityPatterns = [
      { pattern: /differential diagnos/i, score: 3, reason: 'differential diagnosis' },
      { pattern: /complex medical reasoning/i, score: 3, reason: 'complex medical reasoning' },
      { pattern: /multiple comorbidities/i, score: 2, reason: 'multiple comorbidities' },
      { pattern: /uncertain diagnosis/i, score: 2, reason: 'diagnostic uncertainty' },
      { pattern: /contraindication/i, score: 2, reason: 'contraindications analysis' },
      { pattern: /drug interaction/i, score: 2, reason: 'drug interactions' },
    ];

    // Medium complexity indicators  
    const mediumComplexityPatterns = [
      { pattern: /multiple symptoms/i, score: 1, reason: 'multiple symptoms' },
      { pattern: /chronic condition/i, score: 1, reason: 'chronic conditions' },
      { pattern: /medication history/i, score: 1, reason: 'medication history' },
      { pattern: /risk stratification/i, score: 1, reason: 'risk stratification' },
    ];

    // Check patterns
    [...highComplexityPatterns, ...mediumComplexityPatterns].forEach(({ pattern, score, reason }) => {
      if (pattern.test(allContent)) {
        complexityScore += score;
        reasons.push(reason);
      }
    });

    // Length-based complexity (very long inputs may need more reasoning)
    const totalLength = allContent.length;
    if (totalLength > 2000) {
      complexityScore += 1;
      reasons.push('long input context');
    }

    // Agent-specific routing (from system prompts)
    if (allContent.includes('RiskStratifierAgent') || allContent.includes('CarePathwayPlannerAgent')) {
      complexityScore += 1;
      reasons.push('complex agent task');
    }

    return {
      requiresAdvancedReasoning: complexityScore >= 3, // Threshold for Sonnet
      complexityScore,
      reasons
    };
  }

  private getModelSelectionReason(selectedModel: string): string {
    if (selectedModel === this.sonnetModel) {
      return 'Advanced reasoning required';
    }
    return 'Standard task - cost optimized';
  }

  // Method to override model selection for specific agents
  createAgentOptimizedProvider(agentType: string): AnthropicProvider {
    // Agent-specific model preferences for cost vs quality balance
    const agentModelPreferences: Record<string, string> = {
      'SymptomParserAgent': this.defaultModel,      // Haiku fine for parsing
      'EmpathyCoachAgent': this.defaultModel,       // Haiku fine for language adaptation
      'ConductorAgent': this.defaultModel,          // Haiku fine for orchestration
      'RiskStratifierAgent': this.sonnetModel,      // Sonnet for medical reasoning
      'CarePathwayPlannerAgent': this.sonnetModel,  // Sonnet for care decisions
    };

    const preferredModel = agentModelPreferences[agentType] || this.defaultModel;
    
    // Create a copy with agent-specific preferences
    const agentProvider = new AnthropicProvider(
      this.client.apiKey,
      preferredModel,
      this.enablePromptCaching,
      this.sonnetModel,
      false // Disable smart routing for agent-specific providers
    );

    return agentProvider;
  }

  // Batch processing helper methods
  private shouldUseBatching(opts?: ChatOptions): boolean {
    // Don't use batching for urgent/high-priority requests
    if (opts?.enableCaching === false) return false;
    
    // Use batching for most triage requests (cost optimization)
    return true;
  }

  private formatSystemForBatch(systemMessage: string): string {
    // For batch processing, we can't use the complex caching format
    // Just return plain text system message
    return systemMessage;
  }

  async flushBatch(): Promise<void> {
    if (this.batchProcessor) {
      await this.batchProcessor.flush();
    }
  }

  getBatchStats(): { pendingRequests: number; pendingCallbacks: number } | null {
    if (this.batchProcessor) {
      return this.batchProcessor.getBatchStats();
    }
    return null;
  }

  // Enable/disable batch processing at runtime
  enableBatchProcessing(options: BatchProcessingOptions): void {
    if (!this.batchProcessor) {
      this.batchProcessor = new BatchProcessor(this.client, options);
    } else {
      this.batchProcessor.updateOptions(options);
    }
  }

  disableBatchProcessing(): void {
    this.batchProcessor = null;
  }

  private getMockResponse(messages: ChatMessage[]): string {
    // Generate realistic mock responses based on the message content
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    // Check if this is a symptom parsing request
    if (lastMessage.includes('extract') || lastMessage.includes('parse') || lastMessage.includes('symptoms')) {
      return JSON.stringify({
        symptoms: ['chest pain', 'sweating', 'nausea'],
        onset: '25 minutes ago',
        severity: 'severe',
        quality: 'crushing',
        radiation: 'left arm',
        associatedSymptoms: ['diaphoresis', 'nausea'],
        redFlags: ['chest pain with radiation', 'diaphoresis'],
        vitalSigns: {},
        medicalHistory: ['hypertension', 'high cholesterol']
      });
    }
    
    // Check if this is a risk assessment request
    if (lastMessage.includes('risk') || lastMessage.includes('assess') || lastMessage.includes('triage')) {
      return JSON.stringify({
        riskBand: 'immediate',
        pUrgent: 0.92,
        redFlags: ['chest pain with radiation', 'diaphoresis'],
        explain: [
          'Chest pain with radiation to left arm suggests possible acute coronary syndrome',
          'Diaphoresis and nausea are concerning associated symptoms',
          'Patient age and cardiovascular risk factors increase concern'
        ]
      });
    }
    
    // Check if this is a care pathway planning request
    if (lastMessage.includes('plan') || lastMessage.includes('care') || lastMessage.includes('disposition')) {
      return JSON.stringify({
        disposition: 'Emergency Department - Immediate',
        why: [
          'Suspected acute coronary syndrome requires immediate cardiac evaluation',
          'ECG, cardiac enzymes, and chest X-ray needed urgently'
        ],
        whatToExpected: [
          'Rapid triage and cardiac monitoring',
          'Blood tests and ECG within minutes',
          'Possible cardiac catheterization if indicated'
        ],
        safetyNet: [
          'Call 911 immediately if symptoms worsen',
          'Do not drive yourself to hospital',
          'If symptoms resolve, still seek immediate medical attention'
        ]
      });
    }
    
    // Check if this is an empathy coaching request
    if (lastMessage.includes('adapt') || lastMessage.includes('patient') || lastMessage.includes('clinician')) {
      return JSON.stringify({
        disposition: 'Please go to the Emergency Department immediately',
        explanation: [
          'Your symptoms are concerning for a possible heart problem',
          'We need to check your heart right away to make sure you get the best care'
        ],
        whatToExpect: [
          'The emergency team will see you quickly',
          'They will do some tests like an ECG and blood work',
          'You may need further heart tests depending on the results'
        ],
        safetyNet: [
          'If your symptoms get worse, call 911 right away',
          'Please don\'t drive yourself - have someone take you or call an ambulance',
          'Even if you feel better, you still need to be checked today'
        ],
        nextSteps: [
          'Go to the nearest Emergency Department now',
          'Bring a list of your medications',
          'Have someone come with you if possible'
        ]
      });
    }
    
    // Default response
    return JSON.stringify({
      message: 'Mock response generated successfully',
      timestamp: new Date().toISOString()
    });
  }
}