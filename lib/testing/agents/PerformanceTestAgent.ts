import { LlmProvider, ChatMessage } from '@/lib/adapters/llm/types';
import { TestGenerationRequest, TestGenerationResult } from '../TestingOrchestrator';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

interface PerformanceTestSuite {
  loadTests: LoadTest[];
  stressTests: StressTest[];
  spikeTests: SpikeTest[];
  medicalScenarioTests: MedicalLoadTest[];
  costOptimizationTests: CostOptimizationTest[];
}

interface LoadTest {
  name: string;
  description: string;
  scenario: string;
  duration: string;
  targetRPS: number;
  maxResponseTime: number;
  k6Script: string;
}

interface StressTest {
  name: string;
  description: string;
  scenario: string;
  rampUpDuration: string;
  steadyDuration: string;
  rampDownDuration: string;
  maxVUs: number;
  k6Script: string;
}

interface SpikeTest {
  name: string;
  description: string;
  scenario: string;
  baselineVUs: number;
  spikeVUs: number;
  spikeDuration: string;
  k6Script: string;
}

interface MedicalLoadTest {
  name: string;
  clinicalScenario: string;
  emergencyLoad: boolean;
  patientMix: {
    immediate: number;
    urgent: number;
    routine: number;
    batch: number;
  };
  expectedPerformance: {
    immediate: { maxLatency: number; availability: number };
    urgent: { maxLatency: number; availability: number };
    routine: { maxLatency: number; availability: number };
  };
  k6Script: string;
}

interface CostOptimizationTest {
  name: string;
  optimizationType: 'caching' | 'batching' | 'smart_routing' | 'model_selection';
  baselineScenario: string;
  optimizedScenario: string;
  expectedSavings: number;
  k6Script: string;
}

