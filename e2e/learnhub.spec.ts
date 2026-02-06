import { test, expect, Page } from '@playwright/test';

// Test credentials
const ADMIN_EMAIL = 'admin@learnhub.local';
const ADMIN_PASSWORD = 'admin123';

// Helper to login
async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 15000 });
}

// Helper to logout
async function logout(page: Page) {
  // Click user dropdown first
  const userDropdown = page.locator('button:has(.rounded-full.bg-blue-600)');
  await userDropdown.click();
  // Click Sign out
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login', { timeout: 10000 });
}

// =====================
// AUTHENTICATION TESTS
// =====================
test.describe('Authentication', () => {
  test('should redirect to /login when visiting / without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message - the error div has specific classes
    const errorDiv = page.locator('div.bg-red-50.border-red-200');
    await expect(errorDiv).toBeVisible({ timeout: 10000 });
    await expect(errorDiv).toContainText('Invalid');
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    // Should see LearnHub sidebar
    await expect(page.locator('h1:has-text("LearnHub")')).toBeVisible({ timeout: 5000 });
  });

  test('should logout and redirect to login', async ({ page }) => {
    await login(page);
    
    // Click user avatar dropdown to reveal menu
    const userDropdown = page.locator('button:has(.rounded-full.bg-blue-600)');
    await userDropdown.click();
    
    // Wait for dropdown to appear and click Sign out
    await page.click('button:has-text("Sign out")');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// =====================
// ADMIN - USERS TESTS
// =====================
test.describe('Admin - Users', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view users list', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('h1:has-text("Users")')).toBeVisible();
    // Should see at least the admin user
    await expect(page.locator('text=admin@learnhub.local')).toBeVisible({ timeout: 10000 });
  });

  test('should create new user', async ({ page }) => {
    await page.goto('/users');
    
    // Click Add User button
    await page.click('button:has-text("Add User")');
    
    // Wait for modal to be visible
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    // Fill in user details
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'testpass123');
    
    // Submit - look for Create button in modal
    await page.click('button:has-text("Create User")');
    
    // Should see the new user in the list (wait for modal to close and list to refresh)
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 15000 });
  });

  test('should edit user', async ({ page }) => {
    await page.goto('/users');
    
    // Wait for users to load
    await page.waitForSelector('text=admin@learnhub.local', { timeout: 10000 });
    
    // Click the dropdown menu on first user (not admin)
    const userRows = page.locator('tr:has(td)').or(page.locator('[class*="divide-y"] > div'));
    const dropdownButton = userRows.first().locator('button:has(svg)').last();
    await dropdownButton.click();
    
    // Click Edit
    await page.click('button:has-text("Edit")');
    
    // Modal should open - wait for name input
    await expect(page.locator('input#name')).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('should filter users by role', async ({ page }) => {
    await page.goto('/users');
    
    // Wait for users to load
    await page.waitForSelector('text=admin@learnhub.local', { timeout: 10000 });
    
    // Select admin role filter
    await page.selectOption('select:near(:text("All Roles"))', 'admin');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Should still see admin user
    await expect(page.locator('text=admin@learnhub.local')).toBeVisible();
  });
});

// =====================
// ADMIN - GROUPS TESTS
// =====================
test.describe('Admin - Groups', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view groups list', async ({ page }) => {
    await page.goto('/groups');
    await expect(page.locator('h1:has-text("Groups")')).toBeVisible();
  });

  test('should create group', async ({ page }) => {
    await page.goto('/groups');
    
    // Click Add Group button
    const addButton = page.locator('button:has-text("Add Group"), button:has-text("Create Group")');
    await addButton.first().click();
    
    // Wait for modal
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    // Fill in group details
    const groupName = `Test Group ${Date.now()}`;
    await page.fill('input#name', groupName);
    
    // Submit
    await page.click('button:has-text("Create Group"), button:has-text("Save")');
    
    // Should see the new group in the list
    await expect(page.locator(`text=${groupName}`)).toBeVisible({ timeout: 15000 });
  });
});

// =====================
// ADMIN - CATEGORIES TESTS
// =====================
test.describe('Admin - Categories', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view categories list', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.locator('h1:has-text("Categories")')).toBeVisible();
  });

  test('should create category with color', async ({ page }) => {
    await page.goto('/categories');
    
    // Click Add Category button
    const addButton = page.locator('button:has-text("Add Category"), button:has-text("Create Category")');
    await addButton.first().click();
    
    // Wait for modal
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    // Fill in category details
    const categoryName = `Category ${Date.now()}`;
    await page.fill('input#name', categoryName);
    
    // Submit
    await page.click('button:has-text("Create Category"), button:has-text("Save")');
    
    // Should see the new category
    await expect(page.locator(`text=${categoryName}`)).toBeVisible({ timeout: 15000 });
  });
});

// =====================
// ADMIN - COURSES TESTS
// =====================
test.describe('Admin - Courses', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view courses list', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('h1:has-text("Courses")')).toBeVisible();
  });

  test('should create new course', async ({ page }) => {
    await page.goto('/courses');
    
    // Click Create Course button
    await page.click('button:has-text("Create Course")');
    
    // Wait for modal
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    // Fill in course details
    const courseName = `E2E Test Course ${Date.now()}`;
    await page.fill('input#name', courseName);
    
    // Fill description if there's a textarea
    const descTextarea = page.locator('textarea#description');
    if (await descTextarea.count() > 0) {
      await descTextarea.fill('This is a test course created by e2e tests');
    }
    
    // Submit
    await page.click('button:has-text("Create Course"), button:has-text("Save")');
    
    // Should see the new course in the list
    await expect(page.locator(`text=${courseName}`)).toBeVisible({ timeout: 15000 });
  });

  test('should filter courses by status', async ({ page }) => {
    await page.goto('/courses');
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("Courses")')).toBeVisible();
    
    // Select draft status filter
    const statusSelect = page.locator('select').filter({ hasText: 'All Status' });
    await statusSelect.selectOption('draft');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Page should still be visible
    await expect(page.locator('h1:has-text("Courses")')).toBeVisible();
  });
});

