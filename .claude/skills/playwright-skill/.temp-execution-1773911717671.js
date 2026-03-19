const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = { passed: [], failed: [] };

  function log(status, msg) {
    if (status === 'PASS') results.passed.push(msg);
    else { results.failed.push(msg); console.error('FAIL:', msg); }
  }

  async function checkOverflow(page, viewport, pageName) {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    if (scrollWidth <= clientWidth + 5) {
      log('PASS', `${pageName} @ ${viewport}px: no overflow (${scrollWidth} <= ${clientWidth})`);
    } else {
      log('FAIL', `${pageName} @ ${viewport}px: overflow! scroll=${scrollWidth} > client=${clientWidth}`);
    }
  }

  // Login at desktop, then check pages at mobile
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', 'admin@bestsolutions.com');
  await page.fill('input[name="password"]', 'Admin@1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Find project
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await checkOverflow(page, 375, 'Dashboard');

  let projectId = null;
  const clientLinks = await page.$$('a[href^="/clients/"]');
  for (const link of clientLinks) {
    const href = await link.getAttribute('href');
    if (href && href.match(/\/clients\/[a-f0-9-]+$/)) {
      await page.goto(`http://localhost:3000${href}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const projLinks = await page.$$('a[href^="/projects/"]');
      for (const pl of projLinks) {
        const ph = await pl.getAttribute('href');
        if (ph && ph.match(/\/projects\/[a-f0-9-]+$/)) { projectId = ph.split('/').pop(); break; }
      }
      break;
    }
  }

  if (projectId) {
    // Posts page
    await page.goto(`http://localhost:3000/projects/${projectId}/posts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await checkOverflow(page, 375, 'Posts');
    await page.screenshot({ path: '/tmp/ss-resp-posts-mobile-fixed.png', fullPage: true });

    // Monthly Plan page
    await page.goto(`http://localhost:3000/projects/${projectId}/monthly-plan`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await checkOverflow(page, 375, 'Monthly Plan');
    await page.screenshot({ path: '/tmp/ss-resp-monthlyplan-mobile-fixed.png', fullPage: true });

    // Calendar
    await page.goto(`http://localhost:3000/projects/${projectId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await checkOverflow(page, 375, 'Calendar');

    // Settings
    await page.goto(`http://localhost:3000/projects/${projectId}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await checkOverflow(page, 375, 'Settings');

    // Connect
    await page.goto(`http://localhost:3000/projects/${projectId}/connect`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await checkOverflow(page, 375, 'Connect');

    // Logs
    await page.goto(`http://localhost:3000/projects/${projectId}/logs`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await checkOverflow(page, 375, 'Logs');
  }

  // Login page
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await checkOverflow(page, 375, 'Login');

  // New client
  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await checkOverflow(page, 375, 'New Client');

  console.log('\n=== Responsive Recheck Report ===');
  console.log(`PASSED: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`  [PASS] ${p}`));
  console.log(`FAILED: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  [FAIL] ${f}`));

  await browser.close();
})();
