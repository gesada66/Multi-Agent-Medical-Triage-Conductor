import { test, expect } from '@playwright/test';

test('Smart Mock Responses and Unregistered Patient Validation', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1000);

  console.log('🧪 Testing Smart Mock Response System');

  // Test 1: Headache symptoms should return routine care
  console.log('\n🔍 Test 1: Headache Symptoms');
  
  // Patient is already selected by default (John Carter), verify it's there
  await expect(page.getByText('John Carter, 45y, Male')).toBeVisible();
  
  await page.getByPlaceholder('Describe the symptoms…').fill('I have a mild headache for 2 hours');
  await page.getByRole('button', { name: 'Triage' }).click();
  
  // Wait for results - use more specific selector
  await expect(page.getByText('Risk Assessment').first()).toBeVisible({ timeout: 10000 });
  
  // Verify routine risk band for headache
  await expect(page.getByText('ROUTINE').first()).toBeVisible();
  await expect(page.getByText('Primary care or pharmacy advice')).toBeVisible();
  console.log('   ✅ Headache correctly returns ROUTINE risk with pharmacy advice');
  
  // Clear for next test
  await page.getByRole('button', { name: 'Clear' }).click();

  // Test 2: Chest pain symptoms should return immediate care
  console.log('\n🔍 Test 2: Chest Pain Symptoms');
  
  await page.getByPlaceholder('Describe the symptoms…').fill('Severe chest pain for 20 minutes with sweating');
  await page.getByRole('button', { name: 'Triage' }).click();
  
  await expect(page.getByText('Risk Assessment').first()).toBeVisible({ timeout: 10000 });
  
  // Verify immediate risk band for chest pain
  await expect(page.getByText('IMMEDIATE').first()).toBeVisible();
  await expect(page.getByText('Go to Emergency Department now')).toBeVisible();
  console.log('   ✅ Chest pain correctly returns IMMEDIATE risk with ED referral');
  
  // Clear for next test
  await page.getByRole('button', { name: 'Clear' }).click();

  // Test 3: Ankle sprain should return routine care
  console.log('\n🔍 Test 3: Ankle Sprain Symptoms');
  
  await page.getByPlaceholder('Describe the symptoms…').fill('I twisted my ankle playing football, can still walk');
  await page.getByRole('button', { name: 'Triage' }).click();
  
  await expect(page.getByText('Risk Assessment').first()).toBeVisible({ timeout: 10000 });
  
  // Verify routine risk band for ankle injury
  await expect(page.getByText('ROUTINE').first()).toBeVisible();
  await expect(page.getByText('Self-care with pharmacy advice')).toBeVisible();
  await expect(page.getByText('RICE protocol')).toBeVisible();
  console.log('   ✅ Ankle sprain correctly returns ROUTINE risk with RICE protocol');
  
  // Clear for next test
  await page.getByRole('button', { name: 'Clear' }).click();

  // Test 4: Generic symptoms should return urgent care
  console.log('\n🔍 Test 4: Generic Symptoms');
  
  await page.getByPlaceholder('Describe the symptoms…').fill('I have been feeling unwell with general fatigue');
  await page.getByRole('button', { name: 'Triage' }).click();
  
  await expect(page.getByText('Risk Assessment').first()).toBeVisible({ timeout: 10000 });
  
  // Verify urgent risk band for generic symptoms
  await expect(page.getByText('URGENT').first()).toBeVisible();
  await expect(page.getByText('See healthcare provider within 24 hours')).toBeVisible();
  console.log('   ✅ Generic symptoms correctly return URGENT risk with 24h follow-up');

  // Test 5: Unregistered Patient Functionality
  console.log('\n🔍 Test 5: Unregistered Patient');
  
  // Click on the current patient selector to open dropdown
  await page.getByText('John Carter, 45y, Male').click();
  await page.getByText('Unregistered Patient').click();
  console.log('   ✅ Unregistered Patient option available and selectable');
  
  // Clear and test with unregistered patient
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByPlaceholder('Describe the symptoms…').fill('I have a sore throat that started yesterday');
  await page.getByRole('button', { name: 'Triage' }).click();
  
  await expect(page.getByText('Risk Assessment').first()).toBeVisible({ timeout: 10000 });
  
  // Should still get appropriate triage for unregistered patient
  await expect(page.getByText('URGENT').first()).toBeVisible();
  console.log('   ✅ Unregistered patient receives appropriate triage assessment');

  // Take final screenshot
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/smart-mock-validation.png',
    fullPage: true 
  });

  console.log('\n🎯 Smart Mock Response Validation Summary:');
  console.log('✅ Headache symptoms → ROUTINE risk with pharmacy advice');
  console.log('✅ Chest pain symptoms → IMMEDIATE risk with ED referral');
  console.log('✅ Ankle sprain symptoms → ROUTINE risk with RICE protocol');
  console.log('✅ Generic symptoms → URGENT risk with 24h follow-up');
  console.log('✅ Unregistered patient option functional');
  console.log('✅ All smart mock responses working correctly');
  
  console.log('\n🚀 SMART MOCK SYSTEM VALIDATION COMPLETE!');
});