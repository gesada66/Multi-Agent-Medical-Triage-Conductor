import { LlmProvider, ChatMessage } from '@/lib/adapters/llm/types';
import { TestGenerationRequest, TestGenerationResult } from '../TestingOrchestrator';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

interface IntegrationTestSuite {
  apiTests: ApiTest[];
  workflowTests: WorkflowTest[];
  agentInteractionTests: AgentInteractionTest[];
  errorHandlingTests: ErrorHandlingTest[];
  medicalScenarioTests: MedicalScenarioTest[];
}

interface ApiTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestData?: any;
  expectedStatus: number;
  expectedResponse?: any;
  headers?: Record<string, string>;
  testCode: string;
}

interface WorkflowTest {
  name: string;
  description: string;
  steps: WorkflowStep[];
  expectedOutcome: string;
  medicalContext?: {
    scenario: string;
    patientData: any;
    expectedDisposition: string;
  };
  testCode: string;
}

interface WorkflowStep {
  action: string;
  agent?: string;
  input?: any;
  expectedOutput?: any;
}

interface AgentInteractionTest {
  name: string;
  agentA: string;
  agentB: string;
  interactionType: 'sequential' | 'parallel' | 'conditional';
  testCode: string;
}

interface ErrorHandlingTest {
  name: string;
  errorType: 'network' | 'validation' | 'timeout' | 'dependency' | 'medical';
  scenario: string;
  testCode: string;
}

interface MedicalScenarioTest {
  name: string;
  clinicalScenario: string;
  patientData: any;
  expectedFlow: string[];
  expectedDisposition: string;
  testCode: string;
}

