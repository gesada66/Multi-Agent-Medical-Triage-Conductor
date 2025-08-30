import { LlmProvider, ChatMessage } from '@/lib/adapters/llm/types';
import { TestGenerationRequest, TestGenerationResult } from '../TestingOrchestrator';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

interface ContractTestSuite {
  consumerTests: ConsumerContractTest[];
  providerTests: ProviderContractTest[];
  apiSchemaTests: ApiSchemaTest[];
  medicalDataContracts: MedicalDataContractTest[];
}

interface ConsumerContractTest {
  name: string;
  service: string;
  interaction: string;
  given: string;
  uponReceiving: string;
  withRequest: PactRequest;
  willRespondWith: PactResponse;
  testCode: string;
}

interface ProviderContractTest {
  name: string;
  service: string;
  interaction: string;
  testCode: string;
  verificationStates: string[];
}

interface ApiSchemaTest {
  name: string;
  endpoint: string;
  method: string;
  requestSchema: any;
  responseSchema: any;
  testCode: string;
}

interface MedicalDataContractTest {
  name: string;
  dataType: 'symptoms' | 'risk_assessment' | 'care_plan' | 'patient_data';
  schema: any;
  validationRules: string[];
  testCode: string;
}

interface PactRequest {
  method: string;
  path: string;
  headers?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
}

interface PactResponse {
  status: number;
  headers?: Record<string, any>;
  body?: any;
}

