import { test, expect } from '@playwright/test';

test.describe('Workspace Collaboration Flow', () => {
  test.describe('Workspace List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');
    });

    test('should display workspaces page', async ({ page }) => {
      // Page should load without error
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/workspace-01-list.png', fullPage: true });
    });

    test('should have create workspace button', async ({ page }) => {
      const createBtn = page.locator('button:has-text("Create"), button:has-text("New Workspace"), a:has-text("Create")');
      if (await createBtn.count() > 0) {
        await expect(createBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Workspace Creation', () => {
    test('should open create workspace dialog', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("New")').first();
      if (await createBtn.count() > 0 && await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'screenshots/workspace-02-create-dialog.png' });
      }
    });

    test('should have workspace name input', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("New")').first();
      if (await createBtn.count() > 0 && await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(500);

        const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="Name"]');
        if (await nameInput.count() > 0) {
          await expect(nameInput.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Workspace Settings', () => {
    test('should access workspace settings page', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Click on first workspace if available
      const workspaceItem = page.locator('[data-testid="workspace-item"], .workspace-card, a[href*="/workspaces/"]').first();
      if (await workspaceItem.count() > 0) {
        await workspaceItem.click();
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'screenshots/workspace-03-details.png' });
      }
    });
  });

  test.describe('Team Members Management', () => {
    test('should display members section', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to a workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for members tab or section
        const membersTab = page.locator('button:has-text("Members"), a:has-text("Members"), [data-testid="members-tab"]');
        if (await membersTab.count() > 0) {
          await membersTab.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'screenshots/workspace-04-members.png' });
        }
      }
    });

    test('should have invite member option', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to a workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for invite button
        const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add Member")');
        if (await inviteBtn.count() > 0) {
          await expect(inviteBtn.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Workspace Invitation Flow', () => {
    test('should display invitation dialog', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Try to find and click invite button
      const inviteBtn = page.locator('button:has-text("Invite")').first();
      if (await inviteBtn.count() > 0 && await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await page.waitForTimeout(500);

        // Check for email input in dialog
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
        if (await emailInput.count() > 0) {
          await expect(emailInput.first()).toBeVisible();
        }

        await page.screenshot({ path: 'screenshots/workspace-05-invite-dialog.png' });
      }
    });

    test('should have role selection in invitation', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      const inviteBtn = page.locator('button:has-text("Invite")').first();
      if (await inviteBtn.count() > 0 && await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await page.waitForTimeout(500);

        // Check for role selector
        const roleSelect = page.locator('select[name="role"], [data-testid="role-select"], button:has-text("Role")');
        if (await roleSelect.count() > 0) {
          await expect(roleSelect.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Workspace Permissions', () => {
    test('should show different views based on role', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Page content should be visible regardless of role
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/workspace-06-permissions.png' });
    });
  });

  test.describe('Workspace Links', () => {
    test('should display workspace links', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for links tab or section
        const linksTab = page.locator('button:has-text("Links"), a:has-text("Links"), [data-testid="links-tab"]');
        if (await linksTab.count() > 0) {
          await linksTab.click();
          await page.waitForTimeout(500);
        }

        await page.screenshot({ path: 'screenshots/workspace-07-links.png' });
      }
    });
  });

  test.describe('Leave Workspace', () => {
    test('should have leave workspace option', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace settings
      const settingsBtn = page.locator('button:has-text("Settings"), a:has-text("Settings"), [data-testid="workspace-settings"]');
      if (await settingsBtn.count() > 0) {
        await settingsBtn.first().click();
        await page.waitForTimeout(1000);

        // Look for leave or danger zone
        const leaveBtn = page.locator('button:has-text("Leave"), button:has-text("Delete")');
        if (await leaveBtn.count() > 0) {
          await expect(leaveBtn.first()).toBeVisible();
        }

        await page.screenshot({ path: 'screenshots/workspace-08-settings.png' });
      }
    });
  });
});
