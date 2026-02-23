/**
 * Smoke Test: Grant Tester Access Flow
 *
 * Verifies the critical path that broke in the recent production incident:
 *   Users table → Grant button → Confirm → Firestore updated → UI confirms
 *
 * How to run (Playwright):
 *   npx playwright test tests/grant-tester-smoke.spec.ts
 *
 * Prerequisites:
 *   - Firebase emulators running (auth + firestore)
 *   - Dev server running (npm run dev)
 *   - A seeded admin user and at least one non-admin user in emulator
 *
 * What this would have caught:
 *   The UID corruption bug caused user.uid to be undefined when passed to
 *   grantTesterAccess(). This test clicks the actual Grant button and asserts
 *   the success toast appears. With the old spread-order bug, the action would
 *   fail with "Target UID required" and the success toast would never render —
 *   the test would fail on the toast assertion.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Grant Tester Access – Smoke', () => {

    test('grant button triggers success confirmation for a valid user', async ({ page }) => {
        // 1. Navigate to Users page (assumes admin is already authenticated via emulator)
        await page.goto(`${BASE_URL}/users`);

        // 2. Wait for the users table to load (at least one row visible)
        const firstRow = page.locator('table tbody tr').first();
        await expect(firstRow).toBeVisible({ timeout: 10_000 });

        // 3. Verify the first user row displays a UID (not empty/undefined)
        const uidCell = firstRow.locator('text=/^[a-zA-Z0-9]{5,}/'); // Firestore doc IDs are alphanumeric
        await expect(uidCell).toBeVisible();

        // 4. Click the Grant Tester Access button (Zap icon) on the first non-tester row
        //    The button has title="Grant Tester Access"
        const grantButton = firstRow.locator('button[title="Grant Tester Access"]');

        // If user is already a tester, skip (Revoke button would be shown instead)
        if (await grantButton.isVisible()) {
            await grantButton.click();

            // 5. Confirm modal should appear
            const confirmModal = page.locator('text=Grant Tester Access?');
            await expect(confirmModal).toBeVisible({ timeout: 3_000 });

            // 6. Click Confirm
            await page.locator('button:has-text("Confirm")').click();

            // 7. Assert: success toast appears (not an error toast)
            //    Success toast contains "Tester access granted"
            //    Error toast would contain the error message
            const successToast = page.locator('text=Tester access granted');
            await expect(successToast).toBeVisible({ timeout: 10_000 });

            // 8. Verify no error toast appeared
            const errorToast = page.locator('text=/Target UID required|Action failed/');
            await expect(errorToast).not.toBeVisible();
        } else {
            // User is already a tester — verify Revoke button exists instead
            const revokeButton = firstRow.locator('button[title="Revoke Tester Access"]');
            await expect(revokeButton).toBeVisible();
            test.skip(true, 'First user is already a tester; grant button not available');
        }
    });

    test('user objects in table always have non-empty UIDs', async ({ page }) => {
        // This test directly guards against the UID corruption root cause.
        // If the spread order is wrong, UIDs in the table would show as
        // "undefined" or be empty.
        await page.goto(`${BASE_URL}/users`);

        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 10_000 });

        const rowCount = await rows.count();
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const uidText = rows.nth(i).locator('.font-mono').first();
            const text = await uidText.textContent();
            expect(text).toBeTruthy();
            expect(text).not.toBe('undefined');
            expect(text).not.toBe('null');
            expect(text!.length).toBeGreaterThan(4);
        }
    });
});
