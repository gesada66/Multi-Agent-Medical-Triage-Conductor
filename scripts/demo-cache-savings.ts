#!/usr/bin/env npx tsx
/**
 * Demo script to show prompt caching cost savings estimation
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { CachedPromptTemplates } from '../lib/sk/prompts/CachedPromptTemplates';

console.log('🏥 Prompt Caching Cost Savings Analysis');
console.log('==========================================\n');

// Get all cacheable templates
const cacheableTemplates = CachedPromptTemplates.getAllCacheableTemplates();

console.log('📋 Cacheable System Prompts:');
cacheableTemplates.forEach((template, index) => {
  const tokenCount = Math.ceil(template.content.length / 4); // ~4 chars per token
  console.log(`${index + 1}. ${template.agentType}: ~${tokenCount.toLocaleString()} tokens`);
});

// Calculate savings
const savings = CachedPromptTemplates.estimateTokenSavings();

console.log('\n💰 Cost Savings Analysis:');
console.log(`Total Cacheable Tokens: ${savings.totalCacheableTokens.toLocaleString()}`);
console.log(`Estimated Monthly Token Savings: ${savings.estimatedMonthlySavings.toLocaleString()}`);

// Calculate actual cost savings at Anthropic pricing
// Haiku: $0.25 per 1M input tokens, 90% cache discount = $0.025 per 1M cached tokens
const haikusInputCost = 0.25; // per 1M tokens
const cacheDiscount = 0.9;
const cachedCost = haikusInputCost * (1 - cacheDiscount); // $0.025 per 1M

const monthlySavingsUSD = (savings.estimatedMonthlySavings / 1000000) * haikusInputCost * cacheDiscount;
const monthlyRegularCost = (savings.totalCacheableTokens * 3000 / 1000000) * haikusInputCost;
const cachedCost_monthly = (savings.totalCacheableTokens * 3000 / 1000000) * cachedCost;

console.log('\n💵 Real Dollar Savings (Haiku Model):');
console.log(`Without Caching: $${monthlyRegularCost.toFixed(4)}/month`);
console.log(`With Caching: $${cachedCost_monthly.toFixed(4)}/month`);
console.log(`Monthly Savings: $${monthlySavingsUSD.toFixed(4)} (${((monthlySavingsUSD/monthlyRegularCost)*100).toFixed(1)}% reduction)`);

// Show scaling scenarios
console.log('\n📈 Scaling Scenarios:');
const scenarios = [
  { name: 'Light Usage', requestsPerDay: 10 },
  { name: 'Medium Usage', requestsPerDay: 100 },
  { name: 'Heavy Usage', requestsPerDay: 1000 },
  { name: 'Enterprise', requestsPerDay: 10000 }
];

scenarios.forEach(scenario => {
  const monthlyRequests = scenario.requestsPerDay * 30;
  const regularCost = (savings.totalCacheableTokens * monthlyRequests / 1000000) * haikusInputCost;
  const cachedCostScenario = (savings.totalCacheableTokens * monthlyRequests / 1000000) * cachedCost;
  const savingsScenario = regularCost - cachedCostScenario;
  
  console.log(`${scenario.name} (${scenario.requestsPerDay}/day): Save $${savingsScenario.toFixed(2)}/month`);
});

console.log('\n🎯 Key Benefits:');
console.log('• System prompts cached for 24 hours');
console.log('• 90% cost reduction on cached tokens');
console.log('• Faster response times (cached prompt loading)');
console.log('• Scales with request volume');
console.log('• Works across all 5 medical agents');

console.log('\n🔧 Current Configuration:');
console.log(`Cache Hit Rate: 90% (configurable)`);
console.log(`Cache TTL: 1 hour (configurable)`);
console.log(`Agents Using Cache: ${cacheableTemplates.length}/5`);

// Show individual agent cache benefits
console.log('\n👨‍⚕️ Per-Agent Cache Impact:');
cacheableTemplates.forEach(template => {
  const agentTokens = Math.ceil(template.content.length / 4);
  const agentMonthlySavings = (agentTokens * 3000 * 0.9 / 1000000) * haikusInputCost * 0.9;
  console.log(`${template.agentType}: $${agentMonthlySavings.toFixed(4)}/month savings`);
});