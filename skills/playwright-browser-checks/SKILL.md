---
name: playwright-browser-checks
description: Use when validating frontend behavior, screenshots, responsive layouts, browser rendering, local dev servers, navigation, forms, console errors, or visual regressions with Playwright/Chromium inside the pi-agent container.
---

# Playwright Browser Checks

Use this skill for browser-based frontend validation in the `pi-agent` container.

Playwright and Chromium are installed in the container. Prefer short, targeted checks because the machine may have limited shared resources.

Default workflow:

1. Start or identify the relevant local dev server.
2. Use one Chromium instance and close it when finished.
3. Check the page title, console errors, key interactions, screenshots, and responsive viewports relevant to the change.
4. Keep screenshots and temporary artifacts out of committed files unless the user asks for them.

Quick title check:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); await page.goto('http://127.0.0.1:3000'); console.log(await page.title()); await browser.close(); })();"
```

Console and screenshot check:

```bash
node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const messages = [];
  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
  });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/playwright-check.png', fullPage: true });
  console.log({ title: await page.title(), messages });
  await browser.close();
})();
NODE
```

Responsive check pattern:

```bash
node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    console.log(`${viewport.width}x${viewport.height}: ${await page.title()}`);
    await page.close();
  }
  await browser.close();
})();
NODE
```

When checking UI quality, verify no obvious overlap, horizontal overflow, clipped button text, unreadable controls, or blank canvases/media. For 3D/canvas work, capture screenshots and verify pixels are nonblank.
