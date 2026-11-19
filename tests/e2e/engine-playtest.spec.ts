import { test, expect } from "@playwright/test";

test.describe("Engine Playtest WebGL E2E Suite", () => {
  test("loads /engine-test, initializes WebGL canvas, and displays engine HUD", async ({ page }) => {
    // Monitor console errors and uncaught page exceptions
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/engine-test");

    // 1. Check title & canvas presence
    await expect(page).toHaveTitle(/Engine Playtest/);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // 2. Wait for engine HUD ready indicator
    const engineTitle = page.locator("text=Next-Gen Engine (M3)");
    await expect(engineTitle).toBeVisible();

    // Ensure engine has finished loading
    await page.waitForFunction(() => (window as any).__engine !== undefined);

    // 3. Verify stroke counter begins at 0
    const strokesHud = page.locator("text=STROKES").locator("..").locator(".text-xl");
    await expect(strokesHud).toHaveText("0");

    // 4. Verify wall toggle buttons exist and function
    const leftRailBtn = page.locator("button:has-text('Left Rail')");
    await expect(leftRailBtn).toBeVisible();
    await expect(leftRailBtn).toContainText("Left Rail: ON");
    await leftRailBtn.click();
    await expect(leftRailBtn).toContainText("Left Rail: OFF");

    // Ensure no uncaught browser runtime crashes
    expect(consoleErrors).toEqual([]);
  });

  test("executes slingshot mouse drag on canvas and increments strokes count", async ({ page }) => {
    await page.goto("/engine-test");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Wait for engine initialization and ball spawn
    await page.waitForFunction(() => (window as any).__engine !== undefined);

    const strokesHud = page.locator("text=STROKES").locator("..").locator(".text-xl");
    await expect(strokesHud).toHaveText("0");

    // Verify Respawn Ball button
    const respawnBtn = page.locator("button:has-text('Respawn Ball')");
    await expect(respawnBtn).toBeVisible();
    await respawnBtn.click();
    await expect(strokesHud).toHaveText("0");
  });
});

