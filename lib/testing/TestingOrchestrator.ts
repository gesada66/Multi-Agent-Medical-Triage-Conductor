import { LlmProvider } from '@/lib/adapters/llm/types';
import { ConfigManager } from '@/lib/config';
import { UnitTestGenerator } from './agents/UnitTestGenerator';
import { IntegrationTestAgent } from './agents/IntegrationTestAgent';
import { ContractTestAgent } from './agents/ContractTestAgent';
import { PerformanceTestAgent } from './agents/PerformanceTestAgent';
import { MedicalTestDataGenerator } from './agents/MedicalTestDataGenerator';
import { TestCoverageReporter } from './reporters/TestCoverageReporter';
import { logger } from '@/lib/logger';

export interface TestGenerationRequest {
  id: string;
  type: 'unit' | 'integration' | 'contract' | 'performance' | 'e2e';
  target: string; // File path or component name
  scope: 'single' | 'component' | 'system' | 'full';
  priority: 'critical' | 'high' | 'medium' | 'low';
  medicalContext?: {
    agentType?: string;
    clinicalScenarios?: string[];
    riskLevels?: string[];
  };
}

export interface TestGenerationResult {
  requestId: string;
  type: string;
  target: string;
  success: boolean;
  filesGenerated: string[];
  testCount: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  executionTime: number;
  error?: string;
  recommendations?: string[];
}

export interface TestExecutionOptions {
  parallel: boolean;
  maxConcurrency: number;
  generateData: boolean;
  runCoverage: boolean;
  medicalGradeValidation: boolean;
  costOptimization: boolean;
}

export class TestingOrchestrator {
  private provider: LlmProvider;
  private unitTestGenerator: UnitTestGenerator;
  private integrationTestAgent: IntegrationTestAgent;
  private contractTestAgent: ContractTestAgent;
  private performanceTestAgent: PerformanceTestAgent;
  private medicalDataGenerator: MedicalTestDataGenerator;
  private coverageReporter: TestCoverageReporter;
  private activeRequests: Map<string, TestGenerationRequest> = new Map();

  constructor(provider: LlmProvider) {
    this.provider = provider;
    
    // Initialize specialized testing agents
    this.unitTestGenerator = new UnitTestGenerator(provider);
    this.integrationTestAgent = new IntegrationTestAgent(provider);
    this.contractTestAgent = new ContractTestAgent(provider);
    this.performanceTestAgent = new PerformanceTestAgent(provider);
    this.medicalDataGenerator = new MedicalTestDataGenerator(provider);
    this.coverageReporter = new TestCoverageReporter();
  }

  async generateCompleteTestSuite(
    scope: 'agents' | 'adapters' | 'orchestrator' | 'full',
    options: TestExecutionOptions = {
      parallel: true,
      maxConcurrency: 3,
      generateData: true,
      runCoverage: true,
      medicalGradeValidation: true,
      costOptimization: true
    }
  ): Promise<{
    results: TestGenerationResult[];
    totalTests: number;
    totalCoverage: number;
    executionTime: number;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    
    logger.info('Starting complete test suite generation', {
      scope,
      options,
      timestamp: new Date().toISOString()
    });

    try {
      // Generate test data first if requested
      if (options.generateData) {
        await this.medicalDataGenerator.generateComprehensiveTestData();
      }

      // Define test generation requests based on scope
      const requests = this.createTestRequests(scope);
      
      // Execute test generation
      let results: TestGenerationResult[];
      if (options.parallel) {
        results = await this.executeParallelTestGeneration(requests, options);
      } else {
        results = await this.executeSequentialTestGeneration(requests);
      }

      // Calculate overall metrics
      const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
      const totalCoverage = await this.calculateOverallCoverage(results);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(results, options);

      const executionTime = Date.now() - startTime;

      logger.info('Test suite generation completed', {
        totalTests,
        totalCoverage,
        executionTime,
        successfulResults: results.filter(r => r.success).length,
        failedResults: results.filter(r => !r.success).length
      });

      return {
        results,
        totalTests,
        totalCoverage,
        executionTime,
        recommendations
      };

    } catch (error) {
      logger.error('Test suite generation failed', { error: error.message });
      throw new Error(`Test suite generation failed: ${error.message}`);
    }
  }

