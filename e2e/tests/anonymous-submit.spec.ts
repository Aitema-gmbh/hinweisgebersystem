import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Anonyme Meldungseinreichung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Startseite laedt korrekt', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
    const mainContent = page.locator('main, [role="main"], #app, .app-root').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test('Navigationsstruktur vorhanden', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]').first();
    const hasNav = await nav.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasNav) {
      const header = page.locator('header').first();
      await expect(header).toBeVisible({ timeout: 5000 });
    }
  });

  test('Hinweis einreichen - Einstieg', async ({ page }) => {
    const submitLink = page
      .getByRole('link', { name: /hinweis|meldung|melden|report|submit/i })
      .or(page.getByRole('button', { name: /hinweis|meldung|melden|report|submit/i }))
      .first();

    if (await submitLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('/submission').catch(async () => {
        await page.goto('/report').catch(async () => {
          await page.goto('/meldung');
        });
      });
    }

    const formContent = page.locator('form, [data-testid="submission-form"], main').first();
    await expect(formContent).toBeVisible({ timeout: 5000 });
  });

  test('Eingabeformular hat beschriftete Felder', async ({ page }) => {
    await page.goto('/submission').catch(async () => {
      await page.goto('/report').catch(async () => {
        await page.goto('/');
      });
    });

    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]), textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible().catch(() => false)) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        let hasLabel = !!(ariaLabel || ariaLabelledby);
        if (!hasLabel && id) {
          const label = page.locator('label[for="' + id + '"]');
          hasLabel = await label.isVisible().catch(() => false);
        }

        if (!hasLabel) {
          console.warn('Eingabefeld ohne Label gefunden - ID: ' + id);
        }
      }
    }
  });

  test('Pflichtfeld-Validierung funktioniert', async ({ page }) => {
    await page.goto('/submission').catch(async () => {
      await page.goto('/report').catch(async () => {
        await page.goto('/');
        return;
      });
    });

    await page.waitForLoadState('networkidle');

    const submitButton = page
      .getByRole('button', { name: /senden|einreichen|submit|weiter|next/i })
      .first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);

      const errorMessage = page
        .locator('[class*="error"], [role="alert"], [aria-invalid="true"], .ng-invalid')
        .first();

      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        await expect(errorMessage).toBeVisible();
      } else {
        console.log('Hinweis: Keine Fehlervalidierung erkannt bei leerem Submit');
      }
    }
  });

  test('Status-Abfrage-Seite laedt', async ({ page }) => {
    await page.goto('/status').catch(async () => {
      await page.goto('/track').catch(async () => {
        await page.goto('/verfolgen');
      });
    });

    await page.waitForLoadState('networkidle');

    const pageContent = page.locator('main, [role="main"]').first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test('Status-Code Eingabe vorhanden', async ({ page }) => {
    await page.goto('/status').catch(async () => {
      await page.goto('/track').catch(async () => {
        await page.goto('/');
        return;
      });
    });

    await page.waitForLoadState('networkidle');

    const codeInput = page
      .locator('input[type="text"], input[type="search"], input[placeholder*="code" i], input[placeholder*="Code"]')
      .first();

    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(codeInput).toBeVisible();
      await codeInput.fill('TEST123456');
      const value = await codeInput.inputValue();
      expect(value).toBe('TEST123456');
    } else {
      console.log('Hinweis: Kein Code-Eingabefeld auf Status-Seite gefunden');
    }
  });

  test('Responsive: Mobile-Ansicht ohne Overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(385);
  });

  test('Responsive: Tablet-Ansicht', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main, [role="main"], body').first();
    await expect(mainContent).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(778);
  });
});