export class PerformanceTestAgent {
  private provider: LlmProvider;
  
  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating performance tests', {
        requestId: request.id,
        target: request.target,
        medicalContext: request.medicalContext
      });

      // Generate comprehensive performance test suite
      const testSuite = await this.generatePerformanceTestSuite(request);
      
      // Create k6 test scripts and configuration
      const filesGenerated = await this.writePerformanceTests(testSuite, request);
      
      // Calculate test count
      const testCount = this.calculateTestCount(testSuite);
      
      logger.info('Performance tests generated successfully', {
        requestId: request.id,
        testCount,
        filesGenerated: filesGenerated.length
      });

      return {
        requestId: request.id,
        type: 'performance',
        target: request.target,
        success: true,
        filesGenerated,
        testCount,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Performance test generation failed', {
        requestId: request.id,
        error: error.message
      });

      return {
        requestId: request.id,
        type: 'performance',
        target: request.target,
        success: false,
        filesGenerated: [],
        testCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async generatePerformanceTestSuite(request: TestGenerationRequest): Promise<PerformanceTestSuite> {
    const suite: PerformanceTestSuite = {
      loadTests: [],
      stressTests: [],
      spikeTests: [],
      medicalScenarioTests: [],
      costOptimizationTests: []
    };

    // Generate load tests
    suite.loadTests = await this.generateLoadTests(request);
    
    // Generate stress tests
    suite.stressTests = await this.generateStressTests(request);
    
    // Generate spike tests for emergency scenarios
    suite.spikeTests = await this.generateSpikeTests(request);
    
    // Generate medical scenario performance tests
    suite.medicalScenarioTests = await this.generateMedicalLoadTests(request);
    
    // Generate cost optimization tests
    suite.costOptimizationTests = await this.generateCostOptimizationTests(request);

    return suite;
  }

  private async generateLoadTests(request: TestGenerationRequest): Promise<LoadTest[]> {
    const loadTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive load testing scenarios for a medical triage system using k6.

LOAD TESTING REQUIREMENTS:
- Normal operational load patterns for medical systems
- Peak hour scenarios (8am-10am, 6pm-8pm)
- Weekend vs weekday load differences
- Seasonal variation (flu season, holiday surges)
- Performance targets for medical-grade systems

MEDICAL LOAD PATTERNS:
- Emergency triage: <2 second response time, 99.9% availability
- Urgent care: <5 second response time, 99.5% availability  
- Routine care: <10 second response time, 99% availability
- Batch processing: <30 second batch completion, 95% availability

K6 SCRIPT REQUIREMENTS:
- Realistic medical data payloads
- Proper HTTP request patterns
- Medical scenario simulation
- Performance threshold validation
- Cost tracking and optimization

Return JSON array of load test objects with complete k6 scripts.`
      },
      {
        role: 'user',
        content: `Generate load tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}
Clinical Scenarios: ${JSON.stringify(request.medicalContext?.clinicalScenarios)}

Focus on medical-grade performance requirements and realistic load patterns.`
      }
    ];

    const response = await this.provider.chat(loadTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse load tests, using fallback', { error: error.message });
      return this.generateFallbackLoadTests(request);
    }
  }

  private async generateStressTests(request: TestGenerationRequest): Promise<StressTest[]> {
    const stressTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate stress testing scenarios for medical triage system breaking points.

STRESS TESTING FOR MEDICAL SYSTEMS:
- Find system limits under extreme load
- Test graceful degradation during overload
- Validate emergency escalation under stress
- Ensure patient safety during system stress
- Test recovery after stress conditions

MEDICAL STRESS SCENARIOS:
- Mass casualty incident simulation
- Pandemic surge testing (10x normal load)
- Regional emergency response simulation
- System failure recovery testing
- Cost optimization under extreme load

STRESS TEST PATTERNS:
- Gradual ramp-up to breaking point
- Sustained high load periods
- Graceful ramp-down and recovery
- Error rate monitoring
- Performance degradation thresholds

Return JSON array of stress test objects with k6 scripts.`
      },
      {
        role: 'user',
        content: `Generate stress tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on medical emergency scenarios and system resilience.`
      }
    ];

    const response = await this.provider.chat(stressTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse stress tests, using fallback', { error: error.message });
      return this.generateFallbackStressTests(request);
    }
  }

  private async generateSpikeTests(request: TestGenerationRequest): Promise<SpikeTest[]> {
    const spikeTestPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate spike testing scenarios for sudden medical emergency surges.

SPIKE TESTING FOR MEDICAL EMERGENCIES:
- Sudden influx of emergency patients
- Breaking news health alerts (food poisoning, accidents)
- Natural disaster response spikes
- Viral social media health scares
- System behavior during traffic spikes

MEDICAL SPIKE CHARACTERISTICS:
- Rapid onset (seconds to minutes)
- High intensity (5-20x normal load)
- Short duration but critical response needed
- Mixed urgency levels in spike traffic
- Cost impact analysis during spikes

SPIKE TEST VALIDATION:
- System remains responsive during spike
- Critical paths maintain performance
- Proper load balancing and scaling
- Cost optimization effectiveness
- Recovery time after spike

Return JSON array of spike test objects with k6 scripts.`
      },
      {
        role: 'user',
        content: `Generate spike tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on emergency response capabilities and system stability.`
      }
    ];

    const response = await this.provider.chat(spikeTestPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse spike tests, using fallback', { error: error.message });
      return this.generateFallbackSpikeTests(request);
    }
  }

  private async generateMedicalLoadTests(request: TestGenerationRequest): Promise<MedicalLoadTest[]> {
    const medicalLoadPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate medical scenario-specific load tests for healthcare triage system.

MEDICAL LOAD TESTING SCENARIOS:
- Emergency department surge simulation
- Primary care overload scenarios  
- Pediatric vs adult patient mix testing
- Mental health crisis load patterns
- Chronic disease management loads

CLINICAL LOAD CHARACTERISTICS:
- Patient urgency distribution (10% immediate, 30% urgent, 60% routine)
- Symptom complexity variation
- Age demographic impacts on processing
- Seasonal illness pattern simulation
- Cost optimization validation under medical load

PERFORMANCE REQUIREMENTS BY URGENCY:
- Immediate: <2s response, 99.9% uptime, bypass queues
- Urgent: <5s response, 99.5% uptime, priority processing
- Routine: <10s response, 99% uptime, batch eligible
- Batch: <30s batch, 95% uptime, cost optimized

Return JSON array of medical load test objects.`
      },
      {
        role: 'user',
        content: `Generate medical load tests for: ${request.target}

Clinical Scenarios: ${JSON.stringify(request.medicalContext?.clinicalScenarios)}
Risk Levels: ${JSON.stringify(request.medicalContext?.riskLevels)}

Create realistic medical load testing scenarios.`
      }
    ];

    const response = await this.provider.chat(medicalLoadPrompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse medical load tests, using fallback', { error: error.message });
      return this.generateFallbackMedicalLoadTests(request);
    }
  }

  private async generateCostOptimizationTests(request: TestGenerationRequest): Promise<CostOptimizationTest[]> {
    const costOptimizationPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate cost optimization performance tests for LLM-based medical triage system.

COST OPTIMIZATION TESTING:
- Prompt caching effectiveness under load
- Batch processing cost savings validation
- Smart model routing (Haiku vs Sonnet) efficiency
- Token usage optimization verification
- Cache hit rate performance impact

OPTIMIZATION SCENARIOS:
- Baseline: No optimizations, individual requests
- Caching: Prompt caching enabled, measure savings
- Batching: Batch processing enabled, cost reduction
- Smart Routing: Model selection optimization
- Combined: All optimizations enabled

COST METRICS TO MEASURE:
- Token usage reduction percentage
- Cache hit rate under load
- Batch processing efficiency
- Model selection accuracy
- Total cost per triage operation

K6 COST TESTING:
- Custom metrics for cost tracking
- Load patterns that maximize savings
- Performance impact of optimizations
- Cost vs performance trade-offs

Return JSON array of cost optimization test objects.`
      },
      {
        role: 'user',
        content: `Generate cost optimization tests for: ${request.target}

Medical Context: ${JSON.stringify(request.medicalContext)}

Focus on LLM cost optimization and performance impact validation.`
      }
    ];

    const response = await this.provider.chat(costOptimizationPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse cost tests, using fallback', { error: error.message });
      return this.generateFallbackCostOptimizationTests(request);
    }
  }

  private async writePerformanceTests(
    testSuite: PerformanceTestSuite,
    request: TestGenerationRequest
  ): Promise<string[]> {
    const filesGenerated: string[] = [];
    const testDir = 'tests/performance';
    
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const componentName = this.extractComponentName(request.target);

    // Generate load test scripts
    for (const [index, test] of testSuite.loadTests.entries()) {
      const scriptPath = join(testDir, `${componentName}-load-${index + 1}.js`);
      writeFileSync(scriptPath, test.k6Script, 'utf-8');
      filesGenerated.push(scriptPath);
    }

    // Generate stress test scripts
    for (const [index, test] of testSuite.stressTests.entries()) {
      const scriptPath = join(testDir, `${componentName}-stress-${index + 1}.js`);
      writeFileSync(scriptPath, test.k6Script, 'utf-8');
      filesGenerated.push(scriptPath);
    }

    // Generate spike test scripts
    for (const [index, test] of testSuite.spikeTests.entries()) {
      const scriptPath = join(testDir, `${componentName}-spike-${index + 1}.js`);
      writeFileSync(scriptPath, test.k6Script, 'utf-8');
      filesGenerated.push(scriptPath);
    }

    // Generate medical scenario test scripts
    for (const [index, test] of testSuite.medicalScenarioTests.entries()) {
      const scriptPath = join(testDir, `${componentName}-medical-${index + 1}.js`);
      writeFileSync(scriptPath, test.k6Script, 'utf-8');
      filesGenerated.push(scriptPath);
    }

    // Generate cost optimization test scripts
    for (const [index, test] of testSuite.costOptimizationTests.entries()) {
      const scriptPath = join(testDir, `${componentName}-cost-${index + 1}.js`);
      writeFileSync(scriptPath, test.k6Script, 'utf-8');
      filesGenerated.push(scriptPath);
    }

    // Generate performance test configuration
    const configFile = this.createPerformanceTestConfig(testSuite, request);
    const configPath = join(testDir, 'performance.config.js');
    writeFileSync(configPath, configFile, 'utf-8');
    filesGenerated.push(configPath);

    // Generate test runner script
    const runnerScript = this.createTestRunnerScript(testSuite, request);
    const runnerPath = join(testDir, 'run-performance-tests.sh');
    writeFileSync(runnerPath, runnerScript, 'utf-8');
    filesGenerated.push(runnerPath);

    logger.info('Performance test files written', {
      filesGenerated: filesGenerated.length,
      totalTests: this.calculateTestCount(testSuite)
    });

    return filesGenerated;
  }

  private createPerformanceTestConfig(testSuite: PerformanceTestSuite, request: TestGenerationRequest): string {
    return `// Performance test configuration for medical triage system
// Auto-generated by PerformanceTestAgent
// Generated: ${new Date().toISOString()}

module.exports = {
  // Environment configuration
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      apiKey: process.env.TEST_API_KEY || 'test-key'
    },
    staging: {
      baseUrl: process.env.STAGING_URL || 'https://staging.triage-system.com',
      apiKey: process.env.STAGING_API_KEY
    },
    production: {
      baseUrl: process.env.PRODUCTION_URL || 'https://api.triage-system.com',
      apiKey: process.env.PRODUCTION_API_KEY
    }
  },

  // Medical performance thresholds
  thresholds: {
    immediate: {
      maxResponseTime: 2000,  // 2 seconds max
      availability: 0.999,    // 99.9% uptime
      errorRate: 0.001        // 0.1% error rate
    },
    urgent: {
      maxResponseTime: 5000,  // 5 seconds max
      availability: 0.995,    // 99.5% uptime
      errorRate: 0.005        // 0.5% error rate
    },
    routine: {
      maxResponseTime: 10000, // 10 seconds max
      availability: 0.99,     // 99% uptime
      errorRate: 0.01         // 1% error rate
    },
    batch: {
      maxBatchTime: 30000,    // 30 seconds max batch
      availability: 0.95,     // 95% uptime
      errorRate: 0.05         // 5% error rate
    }
  },

  // Load test profiles
  loadProfiles: {
    normal: { vus: 10, duration: '5m' },
    peak: { vus: 50, duration: '10m' },
    emergency: { vus: 100, duration: '2m' },
    surge: { vus: 200, duration: '30s' }
  },

  // Cost optimization targets
  costTargets: {
    cacheHitRate: 0.8,      // 80% cache hits
    batchUtilization: 0.6,   // 60% of requests batched
    tokenSavings: 0.5,       // 50% token reduction
    costPerTriage: 0.01      // $0.01 per triage max
  }
};
`;
  }

  private createTestRunnerScript(testSuite: PerformanceTestSuite, request: TestGenerationRequest): string {
    const componentName = this.extractComponentName(request.target);
    
    return `#!/bin/bash