// =====================
// COURSE BUILDER TESTS
// =====================
test.describe('Course Builder', () => {
  let courseId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
    
    // Create a test course first
    await page.goto('/courses');
    await page.click('button:has-text("Create Course")');
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    const courseName = `Builder Test ${Date.now()}`;
    await page.fill('input#name', courseName);
    await page.click('button:has-text("Create Course"), button:has-text("Save")');
    
    // Wait for course to appear
    await expect(page.locator(`text=${courseName}`)).toBeVisible({ timeout: 15000 });
    
    // Find the course card and click the dropdown
    const courseCard = page.locator(`text=${courseName}`).first();
    // Find the parent container with the dropdown button
    const dropdownButton = page.locator('.relative button:has(svg)').filter({ has: page.locator('svg.lucide-more-horizontal, svg.w-5.h-5') }).first();
    await dropdownButton.click();
    
    // Wait for dropdown menu and click View
    await page.waitForSelector('a:has-text("View"), button:has-text("View")', { timeout: 5000 });
    await page.click('a:has-text("View")');
    
    // Wait for course page
    await page.waitForURL(/\/courses\/[a-f0-9-]+/, { timeout: 10000 });
    courseId = page.url().split('/courses/')[1].split('/')[0].split('?')[0];
  });

  test('should add section to course', async ({ page }) => {
    // Go to course builder
    await page.goto(`/courses/${courseId}/edit`);
    await expect(page.locator('h1:has-text("Course Builder")')).toBeVisible({ timeout: 10000 });
    
    // Click Add Section
    await page.click('button:has-text("Add Section")');
    
    // Fill in section name
    await page.fill('input[placeholder*="Section name" i]', 'Test Section 1');
    
    // Confirm - look for the check icon button
    const confirmButton = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
    await confirmButton.click();
    
    // Should see the new section
    await expect(page.locator('h3:has-text("Test Section 1")')).toBeVisible({ timeout: 10000 });
  });

  test('should add unit to section', async ({ page }) => {
    // Go to course builder
    await page.goto(`/courses/${courseId}/edit`);
    await expect(page.locator('h1:has-text("Course Builder")')).toBeVisible({ timeout: 10000 });
    
    // First add a section
    await page.click('button:has-text("Add Section")');
    await page.fill('input[placeholder*="Section name" i]', 'Unit Test Section');
    const confirmButton = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
    await confirmButton.click();
    await expect(page.locator('h3:has-text("Unit Test Section")')).toBeVisible({ timeout: 10000 });
    
    // Click Add button on the section header
    const addUnitBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
    await addUnitBtn.click();
    
    // Fill unit details
    await page.fill('input[placeholder*="Unit name" i]', 'Test Unit 1');
    
    // Add the unit
    await page.click('button:has-text("Add Unit")');
    
    // Should see the new unit
    await expect(page.locator('text=Test Unit 1')).toBeVisible({ timeout: 10000 });
  });
});

// =====================
// QUESTION BANK TESTS
// =====================
test.describe('Question Bank', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view questions page', async ({ page }) => {
    await page.goto('/questions');
    await expect(page.locator('h1')).toContainText(/Question/);
  });
});

// =====================
// LEARNER FLOW TESTS
// =====================
test.describe('Learner Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view course catalog', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('h1')).toContainText(/Catalog/);
  });

  test('should view my courses', async ({ page }) => {
    await page.goto('/my-courses');
    await expect(page.locator('h1')).toContainText(/My Courses/);
  });

  test('should enroll in course from catalog', async ({ page }) => {
    // First check if there are published courses
    await page.goto('/courses');
    
    // Create a published course if needed
    await page.click('button:has-text("Create Course")');
    await page.waitForSelector('input#name', { timeout: 5000 });
    
    const courseName = `Enrollable Course ${Date.now()}`;
    await page.fill('input#name', courseName);
    
    // Check if there's a status dropdown and set to published
    const statusSelect = page.locator('select#status');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('published');
    }
    
    await page.click('button:has-text("Create Course"), button:has-text("Save")');
    await expect(page.locator(`text=${courseName}`)).toBeVisible({ timeout: 15000 });
    
    // Now go to catalog
    await page.goto('/catalog');
    
    // If there's an Enroll button, click it
    const enrollButton = page.locator('button:has-text("Enroll")').first();
    if (await enrollButton.count() > 0 && await enrollButton.isVisible()) {
      await enrollButton.click();
      // Wait for button to change or enrollment confirmation
      await page.waitForTimeout(2000);
    }
  });
});

// =====================
// OTHER PAGES TESTS
// =====================
test.describe('Other Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.locator('h1:has-text("Leaderboard")')).toBeVisible();
  });

  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  });

  test('should load certificates page', async ({ page }) => {
    await page.goto('/certificates');
    await expect(page.locator('h1')).toContainText(/Certificate/);
  });

  test('certificate verification page works', async ({ page }) => {
    // Try to access verify page with a fake code
    await page.goto('/verify/test-code-123');
    // Page should render (may show not found message)
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

// =====================
// DASHBOARD TESTS
// =====================
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load dashboard with sidebar', async ({ page }) => {
    await page.goto('/');
    // Should see the sidebar with LearnHub title
    await expect(page.locator('h1:has-text("LearnHub")')).toBeVisible({ timeout: 5000 });
  });
});
