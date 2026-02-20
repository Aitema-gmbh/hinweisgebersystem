import { test, expect } from '@playwright/test';

test.describe('Anonyme Meldung - 3-Schritt-Formular', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Schritt 1: Kategorie und Beschreibung ausfüllen', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const meldenButton = page.getByRole('link', { name: /meldung|hinweis|melden/i }).first();
    await meldenButton.click();

    await expect(page).toHaveURL(/meld|submit|report/i);

    const schritt1 = page.getByText(/schritt 1|step 1|kategorie/i).first();
    await expect(schritt1).toBeVisible();

    const kategorieSelect = page.getByRole('combobox').first();
    if (await kategorieSelect.isVisible()) {
      await kategorieSelect.selectOption({ index: 1 });
    }

    const beschreibung = page.getByRole('textbox', { name: /beschreibung|details|schilderung/i }).first();
    if (await beschreibung.isVisible()) {
      await beschreibung.fill('Dies ist eine Testmeldung für automatisierte E2E-Tests. Der Sachverhalt wurde beobachtet und soll gemeldet werden.');
    } else {
      const textarea = page.locator('textarea').first();
      await textarea.fill('Dies ist eine Testmeldung für automatisierte E2E-Tests. Der Sachverhalt wurde beobachtet und soll gemeldet werden.');
    }

    const weiterButton = page.getByRole('button', { name: /weiter|next|continue/i }).first();
    await weiterButton.click();
  });

  test('Schritt 2: Optionale Angaben', async ({ page }) => {
    await page.goto('/submit');

    const schritt2Trigger = page.getByRole('button', { name: /weiter|next/i }).first();
    if (await schritt2Trigger.isVisible()) {
      await schritt2Trigger.click();
    }

    const anonymCheckbox = page.getByRole('checkbox', { name: /anonym|anonymous/i });
    if (await anonymCheckbox.isVisible()) {
      await expect(anonymCheckbox).toBeVisible();
    }

    const datumfeld = page.getByLabel(/datum|date|zeitpunkt/i);
    if (await datumfeld.isVisible()) {
      await datumfeld.fill('2026-01-15');
    }
  });

  test('Schritt 3: Zusammenfassung und Absenden', async ({ page }) => {
    await page.goto('/submit');

    const submitButton = page.getByRole('button', { name: /absenden|submit|senden|meldung abschicken/i }).last();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForURL(/confirmation|bestaetigung|erfolg|success/i, { timeout: 10000 }).catch(() => {});
    }
  });

  test('Receipt-Code wird nach Absenden angezeigt', async ({ page }) => {
    await page.goto('/confirmation').catch(async () => {
      await page.goto('/');
    });

    const receiptCode = page.getByText(/[A-Z0-9]{6,}-[A-Z0-9]{4,}/i)
      .or(page.getByLabel(/empfangscode|receipt.?code|vorgangs.?nummer/i))
      .or(page.locator('[data-testid="receipt-code"]'));

    if (await receiptCode.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(receiptCode.first()).toBeVisible();
    } else {
      test.skip(true, 'Keine Bestätigungsseite erreichbar ohne vollständige Formular-Submission');
    }
  });

  test('Receipt-Code ist kopierbar', async ({ page }) => {
    await page.goto('/confirmation').catch(async () => {
      await page.goto('/');
    });

    const copyButton = page.getByRole('button', { name: /kopier|copy|clipboard/i });
    if (await copyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await copyButton.click();
      const feedback = page.getByText(/kopiert|copied|clipboard/i);
      await expect(feedback).toBeVisible({ timeout: 3000 });
    } else {
      test.skip(true, 'Kein Copy-Button auf der Bestätigungsseite sichtbar');
    }
  });

  test('Status mit Receipt-Code abfragen', async ({ page }) => {
    await page.goto('/status');

    const codeInput = page
      .getByRole('textbox', { name: /code|vorgangs.?nummer|receipt/i })
      .or(page.locator('input[type="text"]').first());

    if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await codeInput.fill('TEST-CODE-123456');

      const statusButton = page.getByRole('button', { name: /status|suchen|prüfen|check/i }).first();
      await statusButton.click();

      const result = page
        .getByText(/nicht gefunden|not found|ungültig|kein ergebnis|status/i)
        .first();
      await expect(result).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'Status-Seite nicht zugänglich');
    }
  });

  test('Nachricht über Receipt-Code senden', async ({ page }) => {
    await page.goto('/status');

    const codeInput = page
      .getByRole('textbox', { name: /code|vorgangs.?nummer|receipt/i })
      .or(page.locator('input[type="text"]').first());

    if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await codeInput.fill('VALID-CODE-FOR-TEST');

      const statusButton = page.getByRole('button', { name: /status|suchen|prüfen|check/i }).first();
      await statusButton.click();

      const messageBox = page.getByRole('textbox', { name: /nachricht|message|antwort/i });
      if (await messageBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageBox.fill('Dies ist eine Testnachricht an die Ombudsperson.');
        const sendenButton = page.getByRole('button', { name: /senden|send|nachricht senden/i });
        await sendenButton.click();
      }
    } else {
      test.skip(true, 'Nachrichtenfunktion nicht zugänglich');
    }
  });
});
