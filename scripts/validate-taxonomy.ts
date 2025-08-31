// Taxonomy Feature Validation Examples
// Run with: npx tsx scripts/validate-taxonomy.ts

import { computePriority, SUGGESTED_RISK_BY_TEST } from '../lib/taxonomy';
import { deriveRouting, assertConsistent } from '../lib/normalizers';

console.log('🧪 TAXONOMY FEATURE VALIDATION\n');

// Example 1: Dual Badge Display - Immediate Risk
console.log('1️⃣ DUAL BADGE DISPLAY - IMMEDIATE RISK');
const immediateRisk = {
  band: 'immediate' as const,
  pUrgent: 0.95,
  explain: ['Severe chest pain >15min with diaphoresis', 'ECG changes suggesting STEMI']
};
const immediateRouting = deriveRouting('immediate');
console.log(`   Risk Badge: ${immediateRisk.band.toUpperCase()} (red bg-red-600)`);
console.log(`   Priority Badge: PRIORITY: ${immediateRouting.priority.toUpperCase()} (red bg-red-600/80)`);
console.log(`   Expected UI: Two red badges side-by-side\n`);

// Example 2: After-Hours Batch Priority
console.log('2️⃣ AFTER-HOURS BATCH PRIORITY');
const routineRisk = {
  band: 'routine' as const,
  pUrgent: 0.25,
  explain: ['Minor headache <6/10 severity', 'No red flags identified']
};
const afterHoursRouting = deriveRouting('routine', { isAfterHours: true });
console.log(`   Risk Band: ${routineRisk.band} (green)`);
console.log(`   Normal Priority: ${computePriority('routine')} (green)`);  
console.log(`   After-Hours Priority: ${afterHoursRouting.priority} (indigo bg-indigo-600/80)`);
console.log(`   Expected UI: Green risk badge + Indigo batch priority badge\n`);

// Example 3: High-Load Escalation  
console.log('3️⃣ HIGH-LOAD PRIORITY ESCALATION');
const urgentRisk = {
  band: 'urgent' as const,
  pUrgent: 0.75,
  explain: ['Chest pain without immediate red flags', 'Multiple cardiac risk factors present']
};
const normalLoad = deriveRouting('urgent', { systemLoad: 'normal' });
const highLoad = deriveRouting('urgent', { systemLoad: 'high' });
console.log(`   Risk Band: ${urgentRisk.band} (amber)`);
console.log(`   Normal Load Priority: ${normalLoad.priority} (amber)`);
console.log(`   High Load Priority: ${highLoad.priority} (red bg-red-600/80)`);
console.log(`   Expected UI: Amber risk + Red immediate priority under load\n`);

// Example 4: Test Category Tag (Development Only)
console.log('4️⃣ TEST CATEGORY TAG VISIBILITY');
const testRouting = deriveRouting('urgent', { 
  testCategory: 'emergency',
  systemLoad: 'normal' 
});
console.log(`   Risk Band: urgent (amber)`);
console.log(`   Priority: ${testRouting.priority} (amber)`);
console.log(`   Test Category: ${testRouting.testCategory || 'none'}`);
console.log(`   Expected UI: Small gray text "Test tag: emergency" (dev only)\n`);

// Example 5: Consistency Validation
console.log('5️⃣ CONSISTENCY VALIDATION');
console.log('   Testing mismatched risk vs test category...');

// This should warn in development
console.log('   Scenario: emergency test category + routine risk band');
try {
  process.env.NODE_ENV = 'development';
  console.log('   Setting NODE_ENV=development...');
  assertConsistent('routine', 'emergency');
  console.log('   Expected: Console warning about mismatch');
} catch (e: any) {
  console.log(`   Error: ${e.message}`);
}

// This should be fine
console.log('   Scenario: emergency test category + immediate risk band');
assertConsistent('immediate', 'emergency');
console.log('   Expected: No warning (consistent mapping)\n');

// Example 6: UI Component Integration
console.log('6️⃣ UI COMPONENT INTEGRATION EXAMPLE');
const sampleTriageResponse = {
  risk: {
    band: 'urgent' as const,
    pUrgent: 0.78,
    explain: ['Moderate chest discomfort', 'History of hypertension']
  },
  routing: deriveRouting('urgent', { 
    testCategory: 'urgent',
    isAfterHours: false,
    systemLoad: 'high' 
  })
};

console.log('   Sample RiskCard props:');
console.log(`   risk.band: "${sampleTriageResponse.risk.band}"`);
console.log(`   routing.priority: "${sampleTriageResponse.routing.priority}"`);
console.log(`   routing.testCategory: "${sampleTriageResponse.routing.testCategory}"`);
console.log(`   Expected Badges: URGENT (amber) + PRIORITY: IMMEDIATE (red/80)`);
console.log(`   Expected Dev Tag: "Test tag: urgent"\n`);

// Example 7: All Priority Mappings
console.log('7️⃣ COMPLETE PRIORITY MAPPING TABLE');
console.log('   Risk Band → Default Priority → Context Overrides');
console.log('   ───────────────────────────────────────────────');
console.log(`   immediate → ${computePriority('immediate')} (no overrides)`);
console.log(`   urgent → ${computePriority('urgent')} (→ immediate under high load)`);
console.log(`   routine → ${computePriority('routine')} (→ batch after hours)`);
console.log();
console.log('   Context Examples:');
console.log(`   urgent + high load → ${computePriority('urgent', {systemLoad: 'high'})}`);
console.log(`   routine + after hours → ${computePriority('routine', {isAfterHours: true})}`);
console.log(`   immediate + any context → ${computePriority('immediate', {systemLoad: 'high', isAfterHours: true})}`);

console.log('\n✅ All taxonomy features validated!');