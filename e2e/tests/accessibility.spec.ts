import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const HAUPTSEITEN = [
  { name: "Startseite", path: "/" },
  { name: "Meldung einreichen", path: "/submission" },
  { name: "Status-Abfrage", path: "/status" },
];

test.describe("Barrierefreiheit - Hinweisgebersystem", () => {
  for (const seite of HAUPTSEITEN) {
    test("axe-core Audit: " + seite.name + " hat keine kritischen Violations", async ({ page }) => {
      await page.goto(seite.path).catch(async () => {
        await page.goto("/");
      });

      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      const criticalViolations = results.violations.filter(
        v => v.impact === "critical" || v.impact === "serious"
      );

      if (criticalViolations.length > 0) {
        const details = criticalViolations.map(v =>
          "[" + v.impact + "] " + v.id + ": " + v.description + "
  Betroffen: " + v.nodes.slice(0, 2).map(n => n.html).join(", ")
        ).join("
");
        console.error("Violations auf " + seite.name + ":
" + details);
      }

      expect(criticalViolations.length, criticalViolations.length + " kritische Violations auf " + seite.name).toBe(0);
    });
  }

  test("Startseite: ARIA-Landmarks vorhanden", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const main = page.locator("main, [role=main]");
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test("Ueberschriften-Hierarchie ist korrekt", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test("Keyboard Navigation: Tab-Reihenfolge", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");

    for (let i = 0; i < 5; i++) {
      const focused = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        role: document.activeElement?.getAttribute("role"),
        text: document.activeElement?.textContent?.trim().substring(0, 50),
      }));

      expect(["INPUT", "A", "BUTTON", "SELECT", "TEXTAREA", "BODY"]).toContain(focused.tag);
      await page.keyboard.press("Tab");
    }
  });

  test("Formularfelder haben korrekte Labels", async ({ page }) => {
    await page.goto("/submission").catch(async () => {
      await page.goto("/report").catch(async () => {
        await page.goto("/");
      });
    });

    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["label", "aria-required-attr", "aria-valid-attr"])
      .analyze();

    const labelViolations = results.violations.filter(v => v.id === "label");
    if (labelViolations.length > 0) {
      console.warn("Label-Violations:", labelViolations.map(v =>
        v.id + ": " + v.nodes.slice(0, 2).map(n => n.html).join(", ")
      ).join("
"));
    }
    expect(labelViolations.length).toBe(0);
  });

  test("Links haben beschreibende Texte", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["link-name", "duplicate-id"])
      .analyze();

    const linkViolations = results.violations.filter(v => v.id === "link-name");
    if (linkViolations.length > 0) {
      console.warn("Links ohne beschreibende Texte:", linkViolations[0].nodes.map(n => n.html));
    }
    expect(linkViolations.length).toBe(0);
  });

  test("Farbkontrast erfuellt WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    const contrastViolations = results.violations.filter(v => v.id === "color-contrast");
    if (contrastViolations.length > 0) {
      console.warn("Kontrast-Verletzungen:", contrastViolations[0].nodes.length, "Elemente");
    }
    expect(contrastViolations.length, "Farbkontrast-Probleme gefunden").toBe(0);
  });
});
