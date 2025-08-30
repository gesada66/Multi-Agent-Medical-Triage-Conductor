#!/usr/bin/env npx tsx
/**
 * Demo script to test the Multi-Agent Medical Triage Conductor locally
 * Usage: npx tsx scripts/demo-triage.ts [provider] [scenario]
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import { ConductorAgent } from '../lib/sk/agents/ConductorAgent';
import { ProviderFactory } from '../lib/adapters/llm/ProviderFactory';
import { ConfigManager } from '../lib/config';
import { logger } from '../lib/logger';

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  input: {
    text: string;
    patientId: string;
    mode: 'patient' | 'clinician';
    patientContext?: any;
  };
  expectedOutcome: {
    riskBand: 'immediate' | 'urgent' | 'routine';
    shouldTriggerRedFlags: boolean;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'chest-pain-emergency',
    name: 'Chest Pain Emergency',
    description: 'Classic heart attack presentation with red flags',
    input: {
      text: 'Severe crushing chest pain for 25 minutes, radiating to left arm, sweating profusely, feeling nauseous',
      patientId: 'demo-patient-001',
      mode: 'patient',
      patientContext: {
        age: 58,
        gender: 'male',
        existingConditions: ['hypertension', 'high cholesterol'],
      }
    },
    expectedOutcome: {
      riskBand: 'immediate',
      shouldTriggerRedFlags: true,
    }
  },
  {
    id: 'headache-urgent',
    name: 'Severe Headache',
    description: 'Concerning headache with neurological symptoms',
    input: {
      text: 'Worst headache of my life, started suddenly 2 hours ago, vision is a bit blurry',
      patientId: 'demo-patient-002',
      mode: 'patient',
      patientContext: {
        age: 45,
        gender: 'female',
      }
    },
    expectedOutcome: {
      riskBand: 'urgent',
      shouldTriggerRedFlags: true,
    }
  },
  {
    id: 'minor-headache',
    name: 'Minor Headache',
    description: 'Routine mild headache',
    input: {
      text: 'Mild headache this morning, feels like tension, had it for about 3 hours',
      patientId: 'demo-patient-003',
      mode: 'patient',
      patientContext: {
        age: 32,
        gender: 'other',
      }
    },
    expectedOutcome: {
      riskBand: 'routine',
      shouldTriggerRedFlags: false,
    }
  },
  {
    id: 'shortness-breath',
    name: 'Shortness of Breath',
    description: 'Respiratory symptoms requiring urgent assessment',
    input: {
      text: 'Having trouble breathing for the past hour, getting worse when I walk',
      patientId: 'demo-patient-004',
      mode: 'clinician',
      patientContext: {
        age: 67,
        gender: 'female',
        existingConditions: ['COPD', 'heart failure'],
      }
    },
    expectedOutcome: {
      riskBand: 'urgent',
      shouldTriggerRedFlags: false,
    }
  }
];

async function runDemo() {
  console.log('🏥 Multi-Agent Medical Triage Conductor - Demo');
  console.log('================================================\n');

  // Parse command line arguments
  const provider = process.argv[2] as 'openai' | 'anthropic' || 'anthropic';
  const scenarioId = process.argv[3];

  console.log(`📋 Configuration:`);
  console.log(`   Provider: ${provider}`);
  console.log(`   Scenario: ${scenarioId || 'all scenarios'}\n`);

  try {
    // Override provider for demo
    const originalProvider = process.env.MODEL_PROVIDER;
    process.env.MODEL_PROVIDER = provider;

    // Clear config cache to pick up new provider
    ConfigManager.clearCache();

    // Load config to check mock mode, then validate if needed
    const config = ConfigManager.getConfig();
    console.log('Mock mode enabled:', config.mockLlmResponses);
    console.log('Provider:', config.modelProvider);
    console.log('Anthropic API Key present:', !!config.anthropicApiKey);
    
    if (!config.mockLlmResponses) {
      console.log('Validating required keys...');
      ConfigManager.validateRequiredKeys();
    } else {
      console.log('Skipping validation due to mock mode');
    }

    // Create provider and conductor
    const llmProvider = ProviderFactory.createProvider();
    const conductor = await ConductorAgent.create(llmProvider);

    // Get scenarios to run
    const scenarios = scenarioId 
      ? DEMO_SCENARIOS.filter(s => s.id === scenarioId)
      : DEMO_SCENARIOS;

    if (scenarios.length === 0) {
      throw new Error(`Scenario '${scenarioId}' not found`);
    }

    console.log(`🚀 Running ${scenarios.length} scenario(s)...\n`);

    // Run scenarios
    for (const scenario of scenarios) {
      await runScenario(conductor, scenario, provider);
      console.log('\n' + '─'.repeat(80) + '\n');
    }

    // Cost summary
    await displayCostSummary(provider, scenarios.length);

    // Restore original provider
    if (originalProvider) {
      process.env.MODEL_PROVIDER = originalProvider;
    }

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

async function runScenario(
  conductor: ConductorAgent, 
  scenario: DemoScenario,
  provider: string
): Promise<void> {
  console.log(`🎯 Scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`👤 Patient: ${scenario.input.patientId} (${scenario.input.mode} mode)`);
  console.log(`💬 Input: "${scenario.input.text}"`);

  if (scenario.input.patientContext) {
    console.log(`📊 Context: Age ${scenario.input.patientContext.age}, ${scenario.input.patientContext.gender}`);
    if (scenario.input.patientContext.existingConditions) {
      console.log(`🏥 Conditions: ${scenario.input.patientContext.existingConditions.join(', ')}`);
    }
  }

  console.log('\n⏳ Processing...');

  const startTime = Date.now();
  
  try {
    const result = await conductor.conductTriage({
      mode: scenario.input.mode,
      input: { text: scenario.input.text },
      patientId: scenario.input.patientId,
      patientContext: scenario.input.patientContext,
    });

    const processingTime = Date.now() - startTime;

    // Display results
    console.log('\n✅ Results:');
    console.log(`🎯 Risk Band: ${result.risk.band.toUpperCase()} (${(result.risk.pUrgent * 100).toFixed(1)}% urgent probability)`);
    console.log(`📍 Disposition: ${result.adaptedResponse.disposition}`);
    console.log(`🎪 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`⏱️  Processing Time: ${processingTime}ms`);
    console.log(`🆔 Trace ID: ${result.traceId}`);

    // Red flags
    if (result.evidence.features?.redFlags?.length > 0) {
      console.log(`🚩 Red Flags: ${result.evidence.features.redFlags.join(', ')}`);
    } else {
      console.log(`✅ No Red Flags Detected`);
    }

    // Clinical reasoning
    if (result.risk.explain?.length > 0) {
      console.log(`🧠 Clinical Reasoning:`);
      result.risk.explain.forEach((reason: string, index: number) => {
        console.log(`   ${index + 1}. ${reason}`);
      });
    }

    // Safety netting
    if (result.adaptedResponse.safetyNet?.length > 0) {
      console.log(`🛡️  Safety Netting:`);
      result.adaptedResponse.safetyNet.forEach((safety: string, index: number) => {
        console.log(`   • ${safety}`);
      });
    }

    // Validate against expected outcome
    console.log('\n🔍 Validation:');
    const riskMatch = result.risk.band === scenario.expectedOutcome.riskBand;
    const redFlagMatch = (result.evidence.features?.redFlags?.length > 0) === scenario.expectedOutcome.shouldTriggerRedFlags;

    console.log(`   Risk Band: ${riskMatch ? '✅' : '❌'} Expected ${scenario.expectedOutcome.riskBand}, got ${result.risk.band}`);
    console.log(`   Red Flags: ${redFlagMatch ? '✅' : '❌'} Expected ${scenario.expectedOutcome.shouldTriggerRedFlags ? 'yes' : 'no'}, got ${result.evidence.features?.redFlags?.length > 0 ? 'yes' : 'no'}`);

    // Cost estimation
    const estimatedCost = estimateCost(provider, 800, 300);
    console.log(`💰 Estimated Cost: $${estimatedCost.toFixed(6)} (${provider})`);

  } catch (error) {
    console.error(`❌ Scenario failed: ${error.message}`);
  }
}

function estimateCost(provider: string, inputTokens: number, outputTokens: number): number {
  if (provider === 'openai') {
    // GPT-4o-mini pricing
    return (inputTokens / 1000000) * 0.50 + (outputTokens / 1000000) * 1.50;
  } else {
    // Anthropic Haiku with optimizations (cached + batch pricing)
    return (inputTokens / 1000000) * 0.0125 + (outputTokens / 1000000) * 0.625;
  }
}

async function displayCostSummary(provider: string, scenarioCount: number) {
  console.log('💰 Cost Summary:');
  console.log(`   Provider: ${provider}`);
  
  if (provider === 'anthropic') {
    console.log(`   Optimizations: Haiku model + Prompt Caching + Smart Routing`);
    console.log(`   Estimated savings: 95%+ vs Sonnet baseline`);
  } else {
    console.log(`   Model: GPT-4o-mini (cost-optimized)`);
    console.log(`   Baseline pricing: $0.50/$1.50 per 1M tokens (in/out)`);
  }
  
  const totalCost = estimateCost(provider, 800 * scenarioCount, 300 * scenarioCount);
  console.log(`   Total estimated cost: $${totalCost.toFixed(6)}`);
  console.log(`   Cost per scenario: $${(totalCost / scenarioCount).toFixed(6)}`);
}

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo, DEMO_SCENARIOS };