# Performance test runner for medical triage system
# Auto-generated by PerformanceTestAgent
# Generated: ${new Date().toISOString()}

set -e

echo "🏥 Medical Triage System Performance Testing Suite"
echo "Target: ${request.target}"
echo "Generated: ${new Date().toISOString()}"
echo "=============================================="

# Configuration
ENVIRONMENT=\${1:-local}
RESULTS_DIR="./results/performance/\$(date +%Y%m%d_%H%M%S)"
CONFIG_FILE="./tests/performance/performance.config.js"

# Create results directory
mkdir -p "\$RESULTS_DIR"

echo "📊 Starting performance tests for environment: \$ENVIRONMENT"

# Load Tests
echo "🔄 Running Load Tests..."
${testSuite.loadTests.map((test, index) => `
echo "  ▶️  Running: ${test.name}"
k6 run --out json="\$RESULTS_DIR/load-${index + 1}.json" \\
  --env ENVIRONMENT=\$ENVIRONMENT \\
  "./tests/performance/${componentName}-load-${index + 1}.js" || echo "❌ Load test ${index + 1} failed"`).join('')}

# Stress Tests  
echo "💪 Running Stress Tests..."
${testSuite.stressTests.map((test, index) => `
echo "  ▶️  Running: ${test.name}"
k6 run --out json="\$RESULTS_DIR/stress-${index + 1}.json" \\
  --env ENVIRONMENT=\$ENVIRONMENT \\
  "./tests/performance/${componentName}-stress-${index + 1}.js" || echo "❌ Stress test ${index + 1} failed"`).join('')}

