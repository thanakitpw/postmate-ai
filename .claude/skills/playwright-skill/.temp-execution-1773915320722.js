const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const CREDS = { email: 'admin@bestsolutions.com', password: 'Admin@1234' };
const SCREENSHOTS = '/tmp/screenshots';
const results = { passed: [], failed: [], issues: [] };

function log(status, msg) {
  if (status === 'pass') results.passed.push(msg);
  else if (status === 'issue') results.issues.push(msg);
  else results.failed.push(msg);
  console.log(`${status === 'pass' ? 'PASS' : status === 'issue' ? 'ISSUE' : 'FAIL'}: ${msg}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for hydration
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', CREDS.email);
  await page.fill('input[name="password"]', CREDS.password);
  await page.waitForTimeout(200);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  // Wait for redirect
  try {
    await page.waitForURL('**/', { timeout: 10000 });
  } catch {
    // Check if URL changed
  }
  await page.waitForTimeout(500);
}

async function checkOverflow(page, pageName) {
  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  if (overflow) log('fail', `${pageName} - horizontal overflow detected`);
  else log('pass', `${pageName} - no horizontal overflow`);
  return !overflow;
}

if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ===================== DESKTOP (1920x1080) =====================
  console.log('\n======== DESKTOP (1920x1080) ========');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // --- AUTH ---
  console.log('\n--- Auth Tests ---');
  try {
    await login(page);
    const url = page.url();
    if (!url.includes('/login')) log('pass', 'Login - redirect to dashboard');
    else {
      log('fail', `Login failed - still at: ${url}`);
      await page.screenshot({ path: `${SCREENSHOTS}/login-failed.png` });
      await browser.close();
      return;
    }
  } catch (e) {
    log('fail', `Login: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOTS}/login-error.png` });
    await browser.close();
    return;
  }

  // --- DASHBOARD ---
  console.log('\n--- Dashboard ---');
  let clientId = null, projectId = null;
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/d-dashboard.png`, fullPage: true });

    // Check stat cards (4 stat cards)
    const statCardsText = await page.locator('.rounded-xl.border.bg-white').allTextContents();
    if (statCardsText.length >= 4) log('pass', `Dashboard - ${statCardsText.length} stat cards`);
    else log('fail', `Dashboard - only ${statCardsText.length} stat cards`);

    // Check heading
    const h2 = await page.locator('h2').first().textContent().catch(() => '');
    if (h2.includes('แดชบอร์ด')) log('pass', 'Dashboard - heading ok');
    else log('fail', `Dashboard heading: ${h2}`);

    // Add client button
    const addBtn = await page.locator('a:has-text("เพิ่มลูกค้า")').isVisible().catch(() => false);
    if (addBtn) log('pass', 'Dashboard - add client button');
    else log('fail', 'Dashboard - add client button missing');

    await checkOverflow(page, 'Dashboard desktop');

    // Find client ID
    const links = await page.locator('a[href*="/clients/"]').all();
    for (const l of links) {
      const h = await l.getAttribute('href');
      const m = h.match(/\/clients\/([a-f0-9-]+)/);
      if (m) { clientId = m[1]; break; }
    }
    console.log(`Found client: ${clientId || 'none'}`);
  } catch (e) {
    log('fail', `Dashboard: ${e.message}`);
  }

  // --- NOTIFICATION BELL ---
  console.log('\n--- Notification Bell ---');
  try {
    const bellBtns = await page.locator('header button').all();
    let bellClicked = false;
    for (const btn of bellBtns) {
      const html = await btn.innerHTML();
      if (html.includes('18 8A6 6 0 006 8')) {
        await btn.click();
        await page.waitForTimeout(500);
        bellClicked = true;
        break;
      }
    }
    if (bellClicked) {
      const dropdown = await page.locator('text=การแจ้งเตือน').isVisible().catch(() => false);
      if (dropdown) {
        log('pass', 'Notification bell - dropdown shows');
        await page.screenshot({ path: `${SCREENSHOTS}/d-notification.png` });
      } else {
        log('fail', 'Notification bell - dropdown not visible');
      }
      // Close dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      log('fail', 'Notification bell - button not found');
    }
  } catch (e) {
    log('fail', `Notification bell: ${e.message}`);
  }

  // --- LOGOUT BUTTON ---
  console.log('\n--- Logout Button ---');
  try {
    const logoutBtn = await page.locator('button[title="ออกจากระบบ"]').isVisible().catch(() => false);
    if (logoutBtn) log('pass', 'Logout button visible');
    else log('fail', 'Logout button not found');
  } catch (e) {
    log('fail', `Logout button: ${e.message}`);
  }

  // --- CLIENT DETAIL ---
  if (clientId) {
    console.log('\n--- Client Detail ---');
    try {
      await page.goto(`${BASE}/clients/${clientId}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-client-detail.png`, fullPage: true });

      const h1 = await page.locator('h1, h2').first().textContent().catch(() => '');
      if (h1) log('pass', `Client detail loaded: ${h1.trim().substring(0, 30)}`);
      else log('fail', 'Client detail - no heading');

      await checkOverflow(page, 'Client detail desktop');

      // Find project
      const projLinks = await page.locator('a[href*="/projects/"]').all();
      for (const l of projLinks) {
        const h = await l.getAttribute('href');
        const m = h.match(/\/projects\/([a-f0-9-]+)/);
        if (m) { projectId = m[1]; break; }
      }
      console.log(`Found project: ${projectId || 'none'}`);
    } catch (e) {
      log('fail', `Client detail: ${e.message}`);
    }

    // --- CLIENT EDIT ---
    console.log('\n--- Client Edit ---');
    try {
      await page.goto(`${BASE}/clients/${clientId}/edit`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-client-edit.png`, fullPage: true });
      const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
      if (heading) log('pass', 'Client edit loaded');
      else log('fail', 'Client edit - no heading');
      await checkOverflow(page, 'Client edit desktop');
    } catch (e) {
      log('fail', `Client edit: ${e.message}`);
    }

    // --- CLIENT NEW ---
    console.log('\n--- Client New ---');
    try {
      await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-client-new.png`, fullPage: true });
      const nameInput = await page.locator('input[name="name"]').isVisible().catch(() => false);
      if (nameInput) log('pass', 'Client new - form visible');
      else log('fail', 'Client new - form missing');
      await checkOverflow(page, 'Client new desktop');
    } catch (e) {
      log('fail', `Client new: ${e.message}`);
    }
  }

  // --- PROJECT PAGES ---
  if (projectId) {
    // Calendar
    console.log('\n--- Calendar ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOTS}/d-calendar.png`, fullPage: true });

      // Check sidebar project nav
      const sideTexts = await page.locator('aside a').allTextContents();
      const hasCal = sideTexts.some(t => t.includes('ปฏิทิน'));
      const hasPosts = sideTexts.some(t => t.includes('รายการโพสต์'));
      const hasConnect = sideTexts.some(t => t.includes('เชื่อมต่อ'));
      const hasLogs = sideTexts.some(t => t.includes('ผลการโพสต์'));
      const hasSettings = sideTexts.some(t => t.includes('ตั้งค่า'));
      const hasMP = sideTexts.some(t => t.includes('แผนรายเดือน'));

      if (hasCal) log('pass', 'Sidebar - Calendar link');
      else log('fail', 'Sidebar - Calendar link missing');
      if (hasPosts) log('pass', 'Sidebar - Posts link');
      else log('fail', 'Sidebar - Posts link missing');
      if (hasConnect) log('pass', 'Sidebar - Connect link');
      else log('fail', 'Sidebar - Connect link missing');
      if (hasLogs) log('pass', 'Sidebar - Logs link');
      else log('fail', 'Sidebar - Logs link missing');
      if (hasSettings) log('pass', 'Sidebar - Settings link');
      else log('fail', 'Sidebar - Settings link missing');
      if (hasMP) log('pass', 'Sidebar - Monthly Plan link');
      else log('fail', 'Sidebar - Monthly Plan link missing');

      // Month/Week toggle
      const monthBtn = await page.locator('button:has-text("เดือน")').isVisible().catch(() => false);
      const weekBtn = await page.locator('button:has-text("สัปดาห์")').isVisible().catch(() => false);
      if (monthBtn && weekBtn) log('pass', 'Calendar - month/week toggle');
      else log('fail', `Calendar toggle: month=${monthBtn} week=${weekBtn}`);

      // Click week
      if (weekBtn) {
        await page.locator('button:has-text("สัปดาห์")').click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS}/d-calendar-week.png`, fullPage: true });
        log('pass', 'Calendar - week view works');
        // Switch back
        await page.locator('button:has-text("เดือน")').click();
        await page.waitForTimeout(300);
      }

      await checkOverflow(page, 'Calendar desktop');
    } catch (e) {
      log('fail', `Calendar: ${e.message}`);
    }

    // Posts List
    console.log('\n--- Posts List ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}/posts`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-posts.png`, fullPage: true });

      const h = await page.locator('h1:has-text("รายการโพสต์")').isVisible().catch(() => false);
      if (h) log('pass', 'Posts - heading visible');
      else log('fail', 'Posts - heading missing');

      const back = await page.locator('text=กลับไปปฏิทิน').isVisible().catch(() => false);
      if (back) log('pass', 'Posts - back button');
      else log('issue', 'Posts - no back button');

      await checkOverflow(page, 'Posts desktop');
    } catch (e) {
      log('fail', `Posts: ${e.message}`);
    }

    // Monthly Plan
    console.log('\n--- Monthly Plan ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}/monthly-plan`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-monthly-plan.png`, fullPage: true });

      const h = await page.locator('h1:has-text("แผนรายเดือน")').isVisible().catch(() => false);
      if (h) log('pass', 'Monthly Plan - heading visible');
      else log('fail', 'Monthly Plan - heading missing');

      await checkOverflow(page, 'Monthly Plan desktop');
    } catch (e) {
      log('fail', `Monthly Plan: ${e.message}`);
    }

    // Connect
    console.log('\n--- Connect Platform ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}/connect`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-connect.png`, fullPage: true });

      const h = await page.locator('h1:has-text("เชื่อมต่อ Platform")').isVisible().catch(() => false);
      if (h) log('pass', 'Connect - heading visible');
      else log('fail', 'Connect - heading missing');

      const secMsg = await page.locator('text=ไม่เก็บรหัสผ่าน').isVisible().catch(() => false);
      if (secMsg) log('pass', 'Connect - security message');
      else log('issue', 'Connect - no security message');

      await checkOverflow(page, 'Connect desktop');
    } catch (e) {
      log('fail', `Connect: ${e.message}`);
    }

    // Logs
    console.log('\n--- Logs ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}/logs`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-logs.png`, fullPage: true });

      const h = await page.locator('h1:has-text("ผลการโพสต์")').isVisible().catch(() => false);
      if (h) log('pass', 'Logs - heading visible');
      else log('fail', 'Logs - heading missing');

      await checkOverflow(page, 'Logs desktop');
    } catch (e) {
      log('fail', `Logs: ${e.message}`);
    }

    // Settings
    console.log('\n--- Settings ---');
    try {
      await page.goto(`${BASE}/projects/${projectId}/settings`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/d-settings.png`, fullPage: true });

      const h = await page.locator('h1:has-text("ตั้งค่าโปรเจค")').isVisible().catch(() => false);
      if (h) log('pass', 'Settings - heading visible');
      else log('fail', 'Settings - heading missing');

      const brand = await page.locator('text=Brand Profile').first().isVisible().catch(() => false);
      if (brand) log('pass', 'Settings - Brand Profile section');
      else log('fail', 'Settings - Brand Profile missing');

      const danger = await page.locator('text=ส่วนอันตราย').isVisible().catch(() => false);
      if (danger) log('pass', 'Settings - Danger zone');
      else log('fail', 'Settings - Danger zone missing');

      await checkOverflow(page, 'Settings desktop');
    } catch (e) {
      log('fail', `Settings: ${e.message}`);
    }
  }

  // --- LOGOUT FLOW ---
  console.log('\n--- Logout Flow ---');
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    const logoutBtn = page.locator('button[title="ออกจากระบบ"]');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      if (page.url().includes('/login')) log('pass', 'Logout - redirect to login');
      else log('fail', `Logout - url: ${page.url()}`);
    } else {
      log('fail', 'Logout button not found');
    }
  } catch (e) {
    log('fail', `Logout: ${e.message}`);
  }

  await ctx.close();

  // ===================== TABLET (768x1024) =====================
  console.log('\n\n======== TABLET (768x1024) ========');
  const tabCtx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabPage = await tabCtx.newPage();
  await login(tabPage);

  const tabPages = [
    { name: 'Dashboard', url: BASE },
    ...(clientId ? [{ name: 'Client', url: `${BASE}/clients/${clientId}` }] : []),
    ...(projectId ? [
      { name: 'Calendar', url: `${BASE}/projects/${projectId}` },
      { name: 'Posts', url: `${BASE}/projects/${projectId}/posts` },
      { name: 'Monthly-Plan', url: `${BASE}/projects/${projectId}/monthly-plan` },
      { name: 'Connect', url: `${BASE}/projects/${projectId}/connect` },
      { name: 'Logs', url: `${BASE}/projects/${projectId}/logs` },
      { name: 'Settings', url: `${BASE}/projects/${projectId}/settings` },
    ] : []),
  ];

  for (const pg of tabPages) {
    try {
      await tabPage.goto(pg.url, { waitUntil: 'networkidle', timeout: 15000 });
      await tabPage.waitForTimeout(500);
      await tabPage.screenshot({ path: `${SCREENSHOTS}/t-${pg.name.toLowerCase()}.png`, fullPage: true });
      await checkOverflow(tabPage, `${pg.name} tablet`);
    } catch (e) {
      log('fail', `${pg.name} tablet: ${e.message}`);
    }
  }
  await tabCtx.close();

  // ===================== MOBILE (375x812) =====================
  console.log('\n\n======== MOBILE (375x812) ========');
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobPage = await mobCtx.newPage();
  await login(mobPage);

  const mobPages = [
    { name: 'Dashboard', url: BASE },
    ...(clientId ? [{ name: 'Client', url: `${BASE}/clients/${clientId}` }] : []),
    ...(projectId ? [
      { name: 'Calendar', url: `${BASE}/projects/${projectId}` },
      { name: 'Posts', url: `${BASE}/projects/${projectId}/posts` },
      { name: 'Monthly-Plan', url: `${BASE}/projects/${projectId}/monthly-plan` },
      { name: 'Connect', url: `${BASE}/projects/${projectId}/connect` },
      { name: 'Logs', url: `${BASE}/projects/${projectId}/logs` },
      { name: 'Settings', url: `${BASE}/projects/${projectId}/settings` },
    ] : []),
  ];

  for (const pg of mobPages) {
    try {
      await mobPage.goto(pg.url, { waitUntil: 'networkidle', timeout: 15000 });
      await mobPage.waitForTimeout(500);
      await mobPage.screenshot({ path: `${SCREENSHOTS}/m-${pg.name.toLowerCase()}.png`, fullPage: true });
      await checkOverflow(mobPage, `${pg.name} mobile`);
    } catch (e) {
      log('fail', `${pg.name} mobile: ${e.message}`);
    }
  }

  // Mobile sidebar test
  console.log('\n--- Mobile Sidebar ---');
  try {
    await mobPage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await mobPage.waitForTimeout(500);
    const hamBtn = mobPage.locator('button').filter({ has: mobPage.locator('line[x1="3"][y1="6"]') }).first();
    if (await hamBtn.isVisible().catch(() => false)) {
      await hamBtn.click();
      await mobPage.waitForTimeout(500);
      await mobPage.screenshot({ path: `${SCREENSHOTS}/m-sidebar-open.png` });
      // Check sidebar is visible by looking for nav items
      const dashLink = await mobPage.locator('aside a:has-text("แดชบอร์ด")').isVisible().catch(() => false);
      if (dashLink) log('pass', 'Mobile sidebar - opens and shows nav');
      else log('fail', 'Mobile sidebar - nav not visible after open');
    } else {
      log('fail', 'Mobile hamburger not found');
    }
  } catch (e) {
    log('fail', `Mobile sidebar: ${e.message}`);
  }

  await mobCtx.close();

  // ===================== SUMMARY =====================
  console.log('\n\n================================');
  console.log('=== FINAL UI TEST REPORT ===');
  console.log('================================');
  console.log(`PASSED: ${results.passed.length}`);
  console.log(`FAILED: ${results.failed.length}`);
  console.log(`ISSUES: ${results.issues.length}`);

  if (results.failed.length > 0) {
    console.log('\n--- FAILURES ---');
    results.failed.forEach(f => console.log(`  FAIL: ${f}`));
  }
  if (results.issues.length > 0) {
    console.log('\n--- ISSUES ---');
    results.issues.forEach(i => console.log(`  ISSUE: ${i}`));
  }

  console.log('\nScreenshots saved to: /tmp/screenshots/');
  await browser.close();
})();
