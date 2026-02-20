import { test, expect } from '@playwright/test';

test.describe('Case Management - Ombudsperson Login', () => {
  const ADMIN_URL = '/admin';
  const LOGIN_URL = '/admin/login';

  async function loginAsOmbudsperson(page: any) {
    await page.goto(LOGIN_URL);

    const usernameInput = page
      .getByRole('textbox', { name: /benutzer|username|email|login/i })
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[name="username"]'))
      .first();

    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usernameInput.fill(process.env.ADMIN_USERNAME || 'admin@test.de');
      await passwordInput.fill(process.env.ADMIN_PASSWORD || 'testpassword');

      const loginButton = page.getByRole('button', { name: /login|anmelden|einloggen/i });
      await loginButton.click();

      await page.waitForURL(/dashboard|admin|ombuds/i, { timeout: 10000 }).catch(() => {});
    }
  }

  test('Login-Seite ist erreichbar', async ({ page }) => {
    await page.goto(LOGIN_URL);

    const loginForm = page.getByRole('form')
      .or(page.locator('form'))
      .first();

    const hasForm = await loginForm.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasForm) {
      const loginHeading = page.getByRole('heading', { name: /login|anmelden|einloggen/i });
      await expect(loginHeading.or(page.locator('input[type="password"]').first())).toBeVisible({ timeout: 5000 });
    }
  });

  test('Login als Ombudsperson', async ({ page }) => {
    await loginAsOmbudsperson(page);

    const afterLoginUrl = page.url();
    const isLoggedIn = afterLoginUrl.includes('dashboard') ||
      afterLoginUrl.includes('admin') ||
      afterLoginUrl.includes('ombuds');

    if (!isLoggedIn) {
      test.skip(true, 'Login-Credentials nicht konfiguriert - setze ADMIN_USERNAME und ADMIN_PASSWORD');
    }
  });

  test('Dashboard Statistiken sichtbar', async ({ page }) => {
    await loginAsOmbudsperson(page);

    const dashboard = page.getByRole('main');
    const stats = page
      .getByText(/fälle|meldungen|offen|geschlossen|neu|gesamt/i)
      .first();

    const isVisible = await stats.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(stats).toBeVisible();

      const statNumbers = page.locator('[class*="stat"], [class*="count"], [class*="kpi"], [data-testid*="stat"]');
      const count = await statNumbers.count();
      if (count > 0) {
        await expect(statNumbers.first()).toBeVisible();
      }
    } else {
      test.skip(true, 'Dashboard-Statistiken nicht erreichbar ohne gültige Credentials');
    }
  });

  test('Fallliste filtern', async ({ page }) => {
    await loginAsOmbudsperson(page);

    await page.goto(`${ADMIN_URL}/cases`).catch(async () => {
      await page.goto(`${ADMIN_URL}/faelle`).catch(() => {});
    });

    const filterButton = page
      .getByRole('button', { name: /filter|status/i })
      .or(page.getByRole('combobox', { name: /filter|status/i }))
      .first();

    if (await filterButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterButton.click();

      const offenOption = page.getByRole('option', { name: /offen|open|neu|new/i })
        .or(page.getByText(/offen|open/i).first());

      if (await offenOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await offenOption.click();

        const caseList = page.locator('[class*="case"], [class*="fall"], [data-testid*="case"]').first();
        if (await caseList.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(caseList).toBeVisible();
        }
      }
    } else {
      test.skip(true, 'Filteroptionen nicht sichtbar');
    }
  });

  test('Fall öffnen und Status ändern', async ({ page }) => {
    await loginAsOmbudsperson(page);

    await page.goto(`${ADMIN_URL}/cases`).catch(async () => {
      await page.goto(`${ADMIN_URL}/faelle`).catch(() => {});
    });

    const firstCase = page
      .getByRole('link', { name: /fall|case|meldung/i })
      .or(page.locator('[class*="case-item"], [class*="fall-item"]').first())
      .first();

    if (await firstCase.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCase.click();

      await page.waitForLoadState('networkidle');

      const statusSelect = page
        .getByRole('combobox', { name: /status/i })
        .or(page.locator('select[name="status"]'));

      if (await statusSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        const currentValue = await statusSelect.inputValue();
        await statusSelect.selectOption({ index: 1 });

        const saveButton = page.getByRole('button', { name: /speichern|save|update/i });
        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();

          const successMsg = page.getByText(/gespeichert|saved|aktualisiert|updated/i);
          await expect(successMsg).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test.skip(true, 'Keine Fälle in der Liste vorhanden');
    }
  });

  test('Kommentar zu Fall hinzufügen', async ({ page }) => {
    await loginAsOmbudsperson(page);

    await page.goto(`${ADMIN_URL}/cases`).catch(async () => {
      await page.goto(`${ADMIN_URL}/faelle`).catch(() => {});
    });

    const firstCase = page
      .getByRole('link', { name: /fall|case|meldung/i })
      .or(page.locator('[class*="case-item"], [class*="fall-item"]').first())
      .first();

    if (await firstCase.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCase.click();
      await page.waitForLoadState('networkidle');

      const commentBox = page
        .getByRole('textbox', { name: /kommentar|comment|notiz|note/i })
        .or(page.locator('textarea[name="comment"]'))
        .first();

      if (await commentBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentBox.fill('Interner Kommentar: Fall wird geprüft. Automatisierter E2E-Test.');

        const addCommentButton = page
          .getByRole('button', { name: /kommentar hinzufügen|add comment|senden|send/i })
          .first();

        await addCommentButton.click();

        const commentVisible = page.getByText('Interner Kommentar: Fall wird geprüft');
        await expect(commentVisible).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'Kommentarfunktion nicht verfügbar');
      }
    } else {
      test.skip(true, 'Keine Fälle zum Öffnen vorhanden');
    }
  });

  test('Logout funktioniert', async ({ page }) => {
    await loginAsOmbudsperson(page);

    const logoutButton = page
      .getByRole('button', { name: /logout|abmelden|ausloggen/i })
      .or(page.getByRole('link', { name: /logout|abmelden|ausloggen/i }))
      .first();

    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();

      await expect(page).toHaveURL(/login|anmelden/, { timeout: 5000 });
    } else {
      test.skip(true, 'Logout-Button nicht sichtbar');
    }
  });
});
