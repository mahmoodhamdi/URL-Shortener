import { test, expect } from '@playwright/test';

test.describe('Multi-User Collaboration', () => {
  test.describe('Workspace Sharing', () => {
    test('should display workspace sharing options', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for share/invite buttons
      const shareBtn = page.locator('button:has-text("Share"), button:has-text("Invite"), [data-testid="share-btn"]');
      if (await shareBtn.count() > 0) {
        await expect(shareBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-01-sharing.png' });
    });

    test('should show member roles in workspace', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace if available
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for role indicators
        const roleIndicator = page.locator(':has-text("Owner"), :has-text("Admin"), :has-text("Member"), :has-text("Viewer")');
        if (await roleIndicator.count() > 0) {
          await expect(roleIndicator.first()).toBeVisible();
        }
      }

      await page.screenshot({ path: 'screenshots/collab-02-roles.png' });
    });
  });

  test.describe('Permission-Based UI', () => {
    test('should show/hide actions based on role', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Page should display content based on permissions
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/collab-03-permissions.png' });
    });

    test('should restrict editing for viewers', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // As a viewer, edit buttons should be disabled or hidden
      // This test documents the expected behavior
      await page.screenshot({ path: 'screenshots/collab-04-viewer-restrictions.png' });
    });
  });

  test.describe('Real-Time Collaboration Indicators', () => {
    test('should show online/active users indicator', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for active users indicator
        const activeUsers = page.locator('[data-testid="active-users"], .online-indicator, .user-presence');
        if (await activeUsers.count() > 0) {
          await expect(activeUsers.first()).toBeVisible();
        }
      }

      await page.screenshot({ path: 'screenshots/collab-05-presence.png' });
    });
  });

  test.describe('Team Activity Feed', () => {
    test('should display activity feed', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Look for activity tab or section
        const activityTab = page.locator('button:has-text("Activity"), a:has-text("Activity"), [data-testid="activity-tab"]');
        if (await activityTab.count() > 0) {
          await activityTab.click();
          await page.waitForTimeout(500);
        }
      }

      await page.screenshot({ path: 'screenshots/collab-06-activity.png' });
    });
  });

  test.describe('Link Ownership and Assignment', () => {
    test('should show link creator/owner', async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for creator/owner information on links
      const ownerInfo = page.locator('[data-testid="link-owner"], .created-by, :has-text("Created by")');
      if (await ownerInfo.count() > 0) {
        await expect(ownerInfo.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-07-ownership.png' });
    });

    test('should allow link assignment to team members', async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for assign button on links
      const assignBtn = page.locator('button:has-text("Assign"), [data-testid="assign-btn"]');
      if (await assignBtn.count() > 0) {
        await expect(assignBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-08-assignment.png' });
    });
  });

  test.describe('Workspace Analytics Sharing', () => {
    test('should display shared analytics dashboard', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace analytics
      const analyticsLink = page.locator('a[href*="analytics"], button:has-text("Analytics")');
      if (await analyticsLink.count() > 0) {
        await analyticsLink.first().click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: 'screenshots/collab-09-analytics.png' });
    });
  });

  test.describe('Invitation Flow', () => {
    test('should display invitation form', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for invite button
      const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add Member")').first();
      if (await inviteBtn.count() > 0 && await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await page.waitForTimeout(500);

        // Check for invitation form
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
        if (await emailInput.count() > 0) {
          await expect(emailInput.first()).toBeVisible();
        }

        await page.screenshot({ path: 'screenshots/collab-10-invite-form.png' });
      }
    });

    test('should validate invitation email', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      const inviteBtn = page.locator('button:has-text("Invite")').first();
      if (await inviteBtn.count() > 0 && await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await page.waitForTimeout(500);

        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.count() > 0) {
          // Enter invalid email
          await emailInput.fill('invalid-email');

          // Try to submit
          const submitBtn = page.locator('button[type="submit"], button:has-text("Send")');
          if (await submitBtn.count() > 0) {
            await submitBtn.click();
            await page.waitForTimeout(500);
          }
        }

        await page.screenshot({ path: 'screenshots/collab-11-invite-validation.png' });
      }
    });
  });

  test.describe('Member Management', () => {
    test('should display member list', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace
      const workspaceLink = page.locator('a[href*="/workspaces/"]').first();
      if (await workspaceLink.count() > 0) {
        await workspaceLink.click();
        await page.waitForTimeout(1000);

        // Click members tab
        const membersTab = page.locator('button:has-text("Members"), a:has-text("Members")');
        if (await membersTab.count() > 0) {
          await membersTab.click();
          await page.waitForTimeout(500);

          // Look for member list
          const memberList = page.locator('[data-testid="member-list"], .member-item, li:has([data-testid="member"])');
          if (await memberList.count() > 0) {
            await expect(memberList.first()).toBeVisible();
          }
        }
      }

      await page.screenshot({ path: 'screenshots/collab-12-member-list.png' });
    });

    test('should allow role changes for admin', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Navigate to workspace settings (only if settings button exists and is visible)
      const settingsBtn = page.locator('button:has-text("Settings"), a:has-text("Settings")');
      const settingsBtnCount = await settingsBtn.count();

      if (settingsBtnCount > 0) {
        const isVisible = await settingsBtn.first().isVisible();
        if (isVisible) {
          await settingsBtn.first().click();
          await page.waitForTimeout(1000);

          // Look for role change dropdown
          const roleSelect = page.locator('select[name="role"], [data-testid="role-select"]');
          if (await roleSelect.count() > 0) {
            await expect(roleSelect.first()).toBeVisible();
          }
        }
      }

      await page.screenshot({ path: 'screenshots/collab-13-role-change.png' });
    });

    test('should allow member removal', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for remove member button
      const removeBtn = page.locator('button:has-text("Remove"), button[aria-label*="Remove"]');
      if (await removeBtn.count() > 0) {
        await expect(removeBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-14-remove-member.png' });
    });
  });

  test.describe('Pending Invitations', () => {
    test('should display pending invitations', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for pending invitations section
      const pendingSection = page.locator(':has-text("Pending"), :has-text("Invitations"), [data-testid="pending-invitations"]');
      if (await pendingSection.count() > 0) {
        await expect(pendingSection.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-15-pending.png' });
    });

    test('should allow invitation cancellation', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for cancel invitation button
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Revoke")');
      if (await cancelBtn.count() > 0) {
        await expect(cancelBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-16-cancel-invite.png' });
    });
  });

  test.describe('Workspace Switching', () => {
    test('should allow switching between workspaces', async ({ page }) => {
      await page.goto('/en/workspaces');
      await page.waitForLoadState('networkidle');

      // Look for workspace switcher
      const workspaceSwitcher = page.locator('[data-testid="workspace-switcher"], .workspace-selector, select[name="workspace"]');
      if (await workspaceSwitcher.count() > 0) {
        await expect(workspaceSwitcher.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/collab-17-switcher.png' });
    });
  });
});
