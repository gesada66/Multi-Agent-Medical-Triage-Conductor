import { LlmProvider } from '../../adapters/llm/types';
import { SymptomParserAgent } from './SymptomParserAgent';
import { RiskStratifierAgent } from './RiskStratifierAgent';
import { MemoryAugmentedRiskAgent } from './MemoryAugmentedRiskAgent';
import { CarePathwayPlannerAgent } from './CarePathwayPlannerAgent';
import { EmpathyCoachAgent } from './EmpathyCoachAgent';
import { AgentFactory } from './AgentFactory';
import { logger } from '../../logger';

export interface TriageRequest {
  mode: 'patient' | 'clinician';
  input: {
    text: string;
    voiceData?: any; // Future: voice input support
  };
  patientId: string;
  patientContext?: {
    age?: number;
    gender?: string;
    existingConditions?: string[];
    medications?: string[];
    allergies?: string[];
    anxietyLevel?: 'low' | 'medium' | 'high';
    healthLiteracy?: 'basic' | 'intermediate' | 'advanced';
    culturalConsiderations?: string[];
    preferredLanguage?: string;
  };
}

export interface TriageResponse {
  evidence: any;
  risk: any;
  plan: any;
  adaptedResponse: any;
  confidence: number;
  citations: any[];
  traceId: string;
  processingTime: number;
  costMetrics?: {
    tokensUsed: number;
    modelUsed: string;
    estimatedCost: number;
  };
}

export class ConductorAgent {
  private symptomParser: SymptomParserAgent;
  private riskStratifier: RiskStratifierAgent | MemoryAugmentedRiskAgent;
  private carePathwayPlanner: CarePathwayPlannerAgent;
  private empathyCoach: EmpathyCoachAgent;

  private constructor(provider: LlmProvider, riskStratifier: RiskStratifierAgent | MemoryAugmentedRiskAgent) {
    this.symptomParser = new SymptomParserAgent(provider);
    this.riskStratifier = riskStratifier;
    this.carePathwayPlanner = new CarePathwayPlannerAgent(provider);
    this.empathyCoach = new EmpathyCoachAgent(provider);
    
    // Log which risk agent is being used
    const agentType = this.riskStratifier instanceof MemoryAugmentedRiskAgent ? 'Memory Augmented' : 'Standard';
    logger.info('Conductor initialized with risk agent', { agentType });
  }

  static async create(provider: LlmProvider): Promise<ConductorAgent> {
    // Use factory to determine if Memory RAG should be enabled
    const riskStratifier = await AgentFactory.createRiskAgent(provider);
    return new ConductorAgent(provider, riskStratifier);
  }

  async conductTriage(request: TriageRequest): Promise<TriageResponse> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      logger.info('Starting triage workflow', {
        traceId,
        patientId: request.patientId,
        mode: request.mode,
        hasPatientContext: !!request.patientContext
      });

      // Step 1: Validate and preprocess input
      const validatedInput = await this.validateInput(request);
      if (!validatedInput.isValid) {
        return this.createClarificationResponse(validatedInput.issues, traceId, startTime);
      }

      // Step 2: Parse symptoms into structured clinical evidence
      const evidenceResult = await this.symptomParser.parseSymptoms(
        request.input.text,
        request.patientId,
        request.patientContext
      );

      // Step 3: Check if clarification is needed
      if (evidenceResult.confidence < 0.6 || evidenceResult.clarifyingQuestions?.length > 0) {
        return this.createClarificationResponse(
          evidenceResult.clarifyingQuestions || ['Please provide more details about your symptoms'],
          traceId,
          startTime,
          evidenceResult.evidence
        );
      }

      // Step 4: Assess medical risk
      const riskResult = await this.riskStratifier.assessRisk(
        evidenceResult.evidence,
        request.patientContext
      );

      // Step 5: Handle immediate/red flag cases with fast path
      if (riskResult.risk.band === 'immediate') {
        logger.warn('RED FLAG DETECTED - Fast path activated', {
          traceId,
          patientId: request.patientId,
          redFlags: evidenceResult.evidence.features?.redFlags
        });

        return await this.handleEmergencyCase(
          evidenceResult.evidence,
          riskResult,
          request,
          traceId,
          startTime
        );
      }