# Spike Tests
echo "⚡ Running Spike Tests..."
${testSuite.spikeTests.map((test, index) => `
echo "  ▶️  Running: ${test.name}"
k6 run --out json="\$RESULTS_DIR/spike-${index + 1}.json" \\
  --env ENVIRONMENT=\$ENVIRONMENT \\
  "./tests/performance/${componentName}-spike-${index + 1}.js" || echo "❌ Spike test ${index + 1} failed"`).join('')}

# Medical Scenario Tests
echo "🏥 Running Medical Scenario Tests..."
${testSuite.medicalScenarioTests.map((test, index) => `
echo "  ▶️  Running: ${test.name}"
k6 run --out json="\$RESULTS_DIR/medical-${index + 1}.json" \\
  --env ENVIRONMENT=\$ENVIRONMENT \\
  "./tests/performance/${componentName}-medical-${index + 1}.js" || echo "❌ Medical test ${index + 1} failed"`).join('')}

# Cost Optimization Tests
echo "💰 Running Cost Optimization Tests..."
${testSuite.costOptimizationTests.map((test, index) => `
echo "  ▶️  Running: ${test.name}"
k6 run --out json="\$RESULTS_DIR/cost-${index + 1}.json" \\
  --env ENVIRONMENT=\$ENVIRONMENT \\
  "./tests/performance/${componentName}-cost-${index + 1}.js" || echo "❌ Cost test ${index + 1} failed"`).join('')}

