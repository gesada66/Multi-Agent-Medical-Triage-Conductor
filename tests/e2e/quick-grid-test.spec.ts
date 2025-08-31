import { test, expect } from '@playwright/test';

test('should test 2-column grid layout', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Test desktop size (should be 2-column)
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(1000);

  await page.screenshot({ 
    path: 'tests/e2e/screenshots/grid-test-desktop-1200.png',
    fullPage: true 
  });

  // Check grid positioning
  const leftColumn = page.locator('.grid > div').first();
  const rightColumn = page.locator('.grid > div').nth(1);
  
  const leftBox = await leftColumn.boundingBox();
  const rightBox = await rightColumn.boundingBox();

  console.log(`Desktop 1200px - Left: (${leftBox?.x}, ${leftBox?.y}) Right: (${rightBox?.x}, ${rightBox?.y})`);
  
  // Should be side-by-side at desktop size
  const isSideBySide = rightBox && leftBox && rightBox.x > leftBox.x + leftBox.width - 100;
  console.log(`Side-by-side at 1200px: ${isSideBySide}`);
  
  if (isSideBySide) {
    console.log('✅ SUCCESS: 2-column grid is working!');
  } else {
    console.log('❌ FAILED: Still stacked vertically');
  }

  // Test mobile size (should be 1-column)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);

  await page.screenshot({ 
    path: 'tests/e2e/screenshots/grid-test-mobile-375.png',
    fullPage: true 
  });

  const leftBoxMobile = await leftColumn.boundingBox();
  const rightBoxMobile = await rightColumn.boundingBox();

  console.log(`Mobile 375px - Left: (${leftBoxMobile?.x}, ${leftBoxMobile?.y}) Right: (${rightBoxMobile?.x}, ${rightBoxMobile?.y})`);
  
  const isStacked = rightBoxMobile && leftBoxMobile && rightBoxMobile.y > leftBoxMobile.y + leftBoxMobile.height - 100;
  console.log(`Stacked at 375px: ${isStacked}`);
});