import OpenAI from 'openai';
import { LlmProvider, ChatMessage, ChatOptions } from './types';
import { logger } from '../../logger';

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;
  private embeddingsModel: string;

  constructor(
    apiKey: string,
    model = 'gpt-4o-mini',
    embeddingsModel = 'text-embedding-3-small',
    organizationId?: string
  ) {
    this.client = new OpenAI({
      apiKey,
      organization: organizationId,
    });
    this.model = model;
    this.embeddingsModel = embeddingsModel;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingsModel,
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error('OpenAI embeddings failed', { error: error.message });
      throw new Error(`OpenAI embeddings failed: ${error.message}`);
    }
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    try {
      // Check if mock mode is enabled
      if (process.env.MOCK_LLM_RESPONSES === 'true') {
        return this.getMockResponse(messages);
      }

      // Convert to OpenAI format
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = 
        messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }));

      const response = await this.client.chat.completions.create({
        model: opts?.model || this.model,
        messages: openaiMessages,
        temperature: opts?.temperature || 0.1,
        max_tokens: opts?.maxTokens || 4000,
      });

      // Log usage for cost tracking
      if (response.usage) {
        logger.info('OpenAI API usage', {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          model: opts?.model || this.model,
        });
      }

      return response.choices[0]?.message?.content || '';

    } catch (error) {
      logger.error('OpenAI API error', { error: error.message });
      throw new Error(`OpenAI API call failed: ${error.message}`);
    }
  }

  // Method to estimate costs (different pricing than Anthropic)
  estimateTokenCosts(inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // GPT-4o-mini pricing (as of Dec 2024)
    const inputCostPer1M = 0.50;  // $0.50 per 1M input tokens
    const outputCostPer1M = 1.50; // $1.50 per 1M output tokens

    const inputCost = (inputTokens / 1000000) * inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * outputCostPer1M;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      logger.error('OpenAI health check failed', { error: error.message });
      return false;
    }
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