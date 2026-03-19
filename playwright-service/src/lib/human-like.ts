import type { Page } from "playwright";

/**
 * Wait a random amount of milliseconds between min and max.
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type text character by character with random delays (50-150ms per char).
 * Mimics human typing speed to avoid bot detection.
 */
export async function slowType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(300, 600);

  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });
    // Random delay between 50-150ms per character
    const charDelay = Math.floor(Math.random() * 100) + 50;
    await new Promise((resolve) => setTimeout(resolve, charDelay));

    // Occasionally pause longer (simulating thinking)
    if (Math.random() < 0.05) {
      await randomDelay(500, 1500);
    }
  }
}

/**
 * Type text directly into the focused element using keyboard,
 * without needing a specific selector (for contenteditable divs).
 */
export async function slowTypeKeyboard(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });
    const charDelay = Math.floor(Math.random() * 100) + 50;
    await new Promise((resolve) => setTimeout(resolve, charDelay));

    // Occasionally pause longer
    if (Math.random() < 0.05) {
      await randomDelay(500, 1500);
    }
  }
}

/**
 * Scroll the page naturally — small increments with random pauses.
 */
export async function humanScroll(page: Page, distance: number = 300): Promise<void> {
  const steps = Math.floor(Math.random() * 3) + 2;
  const perStep = Math.floor(distance / steps);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, perStep + Math.floor(Math.random() * 50) - 25);
    await randomDelay(200, 500);
  }
}

/**
 * Move the mouse to a random position on the page.
 * Helps avoid bot detection by simulating natural cursor movement.
 */
export async function randomMouseMove(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const x = Math.floor(Math.random() * viewport.width * 0.8) + viewport.width * 0.1;
  const y = Math.floor(Math.random() * viewport.height * 0.8) + viewport.height * 0.1;

  // Move in steps for more natural movement
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 3 });
  await randomDelay(100, 300);
}

/**
 * Click an element with human-like behavior:
 * move mouse to element, slight pause, then click.
 */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
  await randomDelay(200, 500);

  const box = await element.boundingBox();
  if (box) {
    // Click at a slightly random position within the element
    const offsetX = Math.floor(Math.random() * box.width * 0.6) + box.width * 0.2;
    const offsetY = Math.floor(Math.random() * box.height * 0.6) + box.height * 0.2;
    await page.mouse.move(box.x + offsetX, box.y + offsetY, { steps: 3 });
    await randomDelay(100, 200);
    await page.mouse.click(box.x + offsetX, box.y + offsetY);
  } else {
    // Fallback to regular click
    await element.click();
  }

  await randomDelay(300, 800);
}
