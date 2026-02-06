import { test, expect, Page } from '@playwright/test';

// Test credentials
const ADMIN_EMAIL = 'admin@learnhub.local';
const ADMIN_PASSWORD = 'admin123';

// Helper to login with more robust waiting
async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  
  // Verify we're logged in by checking for dashboard content
  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
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
    await page.waitForLoadState('networkidle');
    
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
  });

  test('should logout and redirect to login', async ({ page }) => {
    await login(page);
    
    // Click user dropdown
    await page.click('button:has(.rounded-full.bg-blue-600)');
    await page.waitForTimeout(500);
    
    // Click Sign out
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
    // Navigate to users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Should see users page
    await expect(page.locator('h1:has-text("Users")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=admin@learnhub.local')).toBeVisible({ timeout: 10000 });
  });

  test('should create new user', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Users")')).toBeVisible({ timeout: 10000 });
    
    // Click Add User
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    // Fill form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'testpass123');
    
    // Submit
    await page.click('button:has-text("Create User")');
    
    // Should see new user
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 15000 });
  });

  test('should filter users by role', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=admin@learnhub.local')).toBeVisible({ timeout: 10000 });
    
    // Filter by admin role
    await page.selectOption('select >> nth=0', 'admin');
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Groups")')).toBeVisible({ timeout: 10000 });
  });

  test('should create group', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Groups")')).toBeVisible({ timeout: 10000 });
    
    // Click Add Group
    await page.click('button:has-text("Add Group"), button:has-text("Create Group")');
    await page.waitForTimeout(500);
    
    // Fill form
    const groupName = `Test Group ${Date.now()}`;
    await page.fill('input#name', groupName);
    
    // Submit
    await page.click('button:has-text("Create Group"), button:has-text("Save")');
    
    // Should see new group
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Categories")')).toBeVisible({ timeout: 10000 });
  });

  test('should create category', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Categories")')).toBeVisible({ timeout: 10000 });
    
    // Click Add Category
    await page.click('button:has-text("Add Category"), button:has-text("Create Category")');
    await page.waitForTimeout(500);
    
    // Fill form
    const categoryName = `Category ${Date.now()}`;
    await page.fill('input#name', categoryName);
    
    // Submit
    await page.click('button:has-text("Create Category"), button:has-text("Save")');
    
    // Should see new category
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Courses")')).toBeVisible({ timeout: 10000 });
  });

  test('should create new course', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Courses")')).toBeVisible({ timeout: 10000 });
    
    // Click Create Course
    await page.click('button:has-text("Create Course")');
    await page.waitForTimeout(500);
    
    // Fill form
    const courseName = `E2E Test Course ${Date.now()}`;
    await page.fill('input#name', courseName);
    
    // Submit
    await page.click('button:has-text("Create Course"), button:has-text("Save")');
    
    // Should see new course
    await expect(page.locator(`text=${courseName}`)).toBeVisible({ timeout: 15000 });
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Leaderboard")')).toBeVisible({ timeout: 10000 });
  });

  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible({ timeout: 10000 });
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  });

  test('should load certificates page', async ({ page }) => {
    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Certificate/);
  });

  test('should load catalog page', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Course Catalog/);
  });

  test('should load my courses page', async ({ page }) => {
    await page.goto('/my-courses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/My Courses/);
  });

  test('should load questions page', async ({ page }) => {
    await page.goto('/questions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Question Bank/);
  });
});

// =====================
// DASHBOARD TESTS
// =====================
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load dashboard with stats', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Users')).toBeVisible();
  });
});