export class ContractTestAgent {
  private provider: LlmProvider;
  
  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating contract tests', {
        requestId: request.id,
        target: request.target,
        scope: request.scope
      });

      // Read existing schemas and interfaces
      const contractInfo = await this.analyzeContractTargets(request);
      
      // Generate comprehensive contract test suite
      const testSuite = await this.generateContractTestSuite(contractInfo, request);
      
      // Create test files and Pact specifications
      const filesGenerated = await this.writeContractTests(testSuite, request);
      
      // Calculate test count
      const testCount = this.calculateTestCount(testSuite);
      
      logger.info('Contract tests generated successfully', {
        requestId: request.id,
        testCount,
        filesGenerated: filesGenerated.length
      });

      return {
        requestId: request.id,
        type: 'contract',
        target: request.target,
        success: true,
        filesGenerated,
        testCount,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Contract test generation failed', {
        requestId: request.id,
        error: error.message
      });

      return {
        requestId: request.id,
        type: 'contract',
        target: request.target,
        success: false,
        filesGenerated: [],
        testCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async analyzeContractTargets(request: TestGenerationRequest): Promise<{
    interfaces: string[];
    schemas: any;
    endpoints: string[];
    medicalDataTypes: string[];
  }> {
    const analysisPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Analyze TypeScript code to identify contract testing targets for a medical triage system.

CONTRACT ANALYSIS AREAS:
1. API interfaces and their contracts
2. Data schemas (Zod, JSON Schema, etc.)
3. REST endpoints and their request/response formats
4. LLM provider interfaces
5. Medical data structures and validation rules
6. Inter-service communication contracts

MEDICAL CONTRACT REQUIREMENTS:
- Patient data schemas with HIPAA compliance
- Clinical evidence data structures
- Risk assessment response formats
- Care pathway recommendation schemas
- Emergency escalation protocols
- Cost optimization tracking interfaces

Return JSON with interfaces, schemas, endpoints, and medicalDataTypes arrays.`
      },
      {
        role: 'user',
        content: `Analyze contract targets for: ${request.target}

Target details: ${JSON.stringify(request)}

Identify all contractual boundaries requiring Pact testing.`
      }
    ];

    const response = await this.provider.chat(analysisPrompt, { temperature: 0.1 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse contract analysis, using defaults', { error: error.message });
      return {
        interfaces: ['LlmProvider', 'TriageRequest', 'TriageResponse'],
        schemas: {},
        endpoints: ['/api/triage', '/api/health'],
        medicalDataTypes: ['symptoms', 'risk_assessment', 'care_plan']
      };
    }
  }

  private async generateContractTestSuite(
    contractInfo: any,
    request: TestGenerationRequest
  ): Promise<ContractTestSuite> {
    const suite: ContractTestSuite = {
      consumerTests: [],
      providerTests: [],
      apiSchemaTests: [],
      medicalDataContracts: []
    };

    // Generate consumer contract tests
    suite.consumerTests = await this.generateConsumerTests(contractInfo, request);
    
    // Generate provider contract tests
    suite.providerTests = await this.generateProviderTests(contractInfo, request);
    
    // Generate API schema validation tests
    suite.apiSchemaTests = await this.generateApiSchemaTests(contractInfo, request);
    
    // Generate medical data contract tests
    suite.medicalDataContracts = await this.generateMedicalDataContractTests(contractInfo, request);

    return suite;
  }

  private async generateConsumerTests(
    contractInfo: any,
    request: TestGenerationRequest
  ): Promise<ConsumerContractTest[]> {
    const consumerTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate Pact consumer contract tests for medical triage system services.

PACT CONSUMER TESTING:
- Define expected interactions with external services
- Specify request/response contracts
- Include medical data validation requirements
- Test error scenarios and edge cases
- Define provider states for different scenarios

MEDICAL CONSUMER CONTRACTS:
- LLM provider interactions for triage processing
- FHIR repository operations for patient data
- Vector store operations for clinical knowledge
- Emergency notification service contracts
- Audit logging service interactions

Use @pact-foundation/pact library syntax. Return JSON array of consumer contract test objects.`
      },
      {
        role: 'user',
        content: `Generate consumer contract tests for: ${request.target}

Interfaces: ${JSON.stringify(contractInfo.interfaces)}
Endpoints: ${JSON.stringify(contractInfo.endpoints)}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on external service interactions and medical data contracts.`
      }
    ];

    const response = await this.provider.chat(consumerTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse consumer tests, using fallback', { error: error.message });
      return this.generateFallbackConsumerTests(request);
    }
  }

  private async generateProviderTests(
    contractInfo: any,
    request: TestGenerationRequest
  ): Promise<ProviderContractTest[]> {
    const providerTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate Pact provider contract verification tests for medical triage system.

PACT PROVIDER VERIFICATION:
- Verify service can fulfill consumer expectations
- Set up provider states for different scenarios
- Handle medical data validation scenarios
- Test error conditions and edge cases
- Verify security and compliance requirements

MEDICAL PROVIDER VERIFICATION:
- Triage API endpoint verification
- Medical data validation and sanitization
- Emergency escalation pathway verification
- Audit logging compliance verification
- Cost optimization service verification

Return JSON array of provider verification test objects.`
      },
      {
        role: 'user',
        content: `Generate provider verification tests for: ${request.target}

Interfaces: ${JSON.stringify(contractInfo.interfaces)}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on medical API contract verification and compliance.`
      }
    ];

    const response = await this.provider.chat(providerTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse provider tests, using fallback', { error: error.message });
      return this.generateFallbackProviderTests(request);
    }
  }

  private async generateApiSchemaTests(
    contractInfo: any,
    request: TestGenerationRequest
  ): Promise<ApiSchemaTest[]> {
    const schemaTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate API schema validation tests for medical triage system contracts.

API SCHEMA TESTING:
- Validate request/response schemas using Zod
- Test medical data structure compliance
- Verify required field validation
- Test data type enforcement
- Check medical data safety constraints

MEDICAL API SCHEMAS:
- Triage request schema validation
- Clinical evidence response validation
- Risk assessment data structures
- Care pathway recommendation formats
- Patient data privacy compliance
- Emergency escalation data schemas

Return JSON array of API schema test objects with Zod validation.`
      },
      {
        role: 'user',
        content: `Generate API schema tests for: ${request.target}

Endpoints: ${JSON.stringify(contractInfo.endpoints)}
Schemas: ${JSON.stringify(contractInfo.schemas)}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on medical data validation and schema compliance.`
      }
    ];

    const response = await this.provider.chat(schemaTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse schema tests, using fallback', { error: error.message });
      return this.generateFallbackSchemaTests(request);
    }
  }

  private async generateMedicalDataContractTests(
    contractInfo: any,
    request: TestGenerationRequest
  ): Promise<MedicalDataContractTest[]> {
    const medicalContractPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate medical data contract tests for healthcare triage system.

MEDICAL DATA CONTRACT TESTING:
- Validate clinical evidence data structures
- Test symptom parsing output schemas
- Verify risk assessment data formats
- Check care pathway recommendation contracts
- Validate patient safety data requirements
- Test medical compliance constraints

HEALTHCARE DATA REQUIREMENTS:
- FHIR compatibility where applicable
- SNOMED-CT code validation
- ICD-10 classification support
- Medical severity scoring validation
- Clinical decision support data integrity
- Audit trail data completeness

Return JSON array of medical data contract test objects.`
      },
      {
        role: 'user',
        content: `Generate medical data contract tests for: ${request.target}

Medical Data Types: ${JSON.stringify(contractInfo.medicalDataTypes)}
Clinical Scenarios: ${JSON.stringify(request.medicalContext?.clinicalScenarios)}

Focus on clinical data validation and medical compliance.`
      }
    ];

    const response = await this.provider.chat(medicalContractPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse medical contract tests, using fallback', { error: error.message });
      return this.generateFallbackMedicalContractTests(request);
    }
  }

  private async writeContractTests(
    testSuite: ContractTestSuite,
    request: TestGenerationRequest
  ): Promise<string[]> {
    const filesGenerated: string[] = [];
    const testDir = 'tests/contract';
    
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const componentName = this.extractComponentName(request.target);

    // Generate consumer contract tests
    if (testSuite.consumerTests.length > 0) {
      const consumerTestFile = this.createConsumerTestFile(testSuite.consumerTests, request);
      const consumerFilePath = join(testDir, `${componentName}.consumer.test.ts`);
      writeFileSync(consumerFilePath, consumerTestFile, 'utf-8');
      filesGenerated.push(consumerFilePath);
    }

    // Generate provider verification tests
    if (testSuite.providerTests.length > 0) {
      const providerTestFile = this.createProviderTestFile(testSuite.providerTests, request);
      const providerFilePath = join(testDir, `${componentName}.provider.test.ts`);
      writeFileSync(providerFilePath, providerTestFile, 'utf-8');
      filesGenerated.push(providerFilePath);
    }

    // Generate API schema tests
    if (testSuite.apiSchemaTests.length > 0) {
      const schemaTestFile = this.createSchemaTestFile(testSuite.apiSchemaTests, request);
      const schemaFilePath = join(testDir, `${componentName}.schema.test.ts`);
      writeFileSync(schemaFilePath, schemaTestFile, 'utf-8');
      filesGenerated.push(schemaFilePath);
    }

    // Generate medical data contract tests
    if (testSuite.medicalDataContracts.length > 0) {
      const medicalTestFile = this.createMedicalContractTestFile(testSuite.medicalDataContracts, request);
      const medicalFilePath = join(testDir, `${componentName}.medical-contracts.test.ts`);
      writeFileSync(medicalTestFile, medicalTestFile, 'utf-8');
      filesGenerated.push(medicalFilePath);
    }

    // Generate Pact configuration
    const pactConfig = this.createPactConfiguration(request);
    const pactConfigPath = join(testDir, 'pact.config.js');
    writeFileSync(pactConfigPath, pactConfig, 'utf-8');
    filesGenerated.push(pactConfigPath);

    logger.info('Contract test files written', {
      filesGenerated: filesGenerated.length,
      totalTests: this.calculateTestCount(testSuite)
    });

    return filesGenerated;
  }

  private createConsumerTestFile(consumerTests: ConsumerContractTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated consumer contract tests for ${componentName}
// Auto-generated by ContractTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { Pact } from '@pact-foundation/pact';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';

describe('${componentName} - Consumer Contract Tests', () => {
  let provider: Pact;

  beforeAll(async () => {
    provider = new Pact({
      consumer: 'triage-system',
      provider: 'medical-triage-api',
      port: 3001,
      log: path.resolve(process.cwd(), 'logs', 'pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
      spec: 2,
    });

    await provider.setup();
  });

  beforeEach(async () => {
    await provider.removeInteractions();
  });

  afterAll(async () => {
    await provider.finalize();
  });

${consumerTests.map(test => `
  it('${test.name}', async () => {
    // Setup interaction expectation
    await provider.addInteraction({
      state: '${test.given}',
      uponReceiving: '${test.uponReceiving}',
      withRequest: ${JSON.stringify(test.withRequest, null, 6)},
      willRespondWith: ${JSON.stringify(test.willRespondWith, null, 6)},
    });

    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createProviderTestFile(providerTests: ProviderContractTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated provider contract verification tests for ${componentName}
// Auto-generated by ContractTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { Verifier } from '@pact-foundation/pact';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '@/app';

describe('${componentName} - Provider Contract Verification', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    // Setup test server
    app = await createApp();
    server = app.listen(3002);
  });

  afterAll(async () => {
    await server?.close();
  });

${providerTests.map(test => `
  it('${test.name}', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3002',
      pactUrls: ['./pacts/triage-system-${test.service}.json'],
      providerVersion: '1.0.0',
      providerStatesSetupUrl: 'http://localhost:3002/_pact/provider_states',
    });

    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createSchemaTestFile(schemaTests: ApiSchemaTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated API schema validation tests for ${componentName}
// Auto-generated by ContractTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('${componentName} - API Schema Tests', () => {
${schemaTests.map(test => `
  it('${test.name}', () => {
    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createMedicalContractTestFile(medicalTests: MedicalDataContractTest[], request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);

    return `// Generated medical data contract tests for ${componentName}
// Auto-generated by ContractTestAgent - Medical Triage System
// Generated: ${new Date().toISOString()}

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('${componentName} - Medical Data Contract Tests', () => {
${medicalTests.map(test => `
  it('${test.name}', () => {
    ${test.testCode}
  });`).join('\n')}
});
`;
  }

  private createPactConfiguration(request: TestGenerationRequest): string {
    return `// Pact configuration for medical triage system
// Auto-generated by ContractTestAgent
// Generated: ${new Date().toISOString()}

module.exports = {
  // Consumer configuration
  consumer: 'triage-system',
  
  // Provider configuration
  providers: [
    'medical-triage-api',
    'llm-provider-service',
    'fhir-repository-service',
    'vector-store-service'
  ],
  
  // Test configuration
  logLevel: 'INFO',
  logDir: './logs',
  pactDir: './pacts',
  
  // Medical-specific configuration
  medicalCompliance: {
    hipaaLogging: true,
    patientDataRedaction: true,
    auditTrail: true
  },
  
  // Broker configuration (if using Pact Broker)
  broker: {
    url: process.env.PACT_BROKER_URL || 'http://localhost:9292',
    token: process.env.PACT_BROKER_TOKEN,
    publishVerificationResult: true,
    providerVersion: process.env.GIT_SHA || '1.0.0',
    consumerVersion: process.env.GIT_SHA || '1.0.0'
  }
};
`;
  }

  private calculateTestCount(testSuite: ContractTestSuite): number {
    return testSuite.consumerTests.length +
           testSuite.providerTests.length +
           testSuite.apiSchemaTests.length +
           testSuite.medicalDataContracts.length;
  }

  private extractComponentName(targetPath: string): string {
    const parts = targetPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.ts$/, '');
  }

  // Fallback test generation methods
  private generateFallbackConsumerTests(request: TestGenerationRequest): ConsumerContractTest[] {
    return [
      {
        name: 'should interact with LLM provider for triage processing',
        service: 'llm-provider',
        interaction: 'triage-chat-request',
        given: 'LLM provider is available',
        uponReceiving: 'a triage chat request',
        withRequest: {
          method: 'POST',
          path: '/v1/messages',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: 'chest pain symptoms' }],
            max_tokens: 4000
          }
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            content: [{ type: 'text', text: '{"symptoms": "chest pain", "severity": "high"}' }],
            usage: { input_tokens: 50, output_tokens: 30 }
          }
        },
        testCode: `
        // Execute API call to provider
        const response = await fetch('http://localhost:3001/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: 'chest pain symptoms' }],
            max_tokens: 4000
          })
        });
        
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.content[0].text).toContain('chest pain');`
      }
    ];
  }

  private generateFallbackProviderTests(request: TestGenerationRequest): ProviderContractTest[] {
    return [
      {
        name: 'should verify triage API contract',
        service: 'medical-triage-api',
        interaction: 'triage-request',
        verificationStates: ['patient data available', 'LLM provider available'],
        testCode: `
        await verifier.verifyProvider().then(() => {
          console.log('Provider verification successful');
        }).catch((error) => {
          throw new Error('Provider verification failed: ' + error.message);
        });`
      }
    ];
  }

  private generateFallbackSchemaTests(request: TestGenerationRequest): ApiSchemaTest[] {
    return [
      {
        name: 'should validate triage request schema',
        endpoint: '/api/triage',
        method: 'POST',
        requestSchema: {},
        responseSchema: {},
        testCode: `
        const triageRequestSchema = z.object({
          input: z.string().min(1).max(2000),
          patientId: z.string().uuid(),
          mode: z.enum(['patient', 'clinician'])
        });
        
        const validRequest = {
          input: "I have chest pain",
          patientId: "550e8400-e29b-41d4-a716-446655440000",
          mode: "patient"
        };
        
        expect(() => triageRequestSchema.parse(validRequest)).not.toThrow();`
      }
    ];
  }

  private generateFallbackMedicalContractTests(request: TestGenerationRequest): MedicalDataContractTest[] {
    return [
      {
        name: 'should validate clinical evidence data contract',
        dataType: 'symptoms',
        schema: {},
        validationRules: ['required symptoms field', 'severity range 1-10', 'valid SNOMED codes'],
        testCode: `
        const clinicalEvidenceSchema = z.object({
          symptoms: z.array(z.string()).min(1),
          severity: z.number().min(1).max(10),
          onset: z.string(),
          duration: z.string(),
          associatedSymptoms: z.array(z.string()).optional(),
          redFlags: z.array(z.string()).optional()
        });
        
        const validEvidence = {
          symptoms: ["chest pain", "shortness of breath"],
          severity: 8,
          onset: "sudden",
          duration: "30 minutes"
        };
        
        expect(() => clinicalEvidenceSchema.parse(validEvidence)).not.toThrow();`
      }
    ];
  }
}