import { expect, test } from "@playwright/test";

const host = "127.0.0.1";

test.describe("Login validation in a real isolated Chromium browser", () => {
  let outboundBlocked = 0;
  let authenticationSubmitted = 0;

  test.beforeEach(async ({ page }) => {
    outboundBlocked = 0;
    authenticationSubmitted = 0;
    await page.route("**/*", async (route) => {
      const request = route.request();
      const target = new URL(request.url());

      // Deny by default: no internet, real auth server, camera or recording.
      if (target.hostname !== host || target.port !== "4179") {
        outboundBlocked++;
        return route.abort("blockedbyclient");
      }
      if (
        target.pathname === "/auth/first_time_login" ||
        target.pathname === "/api/auth/first_time_login"
      ) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ admin_first_time_login: false }),
        });
      }
      // The imported axios client prefixes API requests with /api.
      // Never let Vite proxy synthetic test traffic to localhost:5000.
      if (
        target.pathname === "/login" ||
        target.pathname === "/profile" ||
        target.pathname.startsWith("/api/") ||
        target.pathname.startsWith("/auth/") ||
        target.pathname.startsWith("/ws/") ||
        target.pathname.startsWith("/live/")
      ) {
        authenticationSubmitted++;
        return route.abort("blockedbyclient");
      }
      if (request.method() !== "GET" && request.method() !== "HEAD") {
        authenticationSubmitted++;
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });

    await page.goto("/login.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("empty username/password show both localized errors without contacting auth", async ({ page }) => {
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.locator('[role="alert"]')).toHaveText([
      "Username is required",
      "Password is required",
    ]);
    await expect(page.locator('input[name="user"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(authenticationSubmitted).toBe(0);
    expect(outboundBlocked).toBe(0);
  });

  test("nonempty synthetic username still rejects missing password without a request", async ({ page }) => {
    await page.locator('input[name="user"]').fill("SyntheticUser");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("alert")).toHaveText("Password is required");
    await expect(page.locator('input[name="user"]')).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(authenticationSubmitted).toBe(0);
    expect(outboundBlocked).toBe(0);
  });
});