echo "✅ Performance testing completed!"
echo "📊 Results saved to: \$RESULTS_DIR"
echo "🔍 Generate report with: k6-reporter --input='\$RESULTS_DIR/*.json' --output='\$RESULTS_DIR/report.html'"
`;
  }

  private calculateTestCount(testSuite: PerformanceTestSuite): number {
    return testSuite.loadTests.length +
           testSuite.stressTests.length +
           testSuite.spikeTests.length +
           testSuite.medicalScenarioTests.length +
           testSuite.costOptimizationTests.length;
  }

  private extractComponentName(targetPath: string): string {
    const parts = targetPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.ts$/, '');
  }

  // Fallback test generation methods
  private generateFallbackLoadTests(request: TestGenerationRequest): LoadTest[] {
    return [
      {
        name: 'Basic Triage Load Test',
        description: 'Standard operational load for triage API',
        scenario: 'normal_operations',
        duration: '5m',
        targetRPS: 10,
        maxResponseTime: 5000,
        k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export let options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

const errorRate = new Rate('errors');
const triageLatency = new Trend('triage_latency');

export default function () {
  const payload = JSON.stringify({
    input: 'I have chest pain that started 1 hour ago',
    patientId: 'test-patient-' + Math.random().toString(36).substr(2, 9),
    mode: 'patient'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post('\${__ENV.BASE_URL}/api/triage', payload, params);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'has evidence': (r) => JSON.parse(r.body).evidence !== undefined,
  });

  if (!success) {
    errorRate.add(1);
  }

  triageLatency.add(response.timings.duration);
  sleep(1);
}`
      }
    ];
  }

  private generateFallbackStressTests(request: TestGenerationRequest): StressTest[] {
    return [
      {
        name: 'Emergency Surge Stress Test',
        description: 'Test system behavior under emergency load conditions',
        scenario: 'emergency_surge',
        rampUpDuration: '2m',
        steadyDuration: '5m',
        rampDownDuration: '2m',
        maxVUs: 100,
        k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const emergencyScenarios = [
    'severe chest pain with shortness of breath',
    'sudden severe headache with confusion',
    'difficulty breathing and blue lips',
    'severe abdominal pain with vomiting'
  ];

  const scenario = emergencyScenarios[Math.floor(Math.random() * emergencyScenarios.length)];
  
  const payload = JSON.stringify({
    input: scenario,
    patientId: 'emergency-' + __VU + '-' + __ITER,
    mode: 'patient'
  });

  const response = http.post('\${__ENV.BASE_URL}/api/triage', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'emergency response < 10s': (r) => r.timings.duration < 10000,
    'system available': (r) => r.status < 500,
  });

  sleep(Math.random() * 2);
}`
      }
    ];
  }

  private generateFallbackSpikeTests(request: TestGenerationRequest): SpikeTest[] {
    return [
      {
        name: 'Breaking News Health Alert Spike',
        description: 'Simulate sudden traffic spike from health news',
        scenario: 'viral_health_scare',
        baselineVUs: 5,
        spikeVUs: 50,
        spikeDuration: '1m',
        k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 5 },   // baseline
    { duration: '10s', target: 50 }, // spike up
    { duration: '1m', target: 50 },  // spike sustained
    { duration: '10s', target: 5 },  // spike down
    { duration: '1m', target: 5 },   // recovery
  ],
};

export default function () {
  const viralSymptoms = [
    'food poisoning symptoms after restaurant visit',
    'skin rash after new product use',
    'headache after news about contamination'
  ];

  const symptom = viralSymptoms[Math.floor(Math.random() * viralSymptoms.length)];
  
  const response = http.post('\${__ENV.BASE_URL}/api/triage', JSON.stringify({
    input: symptom,
    patientId: 'spike-' + __VU + '-' + __ITER,
    mode: 'patient'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'spike handled': (r) => r.status === 200,
    'reasonable response time': (r) => r.timings.duration < 15000,
  });

  sleep(0.5);
}`
      }
    ];
  }

  private generateFallbackMedicalLoadTests(request: TestGenerationRequest): MedicalLoadTest[] {
    return [
      {
        name: 'Mixed Patient Load Test',
        clinicalScenario: 'typical_ed_mix',
        emergencyLoad: false,
        patientMix: {
          immediate: 10,
          urgent: 30,
          routine: 50,
          batch: 10
        },
        expectedPerformance: {
          immediate: { maxLatency: 2000, availability: 0.999 },
          urgent: { maxLatency: 5000, availability: 0.995 },
          routine: { maxLatency: 10000, availability: 0.99 }
        },
        k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '5m', target: 20 },
    { duration: '1m', target: 0 },
  ],
};

