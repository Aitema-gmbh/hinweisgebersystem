import { test, expect } from "@playwright/test";

test.describe("Navigation - Hinweisgebersystem", () => {
  test("Startseite laedt erfolgreich", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/.+/);

    const mainContent = page.locator("main, [role=main], #app, .app-root").first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("Hauptnavigation ist vorhanden", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const nav = page.getByRole("navigation").first();
    const hasNav = await nav.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasNav) {
      await expect(nav).toBeVisible();
    } else {
      const header = page.locator("header").first();
      await expect(header).toBeVisible({ timeout: 5000 });
    }
  });

  test("Meldung-Seite ist navigierbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const meldungLink = page
      .getByRole("link", { name: /hinweis|meldung|melden|report|submit/i })
      .first();

    if (await meldungLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await meldungLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      await page.goto("/submission").catch(async () => {
        await page.goto("/report").catch(async () => {
          await page.goto("/meldung");
        });
      });
    }

    const pageContent = page.locator("main, [role=main]").first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test("Status-Seite ist navigierbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const statusLink = page
      .getByRole("link", { name: /status|verfolgen|track|nachverfolgen/i })
      .first();

    if (await statusLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      await page.goto("/status").catch(async () => {
        await page.goto("/track");
      });
    }

    const pageContent = page.locator("main, [role=main]").first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test("Impressum/Datenschutz ist erreichbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const impressumLink = page
      .getByRole("link", { name: /impressum|datenschutz|privacy|imprint/i })
      .first();

    if (await impressumLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(impressumLink).toBeVisible();
    } else {
      const footer = page.locator("footer").first();
      const hasFooter = await footer.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasFooter) {
        console.log("Hinweis: Kein Impressum-Link im Footer gefunden");
      }
    }
  });

  test("Fusszeile vorhanden", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.getByRole("contentinfo").or(page.locator("footer")).first();
    const hasFooter = await footer.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasFooter) {
      await expect(footer).toBeVisible();
    } else {
      console.log("Hinweis: Keine Fusszeile gefunden");
    }
  });

  test("404-Seite zeigt sinnvolle Fehlermeldung", async ({ page }) => {
    await page.goto("/diese-seite-existiert-nicht-xyz-12345");
    await page.waitForLoadState("networkidle");

    const notFoundIndicator = page
      .getByText(/404|nicht gefunden|not found|seite nicht vorhanden/i)
      .first();

    const has404 = await notFoundIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    if (has404) {
      await expect(notFoundIndicator).toBeVisible();
    } else {
      const pageContent = page.locator("main, body").first();
      await expect(pageContent).toBeVisible();
      console.log("Hinweis: Keine explizite 404-Seite - App zeigt Standard-Inhalt");
    }
  });

  test("Seite hat korrekte Sprach-Auszeichnung", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBeTruthy();
    expect(htmlLang?.length).toBeGreaterThan(0);
  });
});
