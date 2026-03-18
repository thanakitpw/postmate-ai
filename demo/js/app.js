// PostMate AI — Demo JavaScript

// ============================================================
// Sidebar toggle (mobile)
// ============================================================
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

// ============================================================
// Modal
// ============================================================
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ============================================================
// Tabs
// ============================================================
function switchTab(group, tabId) {
  document.querySelectorAll(`[data-tab-group="${group}"] .tab`).forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`[data-tab-content="${group}"]`).forEach(c => c.style.display = 'none');
  document.querySelector(`[data-tab-group="${group}"] [data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(tabId)?.style.setProperty('display', 'block');
}

// ============================================================
// Toggle buttons
// ============================================================
function toggleActive(el) {
  el.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ============================================================
// Toast
// ============================================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  const icon = type === 'success' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg>' : type === 'error' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// Mock data
// ============================================================
const MOCK_CLIENTS = [
  { id: '1', name: 'ร้านอาหาร ABC', contact: 'คุณสมชาย', projects: 3, posts: 45, active: true },
  { id: '2', name: 'คลินิกความงาม XYZ', contact: 'คุณวิภา', projects: 2, posts: 28, active: true },
  { id: '3', name: 'โรงแรม Sunshine', contact: 'คุณพิมพ์', projects: 2, posts: 32, active: true },
  { id: '4', name: 'ฟิตเนส PowerGym', contact: 'คุณธนา', projects: 1, posts: 15, active: false },
];

const MOCK_PROJECTS = [
  { id: '1', clientId: '1', name: 'ABC สาขาสยาม — Facebook', platform: 'facebook', pageName: 'ABC สาขาสยาม', posts: 20, scheduled: 5, published: 12, active: true },
  { id: '2', clientId: '1', name: 'ABC — Instagram', platform: 'instagram', pageName: '@abc_restaurant', posts: 15, scheduled: 3, published: 8, active: true },
  { id: '3', clientId: '1', name: 'ABC — TikTok', platform: 'tiktok', pageName: '@abcfood', posts: 10, scheduled: 2, published: 6, active: true },
  { id: '4', clientId: '2', name: 'XYZ Clinic — Facebook', platform: 'facebook', pageName: 'XYZ Clinic', posts: 18, scheduled: 4, published: 10, active: true },
  { id: '5', clientId: '2', name: 'XYZ — Instagram', platform: 'instagram', pageName: '@xyzclinic', posts: 10, scheduled: 2, published: 5, active: true },
];

const MOCK_POSTS = [
  { id: '1', title: 'โปรโมชั่นสงกรานต์ ลด 30%', tag: 'promotion', status: 'published', type: 'promotion', date: '2026-03-15', time: '10:00', content: 'สงกรานต์นี้ ร้านอาหาร ABC จัดโปรสุดพิเศษ ลดทันที 30% ทุกเมนู! ตั้งแต่วันที่ 13-15 เมษายน 2569', hashtags: ['#สงกรานต์', '#ลด30', '#ABCrestaurant'] },
  { id: '2', title: '5 เมนูอาหารไทยยอดฮิต', tag: 'education', status: 'scheduled', type: 'regular_post', date: '2026-03-17', time: '12:00', content: 'มาทำความรู้จักกับ 5 เมนูอาหารไทยที่คนทั่วโลกหลงรัก 1. ต้มยำกุ้ง 2. ผัดไทย 3. แกงเขียวหวาน 4. ส้มตำ 5. มัสมั่น', hashtags: ['#อาหารไทย', '#ThaiFood', '#FoodLovers'] },
  { id: '3', title: 'คุณชอบเมนูไหนมากที่สุด?', tag: 'engagement', status: 'draft', type: 'engagement', date: '2026-03-18', time: '18:00', content: 'วันนี้มาโหวตกัน! คุณชอบเมนูไหนมากที่สุด? A. ต้มยำกุ้ง B. ผัดไทย C. แกงเขียวหวาน D. ส้มตำ', hashtags: ['#โหวต', '#อาหารไทย'] },
  { id: '4', title: 'แชร์บทความ เทรนด์อาหาร 2026', tag: 'education', status: 'scheduled', type: 'article_share', date: '2026-03-19', time: '09:00', content: 'เทรนด์อาหารปี 2026 ที่ร้านอาหารต้องรู้! อ่านบทความเต็มที่เว็บไซต์ของเรา', hashtags: ['#FoodTrend2026', '#RestaurantBusiness'] },
  { id: '5', title: 'รีวิวจากลูกค้า คุณแอน', tag: 'testimonial', status: 'published', type: 'regular_post', date: '2026-03-14', time: '15:00', content: '"อาหารอร่อยมาก บรรยากาศดี พนักงานบริการเยี่ยม จะมาอีกแน่นอนค่ะ" — คุณแอน ลูกค้าประจำ', hashtags: ['#รีวิว', '#ABCrestaurant', '#Testimonial'] },
  { id: '6', title: 'วันสงกรานต์ร่วมสืบสานประเพณี', tag: 'seasonal', status: 'scheduled', type: 'regular_post', date: '2026-03-20', time: '08:00', content: 'สุขสันต์วันสงกรานต์ค่ะ ร้าน ABC ขอร่วมสืบสานประเพณีไทย', hashtags: ['#สงกรานต์', '#ประเพณีไทย'] },
  { id: '7', title: 'Brand Story ทำไมเราถึงเลือกใช้วัตถุดิบท้องถิ่น', tag: 'branding', status: 'draft', type: 'regular_post', date: '2026-03-21', time: '11:00', content: 'ที่ร้าน ABC เราเชื่อว่าวัตถุดิบที่ดีคือจุดเริ่มต้นของอาหารที่ดี เราเลือกใช้วัตถุดิบท้องถิ่นจากเกษตรกรไทย', hashtags: ['#BrandStory', '#LocalIngredients', '#ABCrestaurant'] },
  { id: '8', title: 'ผลโพสต์ล้มเหลว Connection timeout', tag: 'promotion', status: 'failed', type: 'promotion', date: '2026-03-16', time: '14:00', content: 'โปรโมชั่นพิเศษ ซื้อ 1 แถม 1', hashtags: ['#โปรโมชั่น'] },
];

const MOCK_LOGS = [
  { postTitle: 'โปรโมชั่นสงกรานต์ ลด 30%', platform: 'facebook', status: 'success', date: '15 มี.ค. 2569 10:02', postId: 'fb_123456', error: null },
  { postTitle: 'รีวิวจากลูกค้า คุณแอน', platform: 'facebook', status: 'success', date: '14 มี.ค. 2569 15:03', postId: 'fb_123455', error: null },
  { postTitle: 'ผลโพสต์ล้มเหลว Connection timeout', platform: 'facebook', status: 'failed', date: '16 มี.ค. 2569 14:01', postId: null, error: 'Connection timeout after 30s — VPS unreachable', retry: 2 },
  { postTitle: 'โปรโมชั่นสงกรานต์ ลด 30%', platform: 'facebook', status: 'success', date: '15 มี.ค. 2569 10:02', postId: 'fb_123456', error: null },
];

// ============================================================
// Platform icons
// ============================================================
function platformIcon(platform) {
  const icons = {
    facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.19V12a4.85 4.85 0 01-5.58-2.19V6.69h5.58z"/></svg>',
  };
  return icons[platform] || '';
}

function platformColor(platform) {
  const colors = { facebook: '#1877f2', instagram: '#e1306c', tiktok: '#00f2ea' };
  return colors[platform] || '#6366f1';
}

// ============================================================
// Calendar generation
// ============================================================
function generateCalendar(year, month, posts) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  let html = '';
  // Header
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  days.forEach(d => { html += `<div class="calendar-header-cell">${d}</div>`; });

  // Previous month fill
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="calendar-cell other-month"><div class="cell-date">${prevLastDay - i}</div></div>`;
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const dayPosts = posts.filter(p => p.date === dateStr);

    html += `<div class="calendar-cell ${isToday ? 'today' : ''}" onclick="openPostModal('${dateStr}')">`;
    html += `<div class="cell-date ${isToday ? 'today-marker' : ''}">${d}</div>`;
    dayPosts.forEach(p => {
      html += `<div class="post-chip ${p.tag}" onclick="event.stopPropagation(); openPostModal('${dateStr}', '${p.id}')">${p.time} ${p.title}</div>`;
    });
    html += `</div>`;
  }

  // Next month fill
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-cell other-month"><div class="cell-date">${i}</div></div>`;
  }

  return html;
}

