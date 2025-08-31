import { test, expect } from '@playwright/test';

test('Dynamic Timeline Validation for Different Patients', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1000);

  console.log('🏥 Testing Dynamic Timeline for Different Patients');

  // Test 1: John Carter (P001) - Default selection with chest pain timeline
  console.log('\n🔍 Test 1: John Carter Timeline');
  await expect(page.getByText('John Carter, 45y, Male')).toBeVisible();
  await expect(page.getByText('Yesterday 14:10')).toBeVisible();
  await expect(page.getByText('Mild chest discomfort; troponin normal.')).toBeVisible();
  await expect(page.getByText('Today 08:55')).toBeVisible();
  await expect(page.getByText('Severe pain; GTN given; ECG pending.')).toBeVisible();
  console.log('   ✅ John Carter shows cardiac-related timeline');

  // Test 2: Sarah Wilson (P002) - Headache timeline
  console.log('\n🔍 Test 2: Sarah Wilson Timeline');
  await page.getByText('John Carter, 45y, Male').click();
  await page.getByText('Sarah Wilson, 32y, Female').click();
  await page.waitForTimeout(500); // Allow timeline to update
  
  await expect(page.getByText('3 days ago')).toBeVisible();
  await expect(page.getByText('Headaches started; stress at work.')).toBeVisible();
  await expect(page.getByText('Yesterday')).toBeVisible();
  await expect(page.getByText('Pain worsening; affecting sleep quality.')).toBeVisible();
  await expect(page.getByText('Today 09:30')).toBeVisible();
  await expect(page.getByText('Nausea and photophobia reported.')).toBeVisible();
  console.log('   ✅ Sarah Wilson shows headache-related timeline');

  // Test 3: Michael Chen (P003) - Ankle injury timeline
  console.log('\n🔍 Test 3: Michael Chen Timeline');
  await page.getByText('Sarah Wilson, 32y, Female').click();
  await page.getByText('Michael Chen, 67y, Male').click();
  await page.waitForTimeout(500); // Allow timeline to update
  
  await expect(page.getByText('Last week')).toBeVisible();
  await expect(page.getByText('Ankle twisted during morning walk.')).toBeVisible();
  await expect(page.getByText('3 days ago')).toBeVisible();
  await expect(page.getByText('Swelling reduced; mobility improving.')).toBeVisible();
  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('Still some discomfort when weight bearing.')).toBeVisible();
  console.log('   ✅ Michael Chen shows ankle injury timeline');

  // Test 4: Unregistered Patient - Empty timeline
  console.log('\n🔍 Test 4: Unregistered Patient Timeline');
  await page.getByText('Michael Chen, 67y, Male').click();
  await page.getByText('Unregistered Patient').click();
  await page.waitForTimeout(500); // Allow timeline to update
  
  await expect(page.getByText('No medical history available')).toBeVisible();
  
  // Verify previous timeline items are gone
  await expect(page.getByText('Ankle twisted during morning walk.')).not.toBeVisible();
  await expect(page.getByText('Headaches started; stress at work.')).not.toBeVisible();
  await expect(page.getByText('Mild chest discomfort; troponin normal.')).not.toBeVisible();
  console.log('   ✅ Unregistered Patient shows empty timeline with appropriate message');

  // Test 5: Switch back to see timeline reappears
  console.log('\n🔍 Test 5: Timeline Reappears When Switching Back');
  await page.getByText('Unregistered Patient').click();
  await page.getByText('John Carter, 45y, Male').click();
  await page.waitForTimeout(500); // Allow timeline to update
  
  await expect(page.getByText('Yesterday 14:10')).toBeVisible();
  await expect(page.getByText('Mild chest discomfort; troponin normal.')).toBeVisible();
  await expect(page.getByText('No medical history available')).not.toBeVisible();
  console.log('   ✅ Timeline correctly reappears when switching back to registered patient');

  // Take final screenshot showing different patient selected
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/dynamic-timeline-validation.png',
    fullPage: true 
  });

  console.log('\n🎯 Dynamic Timeline Validation Summary:');
  console.log('✅ John Carter → Cardiac timeline (chest pain history)');
  console.log('✅ Sarah Wilson → Neurological timeline (headache progression)');
  console.log('✅ Michael Chen → Musculoskeletal timeline (ankle injury recovery)');
  console.log('✅ Unregistered Patient → Empty timeline with "No medical history" message');
  console.log('✅ Timeline updates dynamically when switching between patients');
  console.log('✅ Previous timeline items properly cleared when switching');
  
  console.log('\n🚀 DYNAMIC TIMELINE SYSTEM VALIDATION COMPLETE!');
});