# 🏥 Multi-Agent Medical Triage Testing Framework

A comprehensive, AI-powered testing orchestration system designed specifically for medical-grade healthcare triage applications. This framework generates and executes extensive test suites across all components, ensuring patient safety and clinical compliance.

## 🎯 Framework Overview

The Multi-Agent Medical Triage Testing Framework provides automated generation and execution of:

- **Unit Tests**: Comprehensive testing of all agent components and adapters
- **Integration Tests**: Multi-agent workflow and API endpoint validation
- **Contract Tests**: API boundary validation using Pact consumer/provider patterns
- **Performance Tests**: k6-based load testing with medical-grade performance requirements
- **Medical Test Data**: Synthetic clinical scenarios and patient profiles
- **Coverage Analysis**: Medical-specific coverage reporting with compliance validation

## 🏗️ Architecture

### Core Components

```
lib/testing/
├── TestingOrchestrator.ts          # Main coordinator for all testing agents
├── agents/
│   ├── UnitTestGenerator.ts        # Generates comprehensive unit tests
│   ├── IntegrationTestAgent.ts     # Creates workflow and API integration tests
│   ├── ContractTestAgent.ts        # Builds Pact consumer/provider contracts
│   ├── PerformanceTestAgent.ts     # Generates k6 load testing scripts
│   └── MedicalTestDataGenerator.ts # Creates synthetic medical test scenarios
└── reporters/
    └── TestCoverageReporter.ts     # Medical-specific coverage analysis
```

### Generated Test Structure

```
tests/
├── unit/                    # Component-level tests
│   ├── AnthropicProvider.test.ts
│   ├── BatchTriageOrchestrator.test.ts
│   └── agents/
│       ├── SymptomParserAgent.test.ts
│       ├── RiskStratifierAgent.test.ts
│       └── ...
├── integration/             # System integration tests
│   ├── workflow.test.ts
│   ├── api.test.ts
│   └── interactions.test.ts
├── contract/               # API contract tests
│   ├── consumer.test.ts
│   ├── provider.test.ts
│   └── schema.test.ts
└── performance/            # Load testing scripts
    ├── load-*.js
    ├── stress-*.js
    ├── spike-*.js
    └── cost-*.js
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Configure your LLM provider
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.local
echo "MODEL_PROVIDER=anthropic" >> .env.local
```

### 2. Generate Complete Test Suite

```bash
# Generate comprehensive test suite for all components
pnpm run test:generate

# Generate tests for specific scope
pnpm run test:generate --scope agents
pnpm run test:generate --scope adapters
pnpm run test:generate --scope orchestrator
```

### 3. Execute Generated Tests

```bash
# Run all test types
pnpm run ci

# Run specific test types
pnpm run test              # Unit tests only
pnpm run test:integration  # Integration tests
pnpm run test:contract     # Contract tests
pnpm run test:performance  # Performance tests
```

## 🎛️ Advanced Usage

### Targeting Specific Components

```bash
# Generate tests for specific targets
pnpm run test:generate --targets "AnthropicProvider,BatchProcessor,RiskStratifierAgent"

# Test specific medical agents
pnpm run test:agents:risk-stratifier
pnpm run test:agents:symptom-parser
```

### Medical-Specific Testing

```bash
# Run medical compliance tests
pnpm run test:medical:compliance

# Test medical scenarios
pnpm run test:medical:scenarios

# Validate emergency workflows
pnpm run test:medical:integration --grep emergency
```

### Cost Optimization Testing

```bash
# Analyze LLM cost optimizations
pnpm run test:cost:analysis

# Test caching effectiveness
pnpm run test:cost:caching

# Validate batch processing savings
pnpm run test:cost:batching
```

### Performance Testing

```bash
# Run medical load patterns
pnpm run test:performance:medical

# Execute stress tests
pnpm run test:performance:stress

# Test emergency surge scenarios
pnpm run test:performance:spike
```

## 📊 Coverage & Reporting

### Medical-Grade Coverage Requirements

The framework enforces medical-grade coverage standards:

- **Critical Components**: 95%+ coverage (Risk Assessment, Care Pathways)
- **Emergency Scenarios**: 100% coverage (Red flags, immediate care)
- **Agent Interactions**: 85%+ coverage (Multi-agent workflows)
- **Error Handling**: 90%+ coverage (Failure scenarios)

### Generating Coverage Reports

```bash
# Generate coverage with medical compliance validation
pnpm run coverage

# Generate visual coverage report
pnpm run coverage:report

# Upload coverage to external service
pnpm run coverage:upload
```

### Coverage Report Structure

```
reports/coverage/
├── coverage-[timestamp].html    # Interactive HTML report
├── coverage-[timestamp].json    # Raw coverage data
└── medical-compliance.html      # Medical-specific metrics
```

## 🏥 Medical Test Data

### Synthetic Clinical Scenarios

The framework generates comprehensive medical test data:

```typescript
// Patient profiles with diverse demographics
{
  demographics: { age: 45, gender: 'female', ethnicity: 'Hispanic' },
  medicalHistory: { conditions: ['Diabetes', 'Hypertension'] },
  riskFactors: ['Family history of heart disease']
}

// Clinical scenarios across all urgency levels
{
  name: 'Acute Chest Pain Emergency',
  symptoms: ['chest pain', 'diaphoresis', 'nausea'],
  expectedDisposition: 'ED',
  expectedRiskLevel: 'immediate'
}
```

### Test Data Management

```bash
# Generate fresh test data
pnpm run test:generate:data

# Validate data compliance
pnpm run security:medical-data

# Clean test data
pnpm run clean:data
```

## 🤖 CI/CD Integration