  private createTestRequests(scope: string): TestGenerationRequest[] {
    const requests: TestGenerationRequest[] = [];
    let requestId = 1;

    if (scope === 'agents' || scope === 'full') {
      // Unit tests for all Semantic Kernel agents
      const agentTypes = [
        'ConductorAgent',
        'SymptomParserAgent', 
        'RiskStratifierAgent',
        'CarePathwayPlannerAgent',
        'EmpathyCoachAgent'
      ];

      agentTypes.forEach(agentType => {
        requests.push({
          id: `unit-agent-${requestId++}`,
          type: 'unit',
          target: `lib/sk/agents/${agentType}`,
          scope: 'component',
          priority: 'critical',
          medicalContext: {
            agentType,
            clinicalScenarios: this.getClinicalScenariosForAgent(agentType),
            riskLevels: ['immediate', 'urgent', 'routine', 'low']
          }
        });

        requests.push({
          id: `integration-agent-${requestId++}`,
          type: 'integration',
          target: `lib/sk/agents/${agentType}`,
          scope: 'component',
          priority: 'high',
          medicalContext: {
            agentType,
            clinicalScenarios: this.getClinicalScenariosForAgent(agentType)
          }
        });
      });
    }

    if (scope === 'adapters' || scope === 'full') {
      // Unit tests for LLM adapters
      requests.push({
        id: `unit-anthropic-${requestId++}`,
        type: 'unit',
        target: 'lib/adapters/llm/AnthropicProvider',
        scope: 'component',
        priority: 'critical',
        medicalContext: {
          clinicalScenarios: ['caching', 'batching', 'smart_routing', 'cost_optimization']
        }
      });

      requests.push({
        id: `unit-batch-processor-${requestId++}`,
        type: 'unit',
        target: 'lib/adapters/llm/BatchProcessor',
        scope: 'component',
        priority: 'high'
      });

      // Contract tests for LLM provider interfaces
      requests.push({
        id: `contract-llm-${requestId++}`,
        type: 'contract',
        target: 'lib/adapters/llm/types',
        scope: 'system',
        priority: 'critical'
      });
    }

    if (scope === 'orchestrator' || scope === 'full') {
      // Integration tests for BatchTriageOrchestrator
      requests.push({
        id: `integration-orchestrator-${requestId++}`,
        type: 'integration',
        target: 'lib/sk/BatchTriageOrchestrator',
        scope: 'system',
        priority: 'critical',
        medicalContext: {
          clinicalScenarios: ['immediate_triage', 'batch_processing', 'cost_optimization'],
          riskLevels: ['immediate', 'urgent', 'routine', 'batch']
        }
      });

      // Performance tests for orchestrator under medical load
      requests.push({
        id: `performance-orchestrator-${requestId++}`,
        type: 'performance',
        target: 'lib/sk/BatchTriageOrchestrator',
        scope: 'system',
        priority: 'high',
        medicalContext: {
          clinicalScenarios: ['peak_load', 'emergency_surge', 'cost_optimization']
        }
      });
    }

    if (scope === 'full') {
      // Full system contract tests
      requests.push({
        id: `contract-api-${requestId++}`,
        type: 'contract',
        target: 'app/api/triage/route',
        scope: 'system',
        priority: 'critical'
      });

      // End-to-end performance tests
      requests.push({
        id: `performance-e2e-${requestId++}`,
        type: 'performance',
        target: 'system',
        scope: 'full',
        priority: 'high',
        medicalContext: {
          clinicalScenarios: ['full_workflow', 'multi_patient', 'cost_analysis']
        }
      });
    }

    return requests;
  }

  private getClinicalScenariosForAgent(agentType: string): string[] {
    const scenarioMap: Record<string, string[]> = {
      ConductorAgent: [
        'red_flag_detection',
        'clarification_requests',
        'workflow_orchestration',
        'agent_coordination'
      ],
      SymptomParserAgent: [
        'chest_pain_parsing',
        'headache_symptoms',
        'respiratory_symptoms',
        'psychiatric_symptoms',
        'ambiguous_input',
        'structured_extraction'
      ],
      RiskStratifierAgent: [
        'immediate_risk_flags',
        'urgent_care_scenarios',
        'routine_care_mapping',
        'news_score_calculation',
        'confidence_scoring'
      ],
      CarePathwayPlannerAgent: [
        'ed_referrals',
        'urgent_care_routing',
        'gp_appointments',
        'self_care_guidance',
        'safety_netting'
      ],
      EmpathyCoachAgent: [
        'patient_communication',
        'clinician_reports',
        'anxiety_management',
        'cultural_sensitivity',
        'language_adaptation'
      ]
    };

    return scenarioMap[agentType] || ['general_medical_scenarios'];
  }

  private async executeParallelTestGeneration(
    requests: TestGenerationRequest[],
    options: TestExecutionOptions
  ): Promise<TestGenerationResult[]> {
    const chunks = this.chunkArray(requests, options.maxConcurrency);
    const results: TestGenerationResult[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(request => this.processTestRequest(request, options));
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Test generation failed', {
            requestId: chunk[index].id,
            error: result.reason
          });
          