const patientScenarios = {
  immediate: [
    'crushing chest pain with arm radiation',
    'severe difficulty breathing with blue lips'
  ],
  urgent: [
    'moderate chest pain without radiation',
    'persistent headache with mild nausea'
  ],
  routine: [
    'mild headache for 2 days',
    'minor cut needing evaluation'
  ]
};

export default function () {
  // Simulate patient mix: 10% immediate, 30% urgent, 60% routine
  let urgency, maxLatency;
  const rand = Math.random();
  
  if (rand < 0.1) {
    urgency = 'immediate';
    maxLatency = 2000;
  } else if (rand < 0.4) {
    urgency = 'urgent'; 
    maxLatency = 5000;
  } else {
    urgency = 'routine';
    maxLatency = 10000;
  }

  const scenarios = patientScenarios[urgency];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  const response = http.post('\${__ENV.BASE_URL}/api/triage', JSON.stringify({
    input: scenario,
    patientId: urgency + '-' + __VU + '-' + __ITER,
    mode: 'patient'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    [\`\${urgency} response time ok\`]: (r) => r.timings.duration < maxLatency,
    'successful response': (r) => r.status === 200,
  });

  sleep(Math.random() * 3);
}`
      }
    ];
  }

  private generateFallbackCostOptimizationTests(request: TestGenerationRequest): CostOptimizationTest[] {
    return [
      {
        name: 'Caching vs No Caching Cost Test',
        optimizationType: 'caching',
        baselineScenario: 'no_caching',
        optimizedScenario: 'with_caching',
        expectedSavings: 50,
        k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const costCounter = new Counter('estimated_cost');
const cacheHitRate = new Trend('cache_hit_rate');

export let options = {
  stages: [
    { duration: '2m', target: 10 },
  ],
};

export default function () {
  const commonSymptoms = [
    'chest pain',
    'headache', 
    'abdominal pain',
    'shortness of breath'
  ];

  // Repeat common symptoms to test caching
  const symptom = commonSymptoms[Math.floor(Math.random() * commonSymptoms.length)];
  
  const response = http.post('\${__ENV.BASE_URL}/api/triage', JSON.stringify({
    input: \`I have \${symptom} that started recently\`,
    patientId: 'cost-test-' + __VU + '-' + __ITER,
    mode: 'patient'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Enable-Caching': 'true'
    },
  });
  
  if (response.status === 200) {
    const body = JSON.parse(response.body);
    
    // Estimate cost based on response (mock calculation)
    const estimatedTokens = JSON.stringify(body).length / 4;
    costCounter.add(estimatedTokens * 0.001); // $0.001 per 1k tokens
    
    // Check for cache headers
    if (response.headers['X-Cache-Hit']) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  }

  check(response, {
    'cost optimization working': (r) => r.status === 200,
    'has cost headers': (r) => r.headers['X-Estimated-Cost'] !== undefined,
  });

  sleep(1);
}`
      }
    ];
  }
}