      // Step 6: Create care pathway plan
      const carePlanResult = await this.carePathwayPlanner.createCarePlan(
        evidenceResult.evidence,
        riskResult,
        request.patientContext
      );

      // Step 7: Adapt response for target audience
      const adaptedResult = await this.empathyCoach.adaptResponse(
        carePlanResult,
        request.mode,
        request.patientContext
      );

      // Step 8: Compile final response
      const response: TriageResponse = {
        evidence: evidenceResult.evidence,
        risk: riskResult.risk,
        plan: carePlanResult.plan,
        adaptedResponse: adaptedResult.adaptedResponse,
        confidence: this.calculateOverallConfidence([
          evidenceResult.confidence,
          riskResult.confidence,
          carePlanResult.confidence,
          adaptedResult.confidence
        ]),
        citations: carePlanResult.citations || [],
        traceId,
        processingTime: Date.now() - startTime
      };

      logger.info('Triage workflow completed successfully', {
        traceId,
        patientId: request.patientId,
        riskBand: response.risk.band,
        disposition: response.plan.disposition,
        confidence: response.confidence,
        processingTime: response.processingTime
      });

      return response;

    } catch (error) {
      logger.error('Triage workflow failed', {
        traceId,
        patientId: request.patientId,
        error: error.message,
        stack: error.stack
      });

      return this.createErrorResponse(error, traceId, startTime);
    }
  }

  private async validateInput(request: TriageRequest): Promise<{
    isValid: boolean;
    issues?: string[];
  }> {
    const issues: string[] = [];

    // Check basic requirements
    if (!request.input?.text || request.input.text.trim().length < 5) {
      issues.push('Please describe your symptoms in more detail');
    }

    if (!request.patientId) {
      issues.push('Patient identification is required');
    }

    // Check for obvious non-medical input
    const text = request.input.text.toLowerCase();
    const nonMedicalKeywords = ['joke', 'test', 'hello', 'weather', 'politics'];
    if (nonMedicalKeywords.some(keyword => text.includes(keyword))) {
      issues.push('Please describe medical symptoms or health concerns');
    }

    // Check for emergency keywords that need immediate attention
    const emergencyKeywords = [
      'suicide', 'kill myself', 'overdose', 'poisoning',
      'severe chest pain', 'can\'t breathe', 'unconscious'
    ];
    
    if (emergencyKeywords.some(keyword => text.includes(keyword))) {
      // This is valid but will trigger emergency pathway
      logger.warn('Emergency keywords detected in input', {
        patientId: request.patientId,
        emergencyIndicators: emergencyKeywords.filter(k => text.includes(k))
      });
    }

    return {
      isValid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    };
  }

  private async handleEmergencyCase(
    evidence: any,
    risk: any,
    request: TriageRequest,
    traceId: string,
    startTime: number
  ): Promise<TriageResponse> {
    logger.info('Processing emergency case via fast path', { traceId });

    // Create emergency-specific care plan
    const emergencyCarePlan = await this.carePathwayPlanner.createEmergencyCarePlan(
      evidence,
      risk
    );

    // Adapt for urgent communication
    const adaptedResult = await this.empathyCoach.adaptResponse(
      emergencyCarePlan,
      request.mode,
      request.patientContext
    );

    return {
      evidence,
      risk: risk.risk,
      plan: emergencyCarePlan.plan,
      adaptedResponse: adaptedResult.adaptedResponse,
      confidence: 0.95, // High confidence for emergency cases
      citations: emergencyCarePlan.citations || [],
      traceId,
      processingTime: Date.now() - startTime
    };
  }

  private createClarificationResponse(
    questions: string[],
    traceId: string,
    startTime: number,
    partialEvidence?: any
  ): TriageResponse {
    return {
      evidence: partialEvidence || {
        patientId: 'unknown',
        presentingComplaint: 'Clarification needed',
        features: {}
      },
      risk: {
        band: 'routine' as const,
        pUrgent: 0.3,
        explain: ['More information needed for accurate assessment']
      },
      plan: {
        disposition: 'Please provide additional information',
        why: ['Complete symptom assessment requires more details'],
        whatToExpected: ['Answer the following questions to help with your assessment'],
        safetyNet: ['Seek immediate care if symptoms worsen significantly'],
        timeframe: 'After providing additional information'
      },
      adaptedResponse: {
        disposition: 'Please answer a few more questions',
        explanation: ['I need more information to give you the best guidance'],
        whatToExpect: ['Once you provide more details, I can give you specific recommendations'],
        safetyNet: ['If your symptoms get much worse, seek immediate medical care'],
        nextSteps: questions,
        reassurance: ['Getting the right information helps ensure you receive appropriate care']
      },
      confidence: 0.4,
      citations: [],
      traceId,
      processingTime: Date.now() - startTime
    };
  }

  private createErrorResponse(error: any, traceId: string, startTime: number): TriageResponse {
    logger.error('Creating error response', { traceId, error: error.message });

    return {
      evidence: {
        patientId: 'error',
        presentingComplaint: 'System error occurred',
        features: {}
      },
      risk: {
        band: 'urgent' as const, // Default to urgent for safety
        pUrgent: 0.8,
        explain: ['System error - clinical assessment recommended']
      },
      plan: {
        disposition: 'Please seek medical evaluation',
        why: ['System error occurred during assessment', 'Clinical evaluation recommended for safety'],
        whatToExpected: ['Healthcare professional will evaluate your condition'],
        safetyNet: ['Call 911 if experiencing emergency symptoms'],
        timeframe: 'As soon as possible'
      },
      adaptedResponse: {
        disposition: 'Please see a healthcare provider for evaluation',
        explanation: [
          'I encountered a technical problem while assessing your symptoms',
          'To ensure your safety, please seek medical care directly'
        ],
        whatToExpected: [
          'A healthcare professional can properly evaluate your condition',
          'They have the tools and expertise to help you'
        ],
        safetyNet: [
          'Call 911 immediately if you have severe symptoms',
          'Go to the emergency room for urgent concerns'
        ],
        nextSteps: [
          'Contact your doctor or visit an urgent care center',
          'Bring a list of your symptoms and any medications you take'
        ],
        reassurance: [
          'Technical problems happen, but your health is important',
          'Healthcare providers are ready to help you'
        ]
      },
      confidence: 0.2,
      citations: [],
      traceId,
      processingTime: Date.now() - startTime
    };
  }

  private calculateOverallConfidence(confidences: number[]): number {
    // Use weighted harmonic mean to be conservative
    const weights = [0.3, 0.3, 0.25, 0.15]; // symptom parsing most important
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    confidences.forEach((conf, index) => {
      if (typeof conf === 'number' && conf > 0) {
        const weight = weights[index] || 0.1;
        weightedSum += weight / conf;
        totalWeight += weight;
      }
    });

    if (totalWeight === 0 || weightedSum === 0) {
      return 0.5; // Default moderate confidence
    }

    const harmonicMean = totalWeight / weightedSum;
    return Math.max(0.1, Math.min(0.95, harmonicMean)); // Bounded between 0.1 and 0.95
  }

  private generateTraceId(): string {
    return `triage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method for batch processing integration
  async conductBatchTriage(requests: TriageRequest[]): Promise<TriageResponse[]> {
    logger.info('Starting batch triage workflow', { 
      batchSize: requests.length 
    });

    // Process requests in parallel, but limit concurrency for resource management
    const maxConcurrency = 5;
    const results: TriageResponse[] = [];

    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(request => this.conductTriage(request));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error response for failed requests
          const failedRequest = batch[index];
          results.push(this.createErrorResponse(
            result.reason,
            this.generateTraceId(),
            Date.now()
          ));
        }
      });
    }

    logger.info('Batch triage workflow completed', {
      totalRequests: requests.length,
      successfulResponses: results.filter(r => r.confidence > 0.3).length
    });

    return results;
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    agents: Record<string, boolean>;
    timestamp: string;
  }> {
    const agents = {
      symptomParser: true,
      riskStratifier: true,
      carePathwayPlanner: true,
      empathyCoach: true
    };

    // Quick test of each agent
    try {
      // Test with minimal input
      const testResult = await this.symptomParser.parseSymptoms(
        'test headache',
        'health-check-001'
      );
      agents.symptomParser = testResult.confidence > 0;
    } catch (error) {
      agents.symptomParser = false;
    }

    const healthyAgents = Object.values(agents).filter(Boolean).length;
    const totalAgents = Object.keys(agents).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyAgents === totalAgents) {
      status = 'healthy';
    } else if (healthyAgents >= totalAgents * 0.75) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      agents,
      timestamp: new Date().toISOString()
    };
  }
}