### GitHub Actions Workflow

The framework includes a comprehensive CI/CD pipeline:

```yaml
# .github/workflows/medical-testing-suite.yml
- Medical Test Generation
- Parallel Test Execution
- Medical Compliance Validation
- Cost Optimization Analysis
- Security Medical Data Scan
```

### Running in CI

```bash
# Trigger full CI pipeline
git push origin main

# Manual workflow dispatch
gh workflow run medical-testing-suite.yml -f test_scope=full
```

## 📐 Configuration

### Testing Orchestrator Options

```typescript
interface TestExecutionOptions {
  parallel: boolean;           // Enable parallel test execution
  maxConcurrency: number;      // Maximum concurrent test generations
  generateData: boolean;       // Generate fresh test data
  runCoverage: boolean;        // Calculate coverage metrics
  medicalGradeValidation: boolean; // Enforce medical standards
  costOptimization: boolean;   // Include cost analysis
}
```

### Medical Context Configuration

```typescript
interface MedicalContext {
  agentType?: string;                    // Target agent for testing
  clinicalScenarios?: string[];          // Specific scenarios to test
  riskLevels?: ('immediate' | 'urgent' | 'routine' | 'low')[]; // Risk levels to cover
}
```

## 🔧 Customization

### Adding Custom Test Agents

1. Create new test agent:

```typescript
// lib/testing/agents/CustomTestAgent.ts
export class CustomTestAgent {
  constructor(private provider: LlmProvider) {}
  
  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    // Custom test generation logic
  }
}
```

2. Register with orchestrator:

```typescript
// lib/testing/TestingOrchestrator.ts
this.customTestAgent = new CustomTestAgent(provider);
```

### Medical Compliance Rules

Customize medical validation in `TestCoverageReporter.ts`:

```typescript
private coverageThresholds = {
  lines: 80,
  functions: 85,
  branches: 75,
  statements: 80,
  medicalCritical: 95,        // Critical medical paths
  emergencyScenarios: 100,    // Emergency workflows
  errorHandling: 90           // Error scenarios
};
```

## 📊 Performance Benchmarks

### Expected Performance Standards

| Component | Response Time | Availability | Error Rate |
|-----------|---------------|--------------|------------|
| Immediate | < 2 seconds   | 99.9%        | < 0.1%     |
| Urgent    | < 5 seconds   | 99.5%        | < 0.5%     |
| Routine   | < 10 seconds  | 99%          | < 1%       |
| Batch     | < 30 seconds  | 95%          | < 5%       |

### Cost Optimization Targets

- **Cache Hit Rate**: 80%+
- **Batch Utilization**: 60%+
- **Token Savings**: 50%+
- **Cost per Triage**: < $0.01

## 🛠️ Troubleshooting

### Common Issues

#### Test Generation Failures

```bash
# Check LLM provider connectivity
pnpm run test:generate --no-data --concurrency 1

# Validate configuration
node -e "console.log(require('./lib/config').ConfigManager.getConfig())"
```

#### Coverage Below Thresholds

```bash
# Identify low-coverage files
pnpm run coverage --reporter=text-summary

# Generate additional tests for specific components
pnpm run test:generate --targets "ComponentName"
```

#### Performance Test Failures

```bash
# Run individual performance tests
k6 run tests/performance/specific-test.js

# Check system resources during testing
htop # or Task Manager on Windows
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment
export LOG_LEVEL=debug
export ENABLE_DEBUG_ROUTES=true

# Run with verbose output
pnpm run test:generate --scope agents 2>&1 | tee debug.log
```

## 🔐 Security & Compliance

### Medical Data Security

- **Synthetic Data Only**: All test data is artificially generated
- **HIPAA Compliance**: No real patient information used
- **PII Redaction**: All logs automatically redact sensitive information
- **Audit Trails**: Complete testing activity logging

### Validation Scripts

```bash
# Validate medical data compliance
pnpm run security:medical-data

# Check for real patient data
pnpm run security:audit

# Validate synthetic data quality
node scripts/validate-synthetic-data.js
```

## 📈 Metrics & Analytics

### Testing Metrics Dashboard

The framework provides comprehensive metrics:

- **Test Coverage**: Component and medical compliance metrics
- **Performance**: Response times and throughput analysis
- **Cost Analysis**: LLM usage and optimization effectiveness
- **Quality**: Error rates and reliability metrics

### Exporting Metrics

```bash
# Export metrics to JSON
pnpm run analyze:metrics > metrics.json

# Generate compliance report
pnpm run test:medical:compliance --format json
```

## 🤝 Contributing

### Adding Medical Scenarios

1. Update scenario definitions in `MedicalTestDataGenerator.ts`
2. Add validation rules in `TestCoverageReporter.ts`
3. Include in CI pipeline testing

### Extending Test Agents

1. Follow existing agent patterns
2. Implement medical-grade validation
3. Include cost optimization considerations
4. Add comprehensive error handling

## 📚 Additional Resources

- [Medical Compliance Standards](./MEDICAL-COMPLIANCE.md)
- [Cost Optimization Guide](./COST-OPTIMIZATION.md)
- [Performance Testing Strategies](./PERFORMANCE-TESTING.md)
- [API Documentation](./api/index.html)

## 🆘 Support

For framework support and medical compliance questions:

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/your-org/medical-triage/issues)
- **Medical AI Team**: medical-ai@your-org.com
- **Testing Team**: testing@your-org.com

---

**⚠️ Medical System Notice**: This testing framework is designed for medical-grade applications. Always ensure comprehensive testing coverage for patient safety-critical components and maintain compliance with healthcare regulations in your jurisdiction.