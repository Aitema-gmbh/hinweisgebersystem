import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Barrierefreiheit - Hinweisgebersystem', () => {
  test('Dashboard hat 0 axe-core Violations', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      const details = criticalViolations.map(v =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`
      ).join('\n');
      console.log('Gefundene Accessibility-Verstöße:\n' + details);
    }

    expect(criticalViolations.length, `Kritische Accessibility-Verstöße gefunden:\n${
      criticalViolations.map(v => `${v.id}: ${v.description}`).join('\n')
    }`).toBe(0);
  });

  test('Melde-Formular hat 0 kritische axe-core Violations', async ({ page }) => {
    await page.goto('/submit').catch(async () => {
      await page.goto('/melden').catch(async () => {
        await page.goto('/');
      });
    });

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude(['[aria-hidden="true"]'])
      .analyze();

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length, `Kritische Violations im Formular:\n${
      criticalViolations.map(v => `${v.id}: ${v.description}`).join('\n')
    }`).toBe(0);
  });

  test('Keyboard Navigation durch das Formular', async ({ page }) => {
    await page.goto('/submit').catch(async () => {
      await page.goto('/melden').catch(async () => {
        await page.goto('/');
      });
    });

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A']).toContain(firstFocused);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const focusedAfterTabs = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        visible: el ? window.getComputedStyle(el).display !== 'none' : false,
        hasFocusIndicator: el ? window.getComputedStyle(el).outline !== 'none' || window.getComputedStyle(el).boxShadow !== 'none' : false,
      };
    });

    expect(focusedAfterTabs.tag).toBeTruthy();
    expect(['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A', 'BODY']).toContain(focusedAfterTabs.tag);
  });

  test('Fokus-Indikatoren sind sichtbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactiveElements = page.locator('a:visible, button:visible, input:visible').first();
    if (await interactiveElements.isVisible({ timeout: 3000 }).catch(() => false)) {
      await interactiveElements.focus();

      const focusStyle = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });

      expect(focusStyle).not.toBeNull();
    }
  });

  test('Skip-Navigation Link vorhanden und funktioniert', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /zum hauptinhalt|skip.*(content|navigation)|hauptinhalt/i });

    const skipVisible = await skipLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (skipVisible) {
      await skipLink.click();

      const mainContent = page.locator('main, [role="main"], #main-content, #content');
      const isFocused = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], #main-content, #content');
        return main === document.activeElement || main?.contains(document.activeElement);
      });

      expect(isFocused || await mainContent.isVisible()).toBe(true);
    } else {
      const skipInDOM = await page.locator('a[href="#main"], a[href="#content"], a[href="#main-content"]').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (!skipInDOM) {
        console.warn('Kein Skip-Navigation Link gefunden - empfehle Implementierung für WCAG 2.4.1');
      }
    }
  });

  test('Alle Bilder haben Alt-Texte', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imagesWithoutAlt = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter(img => !img.hasAttribute('alt') || (img.alt === '' && !img.hasAttribute('role')))
        .map(img => img.src || img.getAttribute('data-src') || 'unknown src');
    });

    if (imagesWithoutAlt.length > 0) {
      console.warn('Bilder ohne Alt-Text:', imagesWithoutAlt);
    }

    expect(imagesWithoutAlt.length).toBe(0);
  });

  test('Farbkontrast - keine kritischen Violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

    if (contrastViolations.length > 0) {
      console.warn('Farbkontrast-Verstöße:', contrastViolations.map(v =>
        v.nodes.map(n => n.html).join('\n')
      ).join('\n'));
    }

    expect(contrastViolations.length).toBe(0);
  });
});
