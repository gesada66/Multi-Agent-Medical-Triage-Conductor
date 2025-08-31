import { test, expect } from '@playwright/test';

test('validate current UI state matches expectations', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Test current desktop layout
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1000);

  // Take full desktop screenshot
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/current-desktop-validation.png',
    fullPage: true 
  });

  // Check positioning
  const leftColumn = page.locator('.grid > div').first();
  const rightColumn = page.locator('.grid > div').nth(1);
  
  const leftBox = await leftColumn.boundingBox();
  const rightBox = await rightColumn.boundingBox();

  console.log(`Current Desktop State:`);
  console.log(`Left column: (${leftBox?.x}, ${leftBox?.y}) ${leftBox?.width}x${leftBox?.height}`);
  console.log(`Right column: (${rightBox?.x}, ${rightBox?.y}) ${rightBox?.width}x${rightBox?.height}`);
  
  const isSideBySide = rightBox && leftBox && rightBox.x > leftBox.x + leftBox.width - 100;
  console.log(`Side-by-side layout: ${isSideBySide}`);

  // Verify content matches wireframe
  await expect(page.getByText('PATIENT:')).toBeVisible();
  await expect(page.getByText('Mode:')).toBeVisible();
  await expect(page.getByText('Symptom Intake')).toBeVisible();
  await expect(page.getByText('Processing Timeline')).toBeVisible();
  await expect(page.getByText('Risk Assessment')).toBeVisible();
  await expect(page.getByText('Care Plan')).toBeVisible();
  await expect(page.getByText('BAND:')).toBeVisible();
  await expect(page.getByText('[ IMMEDIATE ]')).toBeVisible();
  await expect(page.getByText('p(urgent): 92%')).toBeVisible();
  
  console.log('✅ All expected content is present and visible');

  // Test tablet/small desktop size to see when it switches to stacked
  const testSizes = [
    { width: 1200, name: 'large-desktop' },
    { width: 1024, name: 'desktop-min' },
    { width: 768, name: 'tablet' },
    { width: 375, name: 'mobile' }
  ];

  for (const size of testSizes) {
    await page.setViewportSize({ width: size.width, height: 800 });
    await page.waitForTimeout(500);

    const leftBoxTest = await leftColumn.boundingBox();
    const rightBoxTest = await rightColumn.boundingBox();
    
    const isSideBySideTest = rightBoxTest && leftBoxTest && rightBoxTest.x > leftBoxTest.x + leftBoxTest.width - 100;
    
    console.log(`${size.name} (${size.width}px): Side-by-side = ${isSideBySideTest}`);
    
    await page.screenshot({ 
      path: `tests/e2e/screenshots/current-${size.name}-${size.width}.png`
    });
  }
});