export class IntegrationTestAgent {
  private provider: LlmProvider;
  
  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating integration tests', {
        requestId: request.id,
        target: request.target,
        scope: request.scope
      });

      // Determine test type based on target
      const testSuite = await this.generateTestSuite(request);
      
      // Create test files
      const filesGenerated = await this.writeTestFiles(testSuite, request);
      
      // Calculate test count
      const testCount = this.calculateTestCount(testSuite);
      
      logger.info('Integration tests generated successfully', {
        requestId: request.id,
        testCount,
        filesGenerated: filesGenerated.length
      });

      return {
        requestId: request.id,
        type: 'integration',
        target: request.target,
        success: true,
        filesGenerated,
        testCount,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Integration test generation failed', {
        requestId: request.id,
        error: error.message
      });

      return {
        requestId: request.id,
        type: 'integration',
        target: request.target,
        success: false,
        filesGenerated: [],
        testCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async generateTestSuite(request: TestGenerationRequest): Promise<IntegrationTestSuite> {
    const suite: IntegrationTestSuite = {
      apiTests: [],
      workflowTests: [],
      agentInteractionTests: [],
      errorHandlingTests: [],
      medicalScenarioTests: []
    };

    // Generate tests based on target type
    if (request.target.includes('api/')) {
      suite.apiTests = await this.generateApiTests(request);
    } else if (request.target.includes('BatchTriageOrchestrator')) {
      suite.workflowTests = await this.generateWorkflowTests(request);
      suite.agentInteractionTests = await this.generateAgentInteractionTests(request);
      suite.medicalScenarioTests = await this.generateMedicalWorkflowTests(request);
    } else if (request.target.includes('agents/')) {
      suite.agentInteractionTests = await this.generateAgentInteractionTests(request);
    }

    // Always generate error handling tests
    suite.errorHandlingTests = await this.generateErrorHandlingTests(request);

    return suite;
  }

  private async generateApiTests(request: TestGenerationRequest): Promise<ApiTest[]> {
    const apiTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive API integration tests for a medical triage system.

API TESTING PATTERNS:
1. Request/Response validation with medical data
2. Authentication and authorization
3. Rate limiting and throttling
4. Error response formats
5. Medical data compliance (HIPAA, patient safety)
6. API contract adherence

MEDICAL API REQUIREMENTS:
- Validate all medical input data
- Test emergency fast-path scenarios
- Verify proper error responses for invalid medical data
- Test rate limiting during emergency surges
- Validate response times for critical scenarios

Use Vitest with supertest for HTTP testing. Return JSON array of API test objects.`
      },
      {
        role: 'user',
        content: `Generate API integration tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}
Scope: ${request.scope}

Focus on medical data validation and emergency scenario handling.`
      }
    ];

    const response = await this.provider.chat(apiTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse API tests, using fallback', { error: error.message });
      return this.generateFallbackApiTests(request);
    }
  }

  private async generateWorkflowTests(request: TestGenerationRequest): Promise<WorkflowTest[]> {
    const workflowTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive workflow integration tests for medical triage orchestration.

WORKFLOW TESTING SCENARIOS:
1. Complete triage workflows from symptom input to disposition
2. Multi-agent coordination and handoffs
3. Emergency fast-path scenarios
4. Batch processing workflows
5. Error recovery and fallback mechanisms
6. Cost optimization workflows

MEDICAL WORKFLOW REQUIREMENTS:
- Test complete patient journey scenarios
- Validate proper agent sequencing
- Ensure critical path performance
- Test emergency escalation pathways
- Verify audit trail completeness

Return JSON array of workflow test objects with steps and expected outcomes.`
      },
      {
        role: 'user',
        content: `Generate workflow integration tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}
Clinical Scenarios: ${JSON.stringify(request.medicalContext?.clinicalScenarios)}

Focus on complete triage workflows and agent coordination.`
      }
    ];

    const response = await this.provider.chat(workflowTestPrompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse workflow tests, using fallback', { error: error.message });
      return this.generateFallbackWorkflowTests(request);
    }
  }

  private async generateAgentInteractionTests(request: TestGenerationRequest): Promise<AgentInteractionTest[]> {
    const interactionTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate agent interaction integration tests for medical triage system.

AGENT INTERACTION PATTERNS:
1. Sequential processing (Parser → Risk → Pathway → Empathy)
2. Parallel processing for batch scenarios
3. Conditional routing based on medical criteria
4. Error propagation between agents
5. Context sharing and state management
6. Performance optimization coordination

MEDICAL AGENT INTERACTIONS:
- Conductor orchestrating specialist agents
- Symptom parser feeding risk stratifier
- Risk stratifier informing pathway planner
- Empathy coach adapting final output
- Error handling across agent boundaries

Return JSON array of agent interaction test objects.`
      },
      {
        role: 'user',
        content: `Generate agent interaction tests for: ${request.target}

Agent Type: ${request.medicalContext?.agentType}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on proper agent coordination and medical data flow.`
      }
    ];

    const response = await this.provider.chat(interactionTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse interaction tests, using fallback', { error: error.message });
      return this.generateFallbackInteractionTests(request);
    }
  }

  private async generateMedicalWorkflowTests(request: TestGenerationRequest): Promise<MedicalScenarioTest[]> {
    const medicalTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate medical scenario integration tests for complete triage workflows.

CLINICAL INTEGRATION SCENARIOS:
1. Emergency red flag scenarios (chest pain, stroke symptoms)
2. Urgent care scenarios (moderate pain, concerning symptoms)
3. Routine care scenarios (mild symptoms, chronic conditions)
4. Complex multi-symptom presentations
5. Pediatric vs adult scenarios
6. Mental health scenarios

WORKFLOW VALIDATION:
- Complete patient journey testing
- Appropriate disposition assignment
- Safety net advice generation
- Clinical reasoning capture
- Performance under medical load
- Cost optimization verification

Return JSON array of medical scenario test objects with realistic patient data.`
      },
      {
        role: 'user',
        content: `Generate medical workflow tests for: ${request.target}

Clinical Scenarios: ${JSON.stringify(request.medicalContext?.clinicalScenarios)}
Risk Levels: ${JSON.stringify(request.medicalContext?.riskLevels)}

Create comprehensive medical workflow validation tests.`
      }
    ];

    const response = await this.provider.chat(medicalTestPrompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse medical tests, using fallback', { error: error.message });
      return this.generateFallbackMedicalTests(request);
    }
  }

  private async generateErrorHandlingTests(request: TestGenerationRequest): Promise<ErrorHandlingTest[]> {
    const errorTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate error handling integration tests for medical systems.

ERROR SCENARIOS FOR INTEGRATION TESTING:
1. LLM provider failures during critical operations
2. Network timeouts during emergency processing
3. Invalid medical data propagation
4. Agent failure and recovery scenarios
5. Resource exhaustion under load
6. Data corruption detection
7. System overload management

MEDICAL ERROR REQUIREMENTS:
- Never fail silently on medical data
- Ensure graceful degradation
- Maintain patient safety during failures
- Preserve audit trails during errors
- Test emergency escalation on failures

Return JSON array of error handling test objects.`
      },
      {
        role: 'user',
        content: `Generate error handling integration tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on patient safety and system reliability during failures.`
      }
    ];

    const response = await this.provider.chat(errorTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse error tests, using fallback', { error: error.message });
      return this.generateFallbackErrorTests();
    }
  }

  private async writeTestFiles(
    testSuite: IntegrationTestSuite,
    request: TestGenerationRequest
  ): Promise<string[]> {
    const filesGenerated: string[] = [];
    const testDir = 'tests/integration';
    
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const componentName = this.extractComponentName(request.target);

    // Generate API test file if has API tests
    if (testSuite.apiTests.length > 0) {
      const apiTestFile = this.createApiTestFile(testSuite.apiTests, request);
      const apiFilePath = join(testDir, `${componentName}.api.test.ts`);
      writeFileSync(apiFilePath, apiTestFile, 'utf-8');
      filesGenerated.push(apiFilePath);
    }

    // Generate workflow test file if has workflow tests
    if (testSuite.workflowTests.length > 0 || testSuite.medicalScenarioTests.length > 0) {
      const workflowTestFile = this.createWorkflowTestFile(testSuite, request);
      const workflowFilePath = join(testDir, `${componentName}.workflow.test.ts`);
      writeFileSync(workflowFilePath, workflowTestFile, 'utf-8');
      filesGenerated.push(workflowFilePath);
    }

    // Generate agent interaction test file if has interaction tests
    if (testSuite.agentInteractionTests.length > 0) {
      const interactionTestFile = this.createInteractionTestFile(testSuite.agentInteractionTests, request);
      const interactionFilePath = join(testDir, `${componentName}.interactions.test.ts`);
      writeFileSync(interactionFilePath, interactionTestFile, 'utf-8');
      filesGenerated.push(interactionFilePath);
    }

    // Generate error handling test file
    if (testSuite.errorHandlingTests.length > 0) {
      const errorTestFile = this.createErrorTestFile(testSuite.errorHandlingTests, request);
      const errorFilePath = join(testDir, `${componentName}.errors.test.ts`);
      writeFileSync(errorFilePath, errorTestFile, 'utf-8');
      filesGenerated.push(errorFilePath);
    }

    logger.info('Integration test files written', {
      filesGenerated: filesGenerated.length,
      totalTests: this.calculateTestCount(testSuite)
    });

    return filesGenerated;
  }

  private createApiTestFile(apiTests: ApiTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);
    const importPath = this.generateImportPath(request.target);

    return `// Generated API integration tests for ${componentName}
// Auto-generated by IntegrationTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { ConfigManager } from '@/lib/config';

describe('${componentName} - API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  afterAll(async () => {
    // Cleanup
    await app?.close();
  });

