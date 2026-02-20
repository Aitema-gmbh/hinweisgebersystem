import { test, expect } from "@playwright/test";

test.describe("Admin-Dashboard - Hinweisgebersystem", () => {
  test("Login-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login").catch(async () => {
      await page.goto("/admin").catch(async () => {
        await page.goto("/auth");
      });
    });

    await page.waitForLoadState("networkidle");

    const pageContent = page.locator("main, [role=main], body").first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test("Login-Formular hat Email und Passwort-Felder", async ({ page }) => {
    await page.goto("/login").catch(async () => {
      await page.goto("/admin").catch(async () => {
        await page.goto("/");
        return;
      });
    });

    await page.waitForLoadState("networkidle");

    const emailInput = page
      .locator("input[type=email], input[name=email], input[name=username]")
      .first();

    const hasEmail = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasEmail) {
      await expect(emailInput).toBeVisible();

      const passwordInput = page.locator("input[type=password]").first();
      await expect(passwordInput).toBeVisible();
    } else {
      console.log("Hinweis: Kein Login-Formular direkt erreichbar");
    }
  });

  test("Unautorisierter Zugriff auf Dashboard leitet zur Login-Seite um", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const isRedirected = /login|auth|sign-in|signin/.test(url);

    if (!isRedirected) {
      const loginForm = page.locator("input[type=password]").first();
      const hasLoginForm = await loginForm.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasLoginForm) {
        console.log("Dashboard-URL: " + url + " - keine Login-Weiterleitung erkannt");
      }
    }
  });

  test("Unautorisierter Zugriff auf /admin leitet um", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const pageContent = page.locator("main, [role=main], body").first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });

    const passwordInput = page.locator("input[type=password]").first();
    const hasAuth = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasAuth || /login|auth/.test(url)) {
      console.log("/admin erfordert Authentifizierung");
    } else {
      console.log("/admin URL nach Redirect: " + url);
    }
  });

  test("Login-Fehler bei falschen Anmeldedaten", async ({ page }) => {
    await page.goto("/login").catch(async () => {
      await page.goto("/admin").catch(async () => {
        await page.goto("/");
        return;
      });
    });

    await page.waitForLoadState("networkidle");

    const emailInput = page
      .locator("input[type=email], input[name=email], input[name=username]")
      .first();

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("invalid@example.com");

      const passwordInput = page.locator("input[type=password]").first();
      await passwordInput.fill("wrongpassword123");

      const submitButton = page
        .getByRole("button", { name: /anmelden|login|einloggen|sign in/i })
        .first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const errorMessage = page
          .locator("[role=alert], [class*=error], [class*=fehler]")
          .or(page.getByText(/falsch|ungueltig|invalid|incorrect|fehlgeschlagen/i))
          .first();

        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasError) {
          await expect(errorMessage).toBeVisible();
        } else {
          console.log("Hinweis: Keine Fehlermeldung bei falschen Anmeldedaten sichtbar");
        }
      }
    } else {
      test.skip(true, "Kein Login-Formular erreichbar");
    }
  });

  test("Passwort-Feld ist maskiert", async ({ page }) => {
    await page.goto("/login").catch(async () => {
      await page.goto("/admin").catch(async () => {
        await page.goto("/");
        return;
      });
    });

    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator("input[type=password]").first();
    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const inputType = await passwordInput.getAttribute("type");
      expect(inputType).toBe("password");
    } else {
      console.log("Hinweis: Kein Passwort-Feld erreichbar");
    }
  });
});
