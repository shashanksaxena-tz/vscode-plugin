import { test, expect } from '@playwright/test';

test('mock dashboard page loads and displays metrics', async ({ page }) => {
  await page.goto('/mock-dashboard');

  // Check header
  await expect(page.getByRole('heading', { name: 'My Copilot Analytics (Mock)' })).toBeVisible();
  await expect(page.getByText('Welcome back, mock@example.com')).toBeVisible();

  // Check ScoreCards
  await expect(page.getByText('Overall Score')).toBeVisible();
  await expect(page.getByText('85', { exact: true })).toBeVisible(); // Exact match to avoid partial matches

  await expect(page.getByText('Effectiveness')).toBeVisible();
  await expect(page.getByText('80', { exact: true })).toBeVisible();

  // Check Charts
  await expect(page.getByRole('heading', { name: 'Score Trend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Daily Activity' })).toBeVisible();

  // Check Coaching Plans
  await expect(page.getByRole('heading', { name: 'Your Coaching Plan' })).toBeVisible();
  await expect(page.getByText('Senior Devs')).toBeVisible();
  await expect(page.getByText('Focus on architecture')).toBeVisible();
  await expect(page.getByText('Python Experts')).toBeVisible();

  // Check Suggestions
  await expect(page.getByRole('heading', { name: 'Improvement Suggestions' })).toBeVisible();
  await expect(page.getByText('Use more keyboard shortcuts')).toBeVisible();
});

test('mock team dashboard page loads and displays members', async ({ page }) => {
  await page.goto('/mock-team-dashboard');

  // Check header
  await expect(page.getByRole('heading', { name: 'Team Analytics (Mock)' })).toBeVisible();

  // Check Table Headers
  await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Cohorts' })).toBeVisible();

  // Check Alice
  await expect(page.getByText('Alice', { exact: true })).toBeVisible();
  await expect(page.getByText('alice@example.com')).toBeVisible();
  await expect(page.getByText('Senior Devs')).toBeVisible();
  await expect(page.getByText('87')).toBeVisible(); // Score

  // Check Bob
  await expect(page.getByText('Bob', { exact: true })).toBeVisible();
  await expect(page.getByText('N/A')).toBeVisible();
});
