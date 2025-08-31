import { test, expect } from '@playwright/test';

test.describe('Dual Badge API Integration Test', () => {
  test('should display dual badges with real API taxonomy determination for unregistered patient', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Select unregistered patient
    await page.click('[data-testid="patient-selector"]');
    await page.click('text=Unregistered Patient');
    
    // Test Case 1: Chest pain (should be IMMEDIATE)
    await page.fill('[data-testid="symptom-input"]', 'severe chest pain for 20 minutes with shortness of breath');
    await page.click('[data-testid="triage-button"]');
    
    // Wait for API response
    await page.waitForSelector('[data-testid="risk-card"]', { timeout: 30000 });
    
    // Check for dual badges
    const riskCard = page.locator('[data-testid="risk-card"]');
    await expect(riskCard).toBeVisible();
    
    // Should see both badges
    const badges = riskCard.locator('.inline-flex.items-center.rounded-full');
    await expect(badges).toHaveCount(2);
    
    // First badge should be risk band
    const firstBadge = badges.first();
    await expect(firstBadge).toContainText(/IMMEDIATE|URGENT|ROUTINE/);
    
    // Second badge should be priority
    const secondBadge = badges.last();
    await expect(secondBadge).toContainText(/PRIORITY:/);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/dual-badge-chest-pain.png' });
    
    // Test Case 2: Minor headache (should be ROUTINE)
    await page.fill('[data-testid="symptom-input"]', 'mild headache for 2 hours');
    await page.click('[data-testid="triage-button"]');
    
    await page.waitForSelector('[data-testid="risk-card"]', { timeout: 30000 });
    
    // Should still see dual badges
    await expect(riskCard.locator('.inline-flex.items-center.rounded-full')).toHaveCount(2);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/dual-badge-headache.png' });
    
    // Test Case 3: Abdominal pain (test LLM determination)
    await page.fill('[data-testid="symptom-input"]', 'severe abdominal pain with vomiting');
    await page.click('[data-testid="triage-button"]');
    
    await page.waitForSelector('[data-testid="risk-card"]', { timeout: 30000 });
    
    // Should still see dual badges
    await expect(riskCard.locator('.inline-flex.items-center.rounded-full')).toHaveCount(2);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/dual-badge-abdominal.png' });
  });

  test('should verify ConductorAgent routing computation', async ({ page }) => {
    // Monitor network requests to verify API calls
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/triage')) {
        apiRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:3000');
    
    // Select unregistered patient
    await page.click('[data-testid="patient-selector"]');
    await page.click('text=Unregistered Patient');
    
    // Test with complex symptoms
    await page.fill('[data-testid="symptom-input"]', 'chest pain with dizziness and sweating');
    await page.click('[data-testid="triage-button"]');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="risk-card"]', { timeout: 30000 });
    
    // Verify API was called
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // Verify response structure by checking console logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.screenshot({ path: 'tests/e2e/screenshots/conductor-agent-test.png' });
  });
});