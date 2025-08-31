import { test, expect } from '@playwright/test';

test.describe('Layout Positioning Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should have correct header positioning and layout', async ({ page }) => {
    // Take screenshot of header area
    const header = page.locator('.max-w-7xl > .space-y-6 > .p-4').first();
    await header.screenshot({ path: 'tests/e2e/screenshots/header-positioning.png' });

    // Check header container positioning
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    
    // Verify header elements are horizontally aligned
    const patientLabel = page.getByText('PATIENT:');
    const modeLabel = page.getByText('Mode:');
    const rationaleButton = page.getByText('View Rationale');
    
    const patientBox = await patientLabel.boundingBox();
    const modeBox = await modeLabel.boundingBox();
    const rationaleBox = await rationaleButton.boundingBox();
    
    // All header elements should be roughly at the same vertical level
    expect(Math.abs(patientBox!.y - modeBox!.y)).toBeLessThan(10);
    expect(Math.abs(modeBox!.y - rationaleBox!.y)).toBeLessThan(20);
    
    // Elements should be properly spaced horizontally
    expect(modeBox!.x).toBeGreaterThan(patientBox!.x + patientBox!.width);
    expect(rationaleBox!.x).toBeGreaterThan(modeBox!.x + modeBox!.width);
  });

  test('should have correct 2-column grid positioning', async ({ page }) => {
    // Take screenshot of main grid
    const mainGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    await mainGrid.screenshot({ path: 'tests/e2e/screenshots/main-grid-positioning.png' });

    const gridBox = await mainGrid.boundingBox();
    expect(gridBox).not.toBeNull();

    // Check left and right column positions
    const leftColumn = mainGrid.locator('> div').first();
    const rightColumn = mainGrid.locator('> div').nth(1);
    
    const leftBox = await leftColumn.boundingBox();
    const rightBox = await rightColumn.boundingBox();
    
    // On desktop, columns should be side by side
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    const leftBoxDesktop = await leftColumn.boundingBox();
    const rightBoxDesktop = await rightColumn.boundingBox();
    
    // Right column should be to the right of left column
    expect(rightBoxDesktop!.x).toBeGreaterThan(leftBoxDesktop!.x + leftBoxDesktop!.width - 50);
    
    // Both columns should start at roughly the same vertical position
    expect(Math.abs(leftBoxDesktop!.y - rightBoxDesktop!.y)).toBeLessThan(20);
  });

  test('should have correct left column card positioning', async ({ page }) => {
    const leftColumn = page.locator('.grid > div').first();
    await leftColumn.screenshot({ path: 'tests/e2e/screenshots/left-column-positioning.png' });

    // Get Symptom Intake and Processing Timeline cards
    const symptomCard = leftColumn.locator('text=Symptom Intake').locator('..').locator('..');
    const timelineCard = leftColumn.locator('text=Processing Timeline').locator('..').locator('..');
    
    const symptomBox = await symptomCard.boundingBox();
    const timelineBox = await timelineCard.boundingBox();
    
    // Symptom card should be above Timeline card
    expect(symptomBox!.y).toBeLessThan(timelineBox!.y);
    
    // Cards should be vertically spaced with gap
    expect(timelineBox!.y - (symptomBox!.y + symptomBox!.height)).toBeGreaterThan(10);
    expect(timelineBox!.y - (symptomBox!.y + symptomBox!.height)).toBeLessThan(50);
    
    // Both cards should have similar widths and x positions
    expect(Math.abs(symptomBox!.x - timelineBox!.x)).toBeLessThan(10);
    expect(Math.abs(symptomBox!.width - timelineBox!.width)).toBeLessThan(50);

    // Verify content positioning within Symptom Intake card
    const textarea = page.getByPlaceholder('Describe the primary concern...');
    const startButton = page.getByText('Start Triage');
    const clearButton = page.getByText('Clear');
    
    const textareaBox = await textarea.boundingBox();
    const startBox = await startButton.boundingBox();
    const clearBox = await clearButton.boundingBox();
    
    // Textarea should be above buttons
    expect(textareaBox!.y + textareaBox!.height).toBeLessThan(startBox!.y);
    
    // Buttons should be horizontally aligned
    expect(Math.abs(startBox!.y - clearBox!.y)).toBeLessThan(5);
    
    // Clear button should be to the right of Start button
    expect(clearBox!.x).toBeGreaterThan(startBox!.x + startBox!.width);
  });

  test('should have correct right column card positioning', async ({ page }) => {
    const rightColumn = page.locator('.grid > div').nth(1);
    await rightColumn.screenshot({ path: 'tests/e2e/screenshots/right-column-positioning.png' });

    // Get Risk Assessment and Care Plan cards
    const riskCard = rightColumn.locator('text=Risk Assessment').locator('..').locator('..');
    const planCard = rightColumn.locator('text=Care Plan').locator('..').locator('..');
    
    const riskBox = await riskCard.boundingBox();
    const planBox = await planCard.boundingBox();
    
    // Risk card should be above Plan card
    expect(riskBox!.y).toBeLessThan(planBox!.y);
    
    // Cards should be vertically spaced with gap
    expect(planBox!.y - (riskBox!.y + riskBox!.height)).toBeGreaterThan(10);
    expect(planBox!.y - (riskBox!.y + riskBox!.height)).toBeLessThan(50);
    
    // Both cards should have similar widths and x positions
    expect(Math.abs(riskBox!.x - planBox!.x)).toBeLessThan(10);
    expect(Math.abs(riskBox!.width - planBox!.width)).toBeLessThan(50);

    // Verify Risk Assessment content positioning
    const bandLabel = page.getByText('BAND:');
    const immediateBadge = page.getByText('[ IMMEDIATE ]');
    const probabilityText = page.getByText('p(urgent): 92%');
    
    const bandBox = await bandLabel.boundingBox();
    const badgeBox = await immediateBadge.boundingBox();
    const probBox = await probabilityText.boundingBox();
    
    // All should be horizontally aligned
    expect(Math.abs(bandBox!.y - badgeBox!.y)).toBeLessThan(10);
    expect(Math.abs(badgeBox!.y - probBox!.y)).toBeLessThan(10);
    
    // Should be horizontally ordered: BAND: [IMMEDIATE] p(urgent)
    expect(badgeBox!.x).toBeGreaterThan(bandBox!.x + bandBox!.width);
    expect(probBox!.x).toBeGreaterThan(badgeBox!.x + badgeBox!.width);
  });

  test('should have correct timeline content positioning', async ({ page }) => {
    const timelineCard = page.locator('text=Processing Timeline').locator('..').locator('..');
    await timelineCard.screenshot({ path: 'tests/e2e/screenshots/timeline-content-positioning.png' });

    // Check timeline entries
    const yesterdayEntry = page.getByText('Yesterday 14:10');
    const todayEntry = page.getByText('Today 08:55');
    
    const yesterdayBox = await yesterdayEntry.boundingBox();
    const todayBox = await todayEntry.boundingBox();
    
    // Yesterday entry should be above Today entry
    expect(yesterdayBox!.y).toBeLessThan(todayBox!.y);
    
    // Both entries should be left-aligned within the card
    expect(Math.abs(yesterdayBox!.x - todayBox!.x)).toBeLessThan(10);
    
    // Check that timeline entries have proper bullet spacing
    const bulletPoints = page.locator('text=Yesterday 14:10').locator('..').locator('span').first();
    const bulletBox = await bulletPoints.boundingBox();
    
    // Bullet should be to the left of the text
    expect(bulletBox!.x).toBeLessThan(yesterdayBox!.x);
  });

  test('should have correct care plan content positioning', async ({ page }) => {
    const planCard = page.locator('text=Care Plan').locator('..').locator('..');
    await planCard.screenshot({ path: 'tests/e2e/screenshots/care-plan-content-positioning.png' });

    // Check section headers are vertically stacked
    const dispositionHeader = page.getByText('Disposition:');
    const whyHeader = page.getByText('Why:');
    const expectHeader = page.getByText('What to expect:');
    const safetyHeader = page.getByText('Safety-net:');
    
    const dispBox = await dispositionHeader.boundingBox();
    const whyBox = await whyHeader.boundingBox();
    const expectBox = await expectHeader.boundingBox();
    const safetyBox = await safetyHeader.boundingBox();
    
    // Headers should be vertically ordered
    expect(dispBox!.y).toBeLessThan(whyBox!.y);
    expect(whyBox!.y).toBeLessThan(expectBox!.y);
    expect(expectBox!.y).toBeLessThan(safetyBox!.y);
    
    // All headers should be left-aligned
    expect(Math.abs(dispBox!.x - whyBox!.x)).toBeLessThan(10);
    expect(Math.abs(whyBox!.x - expectBox!.x)).toBeLessThan(10);
    expect(Math.abs(expectBox!.x - safetyBox!.x)).toBeLessThan(10);

    // Check that bullet points under "Why:" are indented
    const whyBullets = page.locator('text=severe persistent chest pain');
    const whyBulletBox = await whyBullets.boundingBox();
    
    // Bullet content should be indented relative to header
    expect(whyBulletBox!.x).toBeGreaterThan(whyBox!.x);
  });

  test('should maintain correct positioning on mobile', async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/mobile-layout-positioning.png',
      fullPage: true 
    });

    // On mobile, columns should stack vertically
    const leftColumn = page.locator('.grid > div').first();
    const rightColumn = page.locator('.grid > div').nth(1);
    
    const leftBox = await leftColumn.boundingBox();
    const rightBox = await rightColumn.boundingBox();
    
    // Right column should be below left column on mobile
    expect(rightBox!.y).toBeGreaterThan(leftBox!.y + leftBox!.height - 50);
    
    // Both columns should span full width on mobile
    const containerWidth = await page.locator('.max-w-7xl').boundingBox();
    expect(leftBox!.width).toBeGreaterThan(containerWidth!.width * 0.8);
    expect(rightBox!.width).toBeGreaterThan(containerWidth!.width * 0.8);
  });

  test('should have proper card visual hierarchy and spacing', async ({ page }) => {
    // Take full page screenshot for visual analysis
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/full-layout-hierarchy.png',
      fullPage: true 
    });

    // Check card titles are properly positioned within cards
    const symptomTitle = page.getByRole('heading', { name: 'Symptom Intake' });
    const timelineTitle = page.getByRole('heading', { name: 'Processing Timeline' });
    const riskTitle = page.getByRole('heading', { name: 'Risk Assessment' });
    const planTitle = page.getByRole('heading', { name: 'Care Plan' });
    
    const cards = [
      { title: symptomTitle, name: 'Symptom Intake' },
      { title: timelineTitle, name: 'Processing Timeline' },
      { title: riskTitle, name: 'Risk Assessment' },
      { title: planTitle, name: 'Care Plan' }
    ];

    for (const card of cards) {
      const titleBox = await card.title.boundingBox();
      const cardContainer = card.title.locator('..').locator('..');
      const cardBox = await cardContainer.boundingBox();
      
      // Title should be near the top of the card
      expect(titleBox!.y - cardBox!.y).toBeLessThan(80);
      expect(titleBox!.y - cardBox!.y).toBeGreaterThan(10);
      
      // Title should be left-aligned within card with proper padding
      expect(titleBox!.x - cardBox!.x).toBeGreaterThan(10);
      expect(titleBox!.x - cardBox!.x).toBeLessThan(50);
    }

    // Verify consistent gap between all major sections
    const headerCard = page.locator('.p-4').first();
    const mainGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    const footer = page.getByText('Clinical Cards — shadcn/ui + Next.js');
    
    const headerBox = await headerCard.boundingBox();
    const gridBox = await mainGrid.boundingBox();
    const footerBox = await footer.boundingBox();
    
    // Check spacing between major sections
    const headerToGrid = gridBox!.y - (headerBox!.y + headerBox!.height);
    const gridToFooter = footerBox!.y - (gridBox!.y + gridBox!.height);
    
    expect(headerToGrid).toBeGreaterThan(15);
    expect(headerToGrid).toBeLessThan(35);
    expect(gridToFooter).toBeGreaterThan(15);
    expect(gridToFooter).toBeLessThan(50);
  });
});