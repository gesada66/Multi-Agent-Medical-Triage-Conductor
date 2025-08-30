import { LlmProvider, ChatMessage } from '@/lib/adapters/llm/types';
import { TestGenerationRequest, TestGenerationResult } from '../TestingOrchestrator';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { logger } from '@/lib/logger';

interface UnitTestTemplate {
  imports: string[];
  mocks: string[];
  testCases: TestCase[];
  setup: string[];
  teardown: string[];
}

interface TestCase {
  name: string;
  description: string;
  category: 'happy-path' | 'edge-case' | 'error-handling' | 'medical-scenario';
  code: string;
  medicalContext?: {
    scenario: string;
    riskLevel: string;
    expectedBehavior: string;
  };
}

export class UnitTestGenerator {
  private provider: LlmProvider;
  private testTemplates: Map<string, UnitTestTemplate> = new Map();
  
  constructor(provider: LlmProvider) {
    this.provider = provider;
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Base template for Vitest with medical context
    this.testTemplates.set('vitest-medical', {
      imports: [
        "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';",
        "import { faker } from '@faker-js/faker';",
      ],
      mocks: [
        "const mockLlmProvider = vi.fn();",
        "const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };"
      ],
      testCases: [],
      setup: ["beforeEach(() => { vi.clearAllMocks(); });"],
      teardown: ["afterEach(() => { vi.restoreAllMocks(); });"]
    });
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating unit tests', {
        requestId: request.id,
        target: request.target,
        medicalContext: request.medicalContext
      });

      // Read source file to analyze
      const sourceCode = await this.readSourceFile(request.target);
      
      // Generate comprehensive test plan
      const testPlan = await this.generateTestPlan(sourceCode, request);
      
      // Generate individual test cases
      const testCases = await this.generateTestCases(testPlan, request);
      
      // Create complete test file
      const testFile = this.createTestFile(testCases, request);
      
      // Write test files
      const filesGenerated = await this.writeTestFiles(testFile, request);
      
      const testCount = testCases.length;
      
      logger.info('Unit tests generated successfully', {
        requestId: request.id,
        testCount,
        filesGenerated: filesGenerated.length
      });

      return {
        requestId: request.id,
        type: 'unit',
        target: request.target,
        success: true,
        filesGenerated,
        testCount,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Unit test generation failed', {
        requestId: request.id,
        error: error.message
      });

      return {
        requestId: request.id,
        type: 'unit',
        target: request.target,
        success: false,
        filesGenerated: [],
        testCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async readSourceFile(targetPath: string): Promise<string> {
    const possiblePaths = [
      `${targetPath}.ts`,
      `${targetPath}/index.ts`,
      targetPath
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return readFileSync(path, 'utf-8');
      }
    }

    throw new Error(`Source file not found: ${targetPath}`);
  }

  private async generateTestPlan(
    sourceCode: string, 
    request: TestGenerationRequest
  ): Promise<{
    componentName: string;
    methods: string[];
    dependencies: string[];
    testScenarios: string[];
    medicalScenarios?: string[];
  }> {
    const planningPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a senior test architect specializing in medical software testing. Analyze TypeScript code and generate comprehensive test plans.

MEDICAL TESTING REQUIREMENTS:
- All medical agents must be tested with clinical scenarios
- Risk stratification logic requires edge case testing
- Patient safety scenarios are mandatory
- Error handling for medical data is critical
- Performance testing for batch processing

ANALYSIS FRAMEWORK:
1. Extract all public methods and their signatures
2. Identify dependencies and their interfaces
3. Determine medical domain logic and safety-critical paths
4. Plan test scenarios for each method
5. Include edge cases and error conditions
6. Consider medical compliance and validation

Return JSON format with componentName, methods, dependencies, testScenarios, and medicalScenarios arrays.`
      },
      {
        role: 'user',
        content: `Analyze this TypeScript component for comprehensive unit testing:

TARGET: ${request.target}
MEDICAL CONTEXT: ${JSON.stringify(request.medicalContext)}

SOURCE CODE:
\`\`\`typescript
${sourceCode}
\`\`\`

Generate a detailed test plan with medical-grade validation scenarios.`
      }
    ];

    const response = await this.provider.chat(planningPrompt, { temperature: 0.1 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Failed to parse test plan: ${error.message}`);
    }
  }

  private async generateTestCases(
    testPlan: any,
    request: TestGenerationRequest
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];
    
    // Generate basic method tests
    for (const method of testPlan.methods || []) {
      const methodTests = await this.generateMethodTests(method, testPlan, request);
      testCases.push(...methodTests);
    }

    // Generate medical scenario tests
    if (request.medicalContext && testPlan.medicalScenarios) {
      const medicalTests = await this.generateMedicalScenarioTests(testPlan, request);
      testCases.push(...medicalTests);
    }

    // Generate error handling tests
    const errorTests = await this.generateErrorHandlingTests(testPlan, request);
    testCases.push(...errorTests);

    return testCases;
  }

  private async generateMethodTests(
    method: string,
    testPlan: any,
    request: TestGenerationRequest
  ): Promise<TestCase[]> {
    const methodTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive unit tests for a specific method in a medical triage system.

TESTING PATTERNS FOR MEDICAL SOFTWARE:
1. Happy path with valid medical data
2. Boundary conditions (edge cases)
3. Invalid input validation
4. Error propagation and handling
5. Medical compliance scenarios
6. Performance under medical load

Generate Vitest test cases with:
- Clear test names describing the scenario
- Proper mocking of dependencies
- Medical data validation
- Edge case coverage
- Error condition testing

Return as JSON array of test cases with name, description, category, and code fields.`
      },
      {
        role: 'user',
        content: `Generate unit tests for method: ${method}

Component: ${testPlan.componentName}
Dependencies: ${JSON.stringify(testPlan.dependencies)}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on medical-grade validation and safety scenarios.`
      }
    ];

    const response = await this.provider.chat(methodTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse method tests, using fallback', { method, error: error.message });
      return this.generateFallbackMethodTests(method);
    }
  }

  private async generateMedicalScenarioTests(
    testPlan: any,
    request: TestGenerationRequest
  ): Promise<TestCase[]> {
    if (!request.medicalContext?.clinicalScenarios) return [];

    const medicalTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate medical scenario-specific unit tests for a healthcare triage system.

CLINICAL TEST SCENARIOS:
- Red flag symptoms requiring immediate attention
- Routine symptoms with standard processing
- Edge cases in symptom parsing and interpretation  
- Multi-symptom combinations
- Patient safety validation
- Clinical decision logic verification

MEDICAL DATA REQUIREMENTS:
- Use realistic but synthetic patient data
- Include various age groups and demographics
- Test different severity levels and combinations
- Validate proper risk stratification
- Ensure appropriate care pathway selection

Return JSON array with medical test cases including medicalContext for each test.`
      },
      {
        role: 'user',
        content: `Generate medical scenario tests for: ${testPlan.componentName}

Clinical Scenarios: ${JSON.stringify(request.medicalContext.clinicalScenarios)}
Risk Levels: ${JSON.stringify(request.medicalContext.riskLevels)}
Agent Type: ${request.medicalContext.agentType}

Create realistic medical test scenarios with proper validation.`
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

  private async generateErrorHandlingTests(
    testPlan: any,
    request: TestGenerationRequest
  ): Promise<TestCase[]> {
    const errorTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive error handling tests for medical software.

ERROR SCENARIOS FOR MEDICAL SYSTEMS:
1. Network failures during critical operations
2. Invalid or corrupted medical data
3. LLM provider errors or timeouts
4. Resource exhaustion under high load
5. Invalid patient data formats
6. Missing required medical information
7. System failures during emergency processing

SAFETY REQUIREMENTS:
- Never fail silently on medical data
- Always provide appropriate error messages
- Ensure graceful degradation
- Maintain audit trails for failures
- Protect patient data integrity

Return JSON array of error test cases with proper exception testing.`
      },
      {
        role: 'user',
        content: `Generate error handling tests for: ${testPlan.componentName}

Dependencies: ${JSON.stringify(testPlan.dependencies)}
Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on patient safety and medical data integrity.`
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

  private createTestFile(testCases: TestCase[], request: TestGenerationRequest): string {
    const template = this.testTemplates.get('vitest-medical')!;
    const componentName = this.extractComponentName(request.target);
    const importPath = this.generateImportPath(request.target);

    let testFile = `// Generated unit tests for ${componentName}
// Auto-generated by UnitTestGenerator - Medical Triage System
// Target: ${request.target}
// Generated: ${new Date().toISOString()}

${template.imports.join('\n')}
import { ${componentName} } from '${importPath}';

${template.mocks.join('\n')}

describe('${componentName}', () => {
  ${template.setup.join('\n  ')}
  ${template.teardown.join('\n  ')}

`;

    // Group tests by category
    const categories = ['happy-path', 'edge-case', 'error-handling', 'medical-scenario'] as const;
    
    for (const category of categories) {
      const categoryTests = testCases.filter(test => test.category === category);
      if (categoryTests.length === 0) continue;

      testFile += `  describe('${category.replace('-', ' ')}', () => {
`;
      
      for (const test of categoryTests) {
        testFile += `    it('${test.name}', ${test.code});

`;
      }
      
      testFile += `  });

`;
    }

    testFile += `});
`;

    return testFile;
  }

  private async writeTestFiles(
    testContent: string,
    request: TestGenerationRequest
  ): Promise<string[]> {
    const componentName = this.extractComponentName(request.target);
    const testDir = 'tests/unit';
    const testFileName = `${componentName}.test.ts`;
    const testFilePath = join(testDir, testFileName);

    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Write test file
    writeFileSync(testFilePath, testContent, 'utf-8');

    logger.info('Test file written', {
      filePath: testFilePath,
      size: testContent.length
    });

    return [testFilePath];
  }

  private extractComponentName(targetPath: string): string {
    const parts = targetPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.ts$/, '');
  }

  private generateImportPath(targetPath: string): string {
    // Convert target path to relative import
    if (targetPath.startsWith('lib/')) {
      return `@/${targetPath}`;
    }
    return `./${targetPath}`;
  }

  // Fallback test generation methods
  private generateFallbackMethodTests(method: string): TestCase[] {
    return [
      {
        name: `should execute ${method} successfully`,
        description: `Basic functionality test for ${method}`,
        category: 'happy-path',
        code: `async () => {
          // Arrange
          const instance = new ComponentUnderTest();
          
          // Act
          const result = await instance.${method}();
          
          // Assert
          expect(result).toBeDefined();
        }`
      },
      {
        name: `should handle ${method} errors gracefully`,
        description: `Error handling test for ${method}`,
        category: 'error-handling',
        code: `async () => {
          // Arrange
          const instance = new ComponentUnderTest();
          
          // Act & Assert
          await expect(instance.${method}()).rejects.toThrow();
        }`
      }
    ];
  }

  private generateFallbackMedicalTests(request: TestGenerationRequest): TestCase[] {
    return [
      {
        name: 'should handle medical emergency scenarios',
        description: 'Test critical medical scenario processing',
        category: 'medical-scenario',
        code: `async () => {
          // Arrange
          const emergencyScenario = {
            symptoms: "severe chest pain",
            duration: "30 minutes",
            severity: 9
          };
          
          // Act
          const result = await processScenario(emergencyScenario);
          
          // Assert
          expect(result.priority).toBe('immediate');
        }`,
        medicalContext: {
          scenario: 'emergency_triage',
          riskLevel: 'immediate',
          expectedBehavior: 'fast_track_processing'
        }
      }
    ];
  }

  private generateFallbackErrorTests(): TestCase[] {
    return [
      {
        name: 'should handle network failures gracefully',
        description: 'Test system behavior during network issues',
        category: 'error-handling',
        code: `async () => {
          // Arrange
          vi.mocked(mockLlmProvider).mockRejectedValue(new Error('Network timeout'));
          
          // Act & Assert
          await expect(processRequest()).rejects.toThrow('Network timeout');
        }`
      }
    ];
  }
}