// ============================================================
// Post modal
// ============================================================
function openPostModal(date, postId) {
  const modal = document.getElementById('postModal');
  if (!modal) return;

  if (postId) {
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (post) {
      const titleEl = document.getElementById('modalTitle');
      if (titleEl) titleEl.textContent = 'แก้ไขโพสต์';
      const captionEl = document.getElementById('postCaption');
      if (captionEl) captionEl.value = post.content;
      const dateEl = document.getElementById('postDate');
      if (dateEl) dateEl.value = post.date;
      const timeEl = document.getElementById('postTime');
      if (timeEl) timeEl.value = post.time;
    }
  } else {
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'สร้างโพสต์ใหม่';
    const captionEl = document.getElementById('postCaption');
    if (captionEl) captionEl.value = '';
    const dateEl = document.getElementById('postDate');
    if (dateEl) dateEl.value = date;
  }

  openModal('postModal');
}

// ============================================================
// AI Generate simulation
// ============================================================
function simulateAIGenerate(btn) {
  const resultEl = document.getElementById('aiResult');
  if (!resultEl) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลัง Generate...';
  resultEl.innerHTML = `
    <div class="ai-loading" style="width:90%;height:1rem;margin-bottom:0.5rem"></div>
    <div class="ai-loading" style="width:100%;height:1rem;margin-bottom:0.5rem"></div>
    <div class="ai-loading" style="width:75%;height:1rem;margin-bottom:0.5rem"></div>
    <div class="ai-loading" style="width:60%;height:1rem"></div>
  `;

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Generate ด้วย AI';
    resultEl.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1rem;margin-bottom:1rem">
        <div style="font-weight:600;margin-bottom:0.5rem;color:#166534"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> AI สร้าง Content สำเร็จ</div>
        <div style="font-size:0.85rem;line-height:1.7;color:#1e293b">
          สงกรานต์นี้มาเติมความสดชื่นกับเมนูพิเศษจากร้าน ABC!<br><br>
          เรามีเมนูใหม่ที่ได้แรงบันดาลใจจากเทศกาลสงกรานต์ ทั้งรสชาติสดใส สีสันสะดุดตา เหมาะกับบรรยากาศแห่งความสุข<br><br>
          แวะมาลองได้ทุกสาขาตั้งแต่วันนี้เป็นต้นไป!
        </div>
        <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.35rem">
          <span class="tag tag-seasonal">#สงกรานต์2569</span>
          <span class="tag tag-branding">#ABCrestaurant</span>
          <span class="tag tag-promotion">#เมนูใหม่</span>
          <span class="tag tag-education">#อาหารไทย</span>
        </div>
      </div>
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:1rem">
        <div style="font-weight:600;margin-bottom:0.5rem;color:#3730a3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image Prompt</div>
        <div style="font-size:0.8rem;color:#4338ca;margin-bottom:0.5rem"><strong>TH</strong> ภาพอาหารไทยสีสันสดใส จานเต็ม บรรยากาศเทศกาลสงกรานต์ น้ำสาดเบาๆ ฉากหลังร้านอาหารไทยสวยงาม แสงธรรมชาติ สไตล์ food photography</div>
        <div style="font-size:0.8rem;color:#4338ca"><strong>EN</strong> Vibrant Thai food photography, colorful dishes on wooden table, Songkran festival atmosphere, soft water splash, warm natural lighting, shallow depth of field, professional food photo style</div>
        <button class="btn btn-sm btn-outline" style="margin-top:0.75rem" onclick="showToast('คัดลอก Image Prompt แล้ว')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> คัดลอก Prompt</button>
      </div>
    `;
  }, 2500);
}

// ============================================================
// Monthly plan simulation
// ============================================================
function simulateMonthlyPlan(btn) {
  const preview = document.getElementById('planPreview');
  if (!preview) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> AI กำลังวางแผน...';

  // Show loading
  preview.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)"><div class="ai-loading" style="width:60%;margin:0 auto 1rem"></div><div class="ai-loading" style="width:80%;margin:0 auto 1rem"></div><div class="ai-loading" style="width:70%;margin:0 auto"></div><p style="margin-top:1rem">AI กำลังวิเคราะห์ Brand Profile และสร้างแผนรายเดือน...</p></div>';

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Generate แผนรายเดือน';

    const planSlots = [
      { date: '7 เม.ย.', day: 'จันทร์', type: 'education', topic: '5 เมนูอาหารไทยยอดนิยมช่วงสงกรานต์', time: '10:00' },
      { date: '9 เม.ย.', day: 'พุธ', type: 'engagement', topic: 'โหวต เมนูสงกรานต์ที่คุณอยากลอง?', time: '12:00' },
      { date: '11 เม.ย.', day: 'ศุกร์', type: 'branding', topic: 'เรื่องราวความตั้งใจของเชฟ ABC', time: '10:00' },
      { date: '11 เม.ย.', day: 'ศุกร์', type: 'education', topic: 'แชร์บทความ เทรนด์อาหาร 2026', time: '15:00' },
      { date: '12 เม.ย.', day: 'เสาร์', type: 'promotion', topic: 'โปรสงกรานต์ ลด 30% ทุกเมนู!', time: '09:00' },
      { date: '14 เม.ย.', day: 'จันทร์', type: 'seasonal', topic: 'สวัสดีปีใหม่ไทย! รดน้ำขอพรผู้ใหญ่', time: '08:00' },
      { date: '16 เม.ย.', day: 'พุธ', type: 'testimonial', topic: 'รีวิวจากลูกค้า "อาหารอร่อย บรรยากาศดี"', time: '12:00' },
      { date: '18 เม.ย.', day: 'ศุกร์', type: 'education', topic: 'วิธีทำต้มยำกุ้งแบบต้นตำรับ', time: '10:00' },
    ];

    let html = '<div style="display:grid;gap:0.75rem">';
    planSlots.forEach((slot, i) => {
      html += `
        <div class="slot-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div class="slot-date">${slot.date} (${slot.day}) - ${slot.time}</div>
              <div class="slot-topic">${slot.topic}</div>
            </div>
            <span class="tag tag-${slot.type}">${slot.type}</span>
          </div>
          <div class="slot-caption" style="margin-top:0.5rem">
            Draft caption จะแสดงที่นี่... คลิก "แก้ไข" เพื่อปรับแต่ง
          </div>
          <div style="margin-top:0.5rem;display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-secondary" onclick="showToast('เปิดแก้ไข slot ${i + 1}')">แก้ไข</button>
            <button class="btn btn-sm btn-outline" onclick="showToast('Regenerate slot ${i + 1}')">Regenerate</button>
            <button class="btn btn-sm btn-secondary" onclick="showToast('คัดลอก Image Prompt')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Image Prompt</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    html += '<div style="margin-top:1.5rem;text-align:center"><button class="btn btn-primary btn-lg" onclick="showToast(\'บันทึก 8 โพสต์ลง Calendar เรียบร้อย!\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save All to Calendar (8 โพสต์)</button></div>';
    preview.innerHTML = html;
  }, 3000);
}

// ============================================================
// DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Day checkbox toggle
  document.querySelectorAll('.day-checkbox').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('checked');
      const cb = el.querySelector('input');
      if (cb) cb.checked = !cb.checked;
    });
  });
});