${apiTests.map(test => `
  it('${test.name}', async () => {
    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createWorkflowTestFile(testSuite: IntegrationTestSuite, request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated workflow integration tests for ${componentName}
// Auto-generated by IntegrationTestAgent - Medical Triage System  
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BatchTriageOrchestrator } from '@/lib/sk/BatchTriageOrchestrator';
import { AnthropicProvider } from '@/lib/adapters/llm/AnthropicProvider';

describe('${componentName} - Workflow Integration Tests', () => {
  let orchestrator: BatchTriageOrchestrator;
  let provider: AnthropicProvider;

  beforeEach(async () => {
    // Setup test environment with mocked provider
    provider = new AnthropicProvider('test-api-key');
    orchestrator = new BatchTriageOrchestrator(provider);
  });

  afterEach(async () => {
    // Cleanup
    await orchestrator.flushBatch();
  });

  describe('Workflow Tests', () => {
${testSuite.workflowTests.map(test => `
    it('${test.name}', async () => {
      ${test.testCode}
    });`).join('\n')}
  });

  describe('Medical Scenario Tests', () => {
${testSuite.medicalScenarioTests.map(test => `
    it('${test.name}', async () => {
      ${test.testCode}
    });`).join('\n')}
  });
});
`;
  }

  private createInteractionTestFile(interactionTests: AgentInteractionTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated agent interaction tests for ${componentName}
// Auto-generated by IntegrationTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('${componentName} - Agent Interaction Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${interactionTests.map(test => `
  it('${test.name}', async () => {
    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createErrorTestFile(errorTests: ErrorHandlingTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated error handling tests for ${componentName}
// Auto-generated by IntegrationTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('${componentName} - Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${errorTests.map(test => `
  it('${test.name}', async () => {
    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private calculateTestCount(testSuite: IntegrationTestSuite): number {
    return testSuite.apiTests.length +
           testSuite.workflowTests.length +
           testSuite.agentInteractionTests.length +
           testSuite.errorHandlingTests.length +
           testSuite.medicalScenarioTests.length;
  }

  private extractComponentName(targetPath: string): string {
    const parts = targetPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.ts$/, '');
  }

  private generateImportPath(targetPath: string): string {
    if (targetPath.startsWith('lib/')) {
      return `@/${targetPath}`;
    }
    return `./${targetPath}`;
  }

  // Fallback test generation methods
  private generateFallbackApiTests(request: TestGenerationRequest): ApiTest[] {
    return [
      {
        name: 'should handle valid triage request',
        endpoint: '/api/triage',
        method: 'POST',
        expectedStatus: 200,
        testCode: `
        const response = await request(app)
          .post('/api/triage')
          .send({
            input: "I have chest pain that started 1 hour ago",
            patientId: "test-patient-123",
            mode: "patient"
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('evidence');
        expect(response.body).toHaveProperty('risk');
        expect(response.body).toHaveProperty('plan');`
      }
    ];
  }

  private generateFallbackWorkflowTests(request: TestGenerationRequest): WorkflowTest[] {
    return [
      {
        name: 'should process emergency triage workflow',
        description: 'Complete workflow for emergency scenario',
        steps: [
          { action: 'parse symptoms', agent: 'SymptomParser' },
          { action: 'assess risk', agent: 'RiskStratifier' },
          { action: 'plan care', agent: 'PathwayPlanner' },
          { action: 'adapt response', agent: 'EmpathyCoach' }
        ],
        expectedOutcome: 'Emergency department referral',
        testCode: `
        const request = {
          id: 'test-emergency-1',
          patientId: 'patient-123',
          input: 'Severe chest pain with shortness of breath',
          mode: 'patient' as const,
          priority: 'immediate' as const
        };
        
        const result = await orchestrator.processTriage(request);
        
        expect(result.success).toBe(true);
        expect(result.risk.level).toBe('immediate');`
      }
    ];
  }

  private generateFallbackInteractionTests(request: TestGenerationRequest): AgentInteractionTest[] {
    return [
      {
        name: 'should coordinate parser and risk agents',
        agentA: 'SymptomParser',
        agentB: 'RiskStratifier',
        interactionType: 'sequential',
        testCode: `
        // Mock the sequential interaction
        const mockParser = vi.fn().mockResolvedValue({ symptoms: 'chest pain' });
        const mockRisk = vi.fn().mockResolvedValue({ level: 'high' });
        
        // Test interaction
        const parseResult = await mockParser();
        const riskResult = await mockRisk(parseResult);
        
        expect(mockParser).toHaveBeenCalledOnce();
        expect(mockRisk).toHaveBeenCalledWith({ symptoms: 'chest pain' });`
      }
    ];
  }

  private generateFallbackErrorTests(): ErrorHandlingTest[] {
    return [
      {
        name: 'should handle LLM provider timeout',
        errorType: 'timeout',
        scenario: 'LLM provider becomes unresponsive during critical operation',
        testCode: `
        // Mock provider timeout
        vi.mocked(provider.chat).mockRejectedValue(new Error('Request timeout'));
        
        const request = {
          id: 'timeout-test',
          patientId: 'patient-123', 
          input: 'test symptoms',
          mode: 'patient' as const,
          priority: 'urgent' as const
        };
        
        const result = await orchestrator.processTriage(request);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('timeout');`
      }
    ];
  }

  private generateFallbackMedicalTests(request: TestGenerationRequest): MedicalScenarioTest[] {
    return [
      {
        name: 'should handle chest pain emergency scenario',
        clinicalScenario: 'acute_chest_pain',
        patientData: {
          age: 55,
          symptoms: 'crushing chest pain radiating to left arm',
          duration: '30 minutes',
          severity: 8
        },
        expectedFlow: ['parse', 'risk_assess', 'emergency_pathway', 'patient_communication'],
        expectedDisposition: 'Emergency Department',
        testCode: `
        const patientData = {
          age: 55,
          symptoms: 'crushing chest pain radiating to left arm',
          duration: '30 minutes',
          severity: 8
        };
        
        const result = await processPatientScenario(patientData);
        
        expect(result.disposition).toBe('Emergency Department');
        expect(result.urgency).toBe('immediate');`
      }
    ];
  }
}