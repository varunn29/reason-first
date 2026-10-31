// test-pipeline.js
// Automated verification test for the Unified Diagnostic Pipeline:
// Assessment Session -> Response Collection -> Multi-Response Synthesis ->
// Conversational Reasoning -> Needs-Based Grouping -> Intervention & Reassessment.

const assert = require('assert');

const BASE_URL = 'http://localhost:4000';

async function runPipelineTests() {
  console.log('🧪 Starting ReasonFirst Unified Diagnostic Pipeline Tests...\n');
  let passed = 0;
  let failed = 0;

  function testAssert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Start Assessment Session
    console.log('--- Step 1: Start Assessment Session ---');
    const startRes = await fetch(`${BASE_URL}/api/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student_vikram',
        studentName: 'Vikram Joshi',
        assignmentId: 'asgn_class3_subtraction',
      }),
    });
    const startData = await startRes.json();
    testAssert(startData.ok && startData.session?.id, 'Assessment session created with unique ID');
    const sessionId = startData.session.id;

    // 2. Submit Responses to Session (Simulate Smaller-From-Larger pattern)
    console.log('\n--- Step 2: Submit Session Responses ---');
    const answers = [
      { qid: 'probe_01', text: '61 - 24 = ?', ans: 43, corr: 37 },
      { qid: 'probe_02', text: '72 - 38 = ?', ans: 46, corr: 34 },
      { qid: 'probe_03', text: '83 - 49 = ?', ans: 46, corr: 34 },
      { qid: 'ctrl_01', text: '58 - 23 = ?', ans: 35, corr: 35 },
      { qid: 'ctrl_02', text: '79 - 45 = ?', ans: 34, corr: 34 },
    ];

    let lastRespId = null;
    for (const item of answers) {
      const respRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: item.qid,
          questionText: item.text,
          answer: item.ans,
          correctAnswer: item.corr,
        }),
      });
      const respData = await respRes.json();
      testAssert(respData.ok && respData.responseId, `Submitted response for ${item.qid}`);
      // Verify single response yields LOW confidence (Preliminary only)
      testAssert(respData.preliminaryDiagnosis.confidence === 'LOW', `Preliminary diagnosis for ${item.qid} has LOW confidence (preserves uncertainty)`);
      lastRespId = respData.responseId;
    }

    // 3. Prevent duplicate question submission
    console.log('\n--- Step 3: Duplicate Submission Protection ---');
    const dupRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'probe_01',
        answer: 43,
      }),
    });
    testAssert(dupRes.status === 409, 'Duplicate submission on probe_01 rejected with HTTP 409');

    // 4. Complete Session & Run Multi-Probe Synthesis
    console.log('\n--- Step 4: Complete Session & Multi-Probe Diagnostic Synthesis ---');
    const completeRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    const completeData = await completeRes.json();
    testAssert(completeData.ok && completeData.session.status === 'completed', 'Assessment session completed');
    const diag = completeData.diagnosis;
    testAssert(diag.diagnostic_status === 'SUPPORTED_HYPOTHESIS', 'Session diagnosis is SUPPORTED_HYPOTHESIS');
    testAssert(diag.candidate_misconception === 'SMALLER_FROM_LARGER', 'Misconception identified as SMALLER_FROM_LARGER');
    testAssert(diag.evidence_strength === 'STRONG', 'Evidence strength classified as STRONG across 3 items + controls');
    testAssert(diag.related_prerequisite_skill?.name, 'Linked to prerequisite skill: ' + diag.related_prerequisite_skill?.name);
    testAssert(diag.recommended_intervention?.title, 'Recommended intervention: ' + diag.recommended_intervention?.title);

    // 5. Conversational Reasoning Integration
    console.log('\n--- Step 5: Conversational Reasoning Dialogue ---');
    const chatStartRes = await fetch(`${BASE_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student_vikram',
        questionId: 'probe_01',
        responseId: lastRespId,
        studentName: 'Vikram',
        studentAnswer: '43',
        question: '61 - 24 = ?',
        language: 'hi',
      }),
    });
    const chatStart = await chatStartRes.json();
    testAssert(chatStart.ok && chatStart.sessionId, 'Chat dialogue initialized');
    const chatSessionId = chatStart.sessionId;

    // Student provides reasoning: "1 me se 4 nahi jata to 4 me se 1 ghataya"
    await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: chatSessionId,
        text: '1 me se 4 nahi jata to maine 4 me se 1 ghataya',
        studentContext: { studentName: 'Vikram', question: '61 - 24 = ?' },
      }),
    });

    const chatFinishRes = await fetch(`${BASE_URL}/chat/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: chatSessionId,
        studentContext: { studentName: 'Vikram', question: '61 - 24 = ?', studentAnswer: '43' },
        existingDiagnosis: diag,
      }),
    });
    const chatFinish = await chatFinishRes.json();
    testAssert(chatFinish.ok && chatFinish.summary, 'Chat concluded and generated summary');
    testAssert(chatFinish.reconciledDiagnosis?.diagnostic_status === 'SUPPORTED_HYPOTHESIS', 'Chat reconciled reasoning into diagnostic record');

    // 6. Record Teacher Intervention
    console.log('\n--- Step 6: Teacher Delivers Intervention ---');
    const intvRes = await fetch(`${BASE_URL}/api/interventions/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student_vikram',
        sessionId,
        targetSkill: 'ONES_REGROUPING',
        misconceptionId: 'SMALLER_FROM_LARGER',
        interventionTitle: 'Tens-and-Ones Bundling Mat & Concrete Unbundling',
        teacherDecision: 'accepted',
        teacherNotes: 'Practiced 15 minutes with Dienes blocks. Vikram exchanged 1 yellow rod for 10 units successfully.',
        status: 'delivered',
      }),
    });
    const intvData = await intvRes.json();
    testAssert(intvData.ok && intvData.intervention?.id, 'Intervention delivery recorded');

    // 7. Post-Intervention Reassessment
    console.log('\n--- Step 7: Post-Intervention Reassessment ---');
    const reassessStartRes = await fetch(`${BASE_URL}/api/reassessment/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student_vikram',
        preSessionId: sessionId,
        targetSkill: 'ONES_REGROUPING',
      }),
    });
    const reassessStart = await reassessStartRes.json();
    testAssert(reassessStart.ok && reassessStart.reassessmentSession?.id, 'Reassessment session initialized');
    const reassessSessionId = reassessStart.reassessmentSession.id;

    // Student solves reassessment questions correctly after intervention
    const reassessAnswers = [
      { qid: 'probe_02', text: '72 - 38 = ?', ans: 34, corr: 34 },
      { qid: 'probe_03', text: '83 - 49 = ?', ans: 34, corr: 34 },
      { qid: 'ncert_ch12_herbs_270_36', text: '270 - 36 = ?', ans: 234, corr: 234 }, // Transfer probe!
      { qid: 'ctrl_01', text: '58 - 23 = ?', ans: 35, corr: 35 },
    ];

    for (const item of reassessAnswers) {
      await fetch(`${BASE_URL}/api/sessions/${reassessSessionId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: item.qid,
          questionText: item.text,
          answer: item.ans,
          correctAnswer: item.corr,
        }),
      });
    }

    const reassessCompleteRes = await fetch(`${BASE_URL}/api/sessions/${reassessSessionId}/complete`, {
      method: 'POST',
    });
    const reassessComplete = await reassessCompleteRes.json();
    testAssert(reassessComplete.ok && reassessComplete.diagnosis?.all_correct, 'Reassessment completed with all questions correct');

    // Compare Pre vs Post Reassessment
    const compRes = await fetch(`${BASE_URL}/api/reassessment/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preSessionId: sessionId,
        postSessionId: reassessSessionId,
      }),
    });
    const compData = await compRes.json();
    const comp = compData.comparison.comparison;
    testAssert(comp.misconception_trend === 'RESOLVED', 'Misconception trend: RESOLVED');
    testAssert(comp.comparison_outcome === 'IMPROVEMENT_OBSERVED', 'Outcome: IMPROVEMENT_OBSERVED');
    testAssert(comp.teacher_summary.includes('Improvement observed after intervention'), 'Teacher summary uses conservative observational wording');

    // 8. Needs-Based Groupings
    console.log('\n--- Step 8: Needs-Based Student Groupings ---');
    const groupsRes = await fetch(`${BASE_URL}/api/groupings`);
    const groupsData = await groupsRes.json();
    testAssert(groupsData.ok && groupsData.groups?.length === 5, 'Found 5 distinct needs-based groups');

    // 9. Student Report Verification
    console.log('\n--- Step 9: Multi-Item Student Report ---');
    const reportRes = await fetch(`${BASE_URL}/api/reports/student/student_vikram`);
    const reportData = await reportRes.json();
    testAssert(reportData.ok && reportData.session, 'Report returns session object');
    testAssert(reportData.responses?.length >= 4, 'Report contains multi-probe responses');
    testAssert(reportData.report?.skill_mastery, 'Report includes cognitive skill mastery levels');
    testAssert(reportData.interventions?.length >= 1, 'Report includes logged intervention history');

  } catch (err) {
    console.error('Pipeline test exception:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`Pipeline Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');
  if (failed > 0) process.exit(1);
}

runPipelineTests();

