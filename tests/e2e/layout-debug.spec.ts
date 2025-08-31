import { test, expect } from '@playwright/test';

test.describe('Layout Debug Analysis', () => {
  test('should analyze current layout state and viewport', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Get viewport size
    const viewportSize = page.viewportSize();
    console.log('Current viewport:', viewportSize);

    // Test different viewport sizes
    const sizes = [
      { width: 1200, height: 800, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'small-tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({ 
        path: `tests/e2e/screenshots/layout-debug-${size.name}-${size.width}x${size.height}.png`,
        fullPage: true 
      });

      // Check grid behavior
      const mainGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
      const gridBox = await mainGrid.boundingBox();
      
      const leftColumn = mainGrid.locator('> div').first();
      const rightColumn = mainGrid.locator('> div').nth(1);
      
      const leftBox = await leftColumn.boundingBox();
      const rightBox = await rightColumn.boundingBox();

      console.log(`\n=== ${size.name.toUpperCase()} (${size.width}x${size.height}) ===`);
      console.log(`Grid container: ${gridBox?.width}x${gridBox?.height}`);
      console.log(`Left column: ${leftBox?.width}x${leftBox?.height} at (${leftBox?.x}, ${leftBox?.y})`);
      console.log(`Right column: ${rightBox?.width}x${rightBox?.height} at (${rightBox?.x}, ${rightBox?.y})`);
      
      // Check if columns are side-by-side or stacked
      const isSideBySide = rightBox && leftBox && rightBox.x > leftBox.x + leftBox.width - 50;
      const isStacked = rightBox && leftBox && rightBox.y > leftBox.y + leftBox.height - 50;
      
      console.log(`Side-by-side: ${isSideBySide}`);
      console.log(`Stacked: ${isStacked}`);

      // Check computed styles
      const gridStyles = await mainGrid.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
          gap: styles.gap,
          width: styles.width
        };
      });
      
      console.log(`Grid styles:`, gridStyles);
    }
  });

  test('should test Tailwind lg breakpoint specifically', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test exactly at lg breakpoint (1024px in Tailwind)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(1000);

    await page.screenshot({ 
      path: 'tests/e2e/screenshots/tailwind-lg-breakpoint-1024.png',
      fullPage: true 
    });

    // Test just above lg breakpoint
    await page.setViewportSize({ width: 1025, height: 768 });
    await page.waitForTimeout(1000);

    await page.screenshot({ 
      path: 'tests/e2e/screenshots/tailwind-lg-breakpoint-1025.png',
      fullPage: true 
    });

    // Check the grid classes and computed styles
    const mainGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    
    const gridInfo = await mainGrid.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        className: el.className,
        gridTemplateColumns: styles.gridTemplateColumns,
        display: styles.display,
        gap: styles.gap
      };
    });

    console.log('Grid class and styles at 1025px:', gridInfo);
    
    // Verify columns positioning
    const leftColumn = mainGrid.locator('> div').first();
    const rightColumn = mainGrid.locator('> div').nth(1);
    
    const leftBox = await leftColumn.boundingBox();
    const rightBox = await rightColumn.boundingBox();

    console.log(`At 1025px - Left: (${leftBox?.x}, ${leftBox?.y}) Right: (${rightBox?.x}, ${rightBox?.y})`);
    
    // Should be side-by-side at this width
    if (rightBox && leftBox) {
      const isSideBySide = rightBox.x > leftBox.x + leftBox.width - 50;
      console.log(`Should be side-by-side at 1025px: ${isSideBySide}`);
      
      if (!isSideBySide) {
        console.log('ERROR: Grid should be 2-column at 1025px but is still stacked!');
      }
    }
  });
});