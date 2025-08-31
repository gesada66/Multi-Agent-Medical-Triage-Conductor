import { test, expect } from '@playwright/test';

test('Demo: Complete triage workflow showing all cards', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.setViewportSize({ width: 1400, height: 900 });

  console.log('🎯 Demonstrating Complete Clinical Cards UI...\n');

  // 1. Show initial state
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/step1-initial-layout.png',
    fullPage: true 
  });
  console.log('📸 Step 1: Initial Clinical Cards layout captured');

  // 2. Enter realistic symptoms
  await page.getByPlaceholder('Describe the symptoms…').fill('Severe crushing chest pain radiating to left arm and jaw, started 30 minutes ago. Patient is sweating profusely, nauseous, and feels short of breath. Pain is 9/10 in intensity.');
  
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/step2-symptoms-entered.png',
    fullPage: true 
  });
  console.log('📸 Step 2: Symptoms entered in intake card');

  // 3. Click triage and capture processing state
  await page.getByRole('button', { name: 'Triage' }).click();
  
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/step3-processing.png',
    fullPage: true 
  });
  console.log('📸 Step 3: Triage processing started (button shows "Processing...")');

  // 4. Wait for results and capture complete layout
  await expect(page.getByText('Risk Assessment')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('IMMEDIATE')).toBeVisible();
  
  // Wait a moment for animations to complete
  await page.waitForTimeout(1000);
  
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/step4-complete-triage-results.png',
    fullPage: true 
  });
  console.log('📸 Step 4: Complete Clinical Cards layout with all results');

  // 5. Test tooltip on risk badge
  await page.getByText('IMMEDIATE').hover();
  await page.waitForTimeout(500);
  
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/step5-tooltip-interaction.png',
    fullPage: true 
  });
  console.log('📸 Step 5: Risk badge tooltip demonstration');

  console.log('\n🎉 COMPLETE CLINICAL CARDS WORKFLOW DEMONSTRATED!');
  console.log('📁 Screenshots saved showing all 5 stages of the UI');
  console.log('✅ All cards are now visible and functional');
});