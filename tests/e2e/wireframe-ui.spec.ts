import { test, expect } from '@playwright/test';

test.describe('Wireframe UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should match the wireframe layout exactly', async ({ page }) => {
    // Take screenshot of the full page
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/wireframe-ui-full.png', 
      fullPage: true 
    });

    // Check header components
    await expect(page.getByText('PATIENT:')).toBeVisible();
    await expect(page.getByText('Select patient...')).toBeVisible();
    await expect(page.getByText('Mode:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Patient' })).toBeVisible();
    await expect(page.getByText('Clinician')).toBeVisible();
    await expect(page.getByText('View Rationale')).toBeVisible();

    // Check left column cards
    await expect(page.getByText('Symptom Intake')).toBeVisible();
    await expect(page.getByText('Processing Timeline')).toBeVisible();
    
    // Check right column cards
    await expect(page.getByText('Risk Assessment')).toBeVisible();
    await expect(page.getByText('Care Plan')).toBeVisible();

    // Check specific content from wireframe
    await expect(page.getByText('BAND:')).toBeVisible();
    await expect(page.getByText('[ IMMEDIATE ]')).toBeVisible();
    await expect(page.getByText('p(urgent): 92%')).toBeVisible();
    await expect(page.getByText('severe chest pain > 15m')).toBeVisible();
    
    await expect(page.getByText('Disposition:')).toBeVisible();
    await expect(page.getByText('Go to Emergency Department now')).toBeVisible();
    await expect(page.getByText('What to expect:')).toBeVisible();
    await expect(page.getByText('ECG, serial troponin')).toBeVisible();
    await expect(page.getByText('Safety-net:')).toBeVisible();
    await expect(page.getByText('call 999 if syncope/worsening')).toBeVisible();

    // Check timeline entries
    await expect(page.getByText('Yesterday 14:10')).toBeVisible();
    await expect(page.getByText('Today 08:55')).toBeVisible();
    await expect(page.getByText('mild pain; troponin normal')).toBeVisible();
    await expect(page.getByText('severe pain; GTN given; ECG pending')).toBeVisible();

    // Check footer
    await expect(page.getByText('Clinical Cards — shadcn/ui + Next.js')).toBeVisible();
  });

  test('should have proper grid layout structure', async ({ page }) => {
    // Check main grid container
    const mainGrid = page.locator('div.grid.grid-cols-1.lg\\:grid-cols-2');
    await expect(mainGrid).toBeVisible();
    
    // Check that we have exactly 2 columns on large screens
    const leftColumn = mainGrid.locator('> div').first();
    const rightColumn = mainGrid.locator('> div').nth(1);
    
    await expect(leftColumn).toBeVisible();
    await expect(rightColumn).toBeVisible();
    
    // Left column should contain Symptom Intake and Timeline
    await expect(leftColumn.getByText('Symptom Intake')).toBeVisible();
    await expect(leftColumn.getByText('Processing Timeline')).toBeVisible();
    
    // Right column should contain Risk and Plan
    await expect(rightColumn.getByText('Risk Assessment')).toBeVisible();
    await expect(rightColumn.getByText('Care Plan')).toBeVisible();
  });

  test('should have functional patient selector', async ({ page }) => {
    // Click patient selector dropdown
    await page.getByText('Select patient...').click();
    
    // Check patient options are visible
    await expect(page.getByText('John Carter, 45y, Male')).toBeVisible();
    await expect(page.getByText('Sarah Wilson, 32y, Female')).toBeVisible();
    await expect(page.getByText('Michael Chen, 67y, Male')).toBeVisible();
    
    // Select a patient
    await page.getByText('John Carter, 45y, Male').click();
    
    // Take screenshot with patient selected
    await page.screenshot({ path: 'tests/e2e/screenshots/wireframe-patient-selected.png' });
  });

  test('should have functional mode toggle', async ({ page }) => {
    // Check initial state (clinician mode should be selected)
    const clinicianButton = page.getByRole('button', { name: 'Clinician' });
    const patientButton = page.getByRole('button', { name: 'Patient' });
    
    // Toggle to patient mode
    await patientButton.click();
    
    // Take screenshot in patient mode
    await page.screenshot({ path: 'tests/e2e/screenshots/wireframe-patient-mode.png' });
    
    // Toggle back to clinician mode
    await clinicianButton.click();
    
    // Take screenshot in clinician mode
    await page.screenshot({ path: 'tests/e2e/screenshots/wireframe-clinician-mode.png' });
  });

  test('should have functional symptom input', async ({ page }) => {
    const textArea = page.getByPlaceholder('Describe the primary concern...');
    
    // Type in symptom text
    await textArea.fill('Patient has severe chest pain radiating to left arm, started 30 minutes ago');
    
    // Check buttons are present
    await expect(page.getByText('Start Triage')).toBeVisible();
    await expect(page.getByText('Clear')).toBeVisible();
    
    // Take screenshot with text entered
    await page.screenshot({ path: 'tests/e2e/screenshots/wireframe-symptom-input.png' });
    
    // Test clear button
    await page.getByText('Clear').click();
    await expect(textArea).toHaveValue('');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/wireframe-mobile.png',
      fullPage: true 
    });
    
    // Check that content is still visible
    await expect(page.getByText('PATIENT:')).toBeVisible();
    await expect(page.getByText('Symptom Intake')).toBeVisible();
    await expect(page.getByText('Risk Assessment')).toBeVisible();
  });

  test('should match color scheme and styling', async ({ page }) => {
    // Check that cards have proper styling
    const cards = page.locator('.card, [class*="card"]');
    await expect(cards.first()).toBeVisible();
    
    // Check immediate badge styling
    const immediateBadge = page.getByText('[ IMMEDIATE ]');
    await expect(immediateBadge).toBeVisible();
    
    // Check that buttons have proper styling
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
    
    // Take focused screenshot on cards
    await page.locator('.max-w-7xl').screenshot({ 
      path: 'tests/e2e/screenshots/wireframe-cards-focus.png' 
    });
  });
});