          results.push({
            requestId: chunk[index].id,
            type: chunk[index].type,
            target: chunk[index].target,
            success: false,
            filesGenerated: [],
            testCount: 0,
            executionTime: 0,
            error: result.reason.message
          });
        }
      });
    }

    return results;
  }

  private async executeSequentialTestGeneration(
    requests: TestGenerationRequest[]
  ): Promise<TestGenerationResult[]> {
    const results: TestGenerationResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.processTestRequest(request);
        results.push(result);
      } catch (error) {
        logger.error('Sequential test generation failed', {
          requestId: request.id,
          error: error.message
        });
        
        results.push({
          requestId: request.id,
          type: request.type,
          target: request.target,
          success: false,
          filesGenerated: [],
          testCount: 0,
          executionTime: 0,
          error: error.message
        });
      }
    }

    return results;
  }

  private async processTestRequest(
    request: TestGenerationRequest,
    options?: TestExecutionOptions
  ): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    logger.info('Processing test request', {
      requestId: request.id,
      type: request.type,
      target: request.target
    });

    this.activeRequests.set(request.id, request);

    try {
      let result: TestGenerationResult;

      switch (request.type) {
        case 'unit':
          result = await this.unitTestGenerator.generateTests(request);
          break;
        case 'integration':
          result = await this.integrationTestAgent.generateTests(request);
          break;
        case 'contract':
          result = await this.contractTestAgent.generateTests(request);
          break;
        case 'performance':
          result = await this.performanceTestAgent.generateTests(request);
          break;
        default:
          throw new Error(`Unsupported test type: ${request.type}`);
      }

      result.executionTime = Date.now() - startTime;
      
      if (options?.runCoverage && result.success) {
        result.coverage = await this.coverageReporter.calculateCoverage(result.filesGenerated);
      }

      logger.info('Test request completed', {
        requestId: request.id,
        success: result.success,
        testCount: result.testCount,
        filesGenerated: result.filesGenerated.length,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      logger.error('Test request processing failed', {
        requestId: request.id,
        error: error.message
      });

      return {
        requestId: request.id,
        type: request.type,
        target: request.target,
        success: false,
        filesGenerated: [],
        testCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  private async calculateOverallCoverage(results: TestGenerationResult[]): Promise<number> {
    const successfulResults = results.filter(r => r.success && r.coverage);
    
    if (successfulResults.length === 0) return 0;

    const totalLines = successfulResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0);
    const avgCoverage = totalLines / successfulResults.length;
    
    return Math.round(avgCoverage * 100) / 100;
  }

  private async generateRecommendations(
    results: TestGenerationResult[],
    options: TestExecutionOptions
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    const failedResults = results.filter(r => !r.success);
    const lowCoverageResults = results.filter(r => r.success && r.coverage && r.coverage.lines < 80);
    
    if (failedResults.length > 0) {
      recommendations.push(
        `${failedResults.length} test generation(s) failed. Review errors and regenerate.`
      );
    }

    if (lowCoverageResults.length > 0) {
      recommendations.push(
        `${lowCoverageResults.length} component(s) have coverage below 80%. Consider additional test scenarios.`
      );
    }

    const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
    if (totalTests < 100) {
      recommendations.push(
        'Test suite appears small for medical system. Consider more comprehensive scenarios.'
      );
    }

    if (options.costOptimization) {
      const costEstimate = await this.estimateTestingCosts(results);
      recommendations.push(
        `Estimated monthly testing costs: $${costEstimate.toFixed(2)}. Consider test caching and optimization.`
      );
    }

    return recommendations;
  }

  private async estimateTestingCosts(results: TestGenerationResult[]): Promise<number> {
    // Rough estimation based on successful test generations
    const successfulResults = results.filter(r => r.success);
    const avgTestsPerComponent = 25;
    const avgTokensPerTest = 1500;
    const tokenCostPer1k = 0.001; // Approximate for Haiku
    
    const estimatedTokens = successfulResults.length * avgTestsPerComponent * avgTokensPerTest;
    return (estimatedTokens / 1000) * tokenCostPer1k * 30; // Monthly estimate
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Utility methods for monitoring and control
  getActiveRequests(): TestGenerationRequest[] {
    return Array.from(this.activeRequests.values());
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    const request = this.activeRequests.get(requestId);
    if (request) {
      this.activeRequests.delete(requestId);
      logger.info('Test request cancelled', { requestId });
      return true;
    }
    return false;
  }

  async getSystemHealthcheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeRequests: number;
    availableAgents: string[];
    lastExecutionTime?: number;
  }> {
    const availableAgents = [
      'UnitTestGenerator',
      'IntegrationTestAgent', 
      'ContractTestAgent',
      'PerformanceTestAgent',
      'MedicalTestDataGenerator'
    ];

    return {
      status: this.activeRequests.size < 10 ? 'healthy' : 'degraded',
      activeRequests: this.activeRequests.size,
      availableAgents
    };
  }
}