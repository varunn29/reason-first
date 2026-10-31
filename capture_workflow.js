const puppeteer = require('./backend/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'workflow_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureWorkflow() {
  console.log('🚀 Starting ReasonFirst Complete Workflow Automated Capture...');

  // Attempt using system Chrome if puppeteer default download is not present
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=430,932'],
    defaultViewport: {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  };

  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // Screen 1: Student Login Screen
    // -------------------------------------------------------------
    console.log('📸 1. Capturing Student Login...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_student_login.png') });

    // -------------------------------------------------------------
    // Screen 2: Fill Student Login Credentials
    // -------------------------------------------------------------
    console.log('📸 2. Filling Class Code and Student Name...');
    const codeInput = await page.$('input[placeholder*="Class Code"]');
    if (codeInput) {
      await codeInput.type('3A');
    }
    const nameInput = await page.$('input[placeholder*="name"]');
    if (nameInput) {
      await nameInput.type('Aarav Sharma');
    }
    await sleep(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_student_login_filled.png') });

    // Submit Student Login
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(1000);

    // -------------------------------------------------------------
    // Screen 3: Student Home / Interface
    // -------------------------------------------------------------
    console.log('📸 3. Capturing Student Home Interface...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_student_home.png') });

    // -------------------------------------------------------------
    // Screen 4: Start Math Quiz / Question Solving
    // -------------------------------------------------------------
    console.log('📸 4. Starting Math Diagnostic Quiz...');
    await page.goto('http://localhost:5173/solve', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_question_solving.png') });

    // -------------------------------------------------------------
    // Screen 5: Select Distractor 43 (Smaller-From-Larger)
    // -------------------------------------------------------------
    console.log('📸 5. Selecting Distractor (43)...');
    // Click option containing "43"
    const options = await page.$$('button');
    for (const opt of options) {
      const text = await page.evaluate(el => el.textContent, opt);
      if (text.trim() === '43') {
        await opt.click();
        break;
      }
    }
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_answer_selected_43.png') });

    // -------------------------------------------------------------
    // Screen 6: Check Answer & Immediate Feedback
    // -------------------------------------------------------------
    console.log('📸 6. Checking Answer...');
    const checkBtn = await page.$('button[type="button"]');
    // Find "Check Answer" button
    for (const opt of options) {
      const text = await page.evaluate(el => el.textContent, opt);
      if (text.includes('Check Answer')) {
        await opt.click();
        break;
      }
    }
    await sleep(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_answer_checked_feedback.png') });

    // -------------------------------------------------------------
    // Screen 7: AI Conversational Reasoning Bot (ChatScreen)
    // -------------------------------------------------------------
    console.log('📸 7. Navigating to AI Voice Reasoning Chatbot...');
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_ai_chat_screen.png') });

    // Type child reasoning explanation
    const chatInput = await page.$('input[placeholder*="जवाब"]') || await page.$('input[type="text"]');
    if (chatInput) {
      await chatInput.type('मैंने 4 में से 1 को घटा दिया तो 3 आया');
      await sleep(400);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '08_chat_explanation_typed.png') });
    }

    // -------------------------------------------------------------
    // Screen 8: Evidence-Based AI Diagnostic Report
    // -------------------------------------------------------------
    console.log('📸 8. Navigating to Evidence-Based AI Diagnostic Report...');
    await page.goto('http://localhost:5173/report', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_ai_diagnostic_report_top.png') });

    // Scroll to see Cognitive Skill Mastery Matrix & Intervention Protocol
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_diagnostic_report_intervention.png') });

    // Scroll to see Teacher Override & Reassessment
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_diagnostic_report_reassessment.png') });

    // -------------------------------------------------------------
    // Screen 9: Teacher Login
    // -------------------------------------------------------------
    console.log('📸 9. Capturing Teacher Login Screen...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '12_teacher_login.png') });

    // Enter teacher demo credentials
    const teacherEmailInput = await page.$('input[type="email"]');
    if (teacherEmailInput) await teacherEmailInput.type('teacher@demo.com');
    const teacherPwInput = await page.$('input[type="password"]');
    if (teacherPwInput) await teacherPwInput.type('password123');
    await sleep(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '13_teacher_login_filled.png') });

    // Submit Teacher Login
    const loginSubmitBtn = await page.$('button[type="submit"]');
    if (loginSubmitBtn) await loginSubmitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(1200);

    // -------------------------------------------------------------
    // Screen 10: Teacher Dashboard - Student Roster
    // -------------------------------------------------------------
    console.log('📸 10. Capturing Teacher Dashboard (Student Roster)...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '14_teacher_dashboard_roster.png') });

    // -------------------------------------------------------------
    // Screen 11: Teacher Dashboard - Needs-Based Learning Groups
    // -------------------------------------------------------------
    console.log('📸 11. Capturing Needs-Based Learning Groups...');
    // Click "Needs-Based Groups" tab
    const tabButtons = await page.$$('button');
    for (const btn of tabButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Needs-Based Groups')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '15_teacher_dashboard_needs_based_groupings.png') });

    // -------------------------------------------------------------
    // Screen 12: Students Directory Page
    // -------------------------------------------------------------
    console.log('📸 12. Capturing Students Page (/students)...');
    await page.goto('http://localhost:5173/students', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '16_students_directory.png') });

    // -------------------------------------------------------------
    // Screen 13: Create Assignment Page
    // -------------------------------------------------------------
    console.log('📸 13. Capturing Create Assignment Page (/create)...');
    await page.goto('http://localhost:5173/create', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '17_create_assignment.png') });

    // -------------------------------------------------------------
    // Screen 14: Settings Page
    // -------------------------------------------------------------
    console.log('📸 14. Capturing Settings Page (/settings)...');
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '18_settings_page.png') });

    console.log('🎉 All 18 workflow screenshots captured successfully in workflow_screenshots/ !');
  } catch (err) {
    console.error('Error during workflow capture:', err);
  } finally {
    await browser.close();
  }
}

captureWorkflow();
