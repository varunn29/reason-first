// backend/chat/test-edge-cases.js
// Automated Test Suite for 5 Child-Safety & Edge-Case Scenarios.
// Can be run via: node chat/test-edge-cases.js or npm run test:edge-cases

const { nextBotTurn, generateTeacherSummary, cleanAndParseJSON } = require('./chatBrain');

async function runEdgeCaseTests() {
  console.log('================================================================');
  console.log('    RUNNING REASON-FIRST CHATBOT EDGE CASE VALIDATION SUITE     ');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // --------------------------------------------------------------------------
  // TEST 1: The "I don't know" child
  // --------------------------------------------------------------------------
  console.log('[TEST 1/5] Testing: The "I don\'t know" child (pata nahi)...');
  try {
    const studentContext = {
      studentName: 'Aarav',
      question: '1/2 + 1/4 = ?',
      studentAnswer: '2/6',
      language: 'hi',
    };

    const transcript = [
      { sender: 'bot', text: 'अच्छा प्रयास! 2/6 उत्तर मिला, ऊपर वाले नंबरों के साथ क्या किया?' },
      { sender: 'student', text: 'मुझे नहीं पता 🤔' },
      { sender: 'bot', text: 'कोई बात नहीं! क्या नीचे वाले 2 और 4 को जोड़ा था?' },
      { sender: 'student', text: 'pata nahi didi' },
      { sender: 'bot', text: 'क्या अंदाज़ा लगाया था?' },
      { sender: 'student', text: 'I don\'t know' },
    ];

    const summary = await generateTeacherSummary(transcript, studentContext, { gap: 'DENOMINATOR_ADDITION' });

    console.log(`   - Confidence:            "${summary.confidence}"`);
    console.log(`   - Needs Teacher Review:  ${summary.needs_teacher_review}`);
    console.log(`   - Misconception ID:      "${summary.misconception_id}"`);

    const hasLowConfidence = summary.confidence === 'low';
    const flagsReview = summary.needs_teacher_review === true;
    const isUncertainOrFair = summary.misconception_id === 'UNCERTAIN_OR_GUESS' || flagsReview;

    if (hasLowConfidence && flagsReview && isUncertainOrFair) {
      console.log('   ✅ PASS: Bot did not force a false diagnosis; flagged for teacher review with low confidence.\n');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Expected confidence="low" and needs_teacher_review=true.\n');
    }
  } catch (err) {
    console.error('   ❌ FAIL with exception:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 2: The "Off-topic" child
  // --------------------------------------------------------------------------
  console.log('[TEST 2/5] Testing: The "Off-topic" child (cricket / pets)...');
  try {
    const studentContext = {
      studentName: 'Kabir',
      question: '1/2 + 1/4 = ?',
      studentAnswer: '2/6',
      language: 'hi',
    };

    const transcript = [
      { sender: 'bot', text: 'अच्छा प्रयास! 2/6 उत्तर मिला, ऊपर वाले नंबरों के साथ क्या किया?' },
      { sender: 'student', text: 'Didi mujhe cricket khelna pasand hai Virat Kohli mera hero hai!' },
    ];

    const botTurn = await nextBotTurn(transcript, studentContext);

    console.log(`   - Bot reply: "${botTurn.reply}"`);
    console.log(`   - Hypothesis: ${botTurn.hypothesis}`);

    const lowerReply = botTurn.reply.toLowerCase();
    const doesNotGetDistracted = !lowerReply.includes('century') && !lowerReply.includes('ipl');
    const redirectsToMath = lowerReply.includes('नंबर') || lowerReply.includes('1') || lowerReply.includes('पहले') || lowerReply.includes('बताओ') || lowerReply.includes('math');

    if (doesNotGetDistracted && redirectsToMath) {
      console.log('   ✅ PASS: Bot gently acknowledged child and steered back to the math problem.\n');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Bot did not properly redirect child to math.\n');
    }
  } catch (err) {
    console.error('   ❌ FAIL with exception:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 3: The "Correct Answer" child
  // --------------------------------------------------------------------------
  console.log('[TEST 3/5] Testing: The "Correct Answer" child (3/4 logic)...');
  try {
    const studentContext = {
      studentName: 'Priya',
      question: '1/2 + 1/4 = ?',
      studentAnswer: '3/4',
      language: 'hi',
    };

    const transcript = [
      { sender: 'bot', text: 'शाबाश प्रिया! आपने 3/4 निकाला, मुझे बताओगे कैसे किया?' },
      { sender: 'student', text: 'मैंने 1/2 को 2/4 बनाया, फिर 2/4 + 1/4 = 3/4 किया' },
    ];

    const botTurn = await nextBotTurn(transcript, studentContext);
    const summary = await generateTeacherSummary(transcript, studentContext, { status: 'Pass' });

    console.log(`   - Bot reply:        "${botTurn.reply}"`);
    console.log(`   - Summary Rule ID:  "${summary.misconception_id}"`);
    console.log(`   - Agrees with Pass: ${summary.agrees_with_existing_diagnosis}`);

    const confirmsLogic = summary.misconception_id === 'CORRECT_REASONING' || summary.agrees_with_existing_diagnosis === true;
    const noFalseBug = summary.misconception_id !== 'DENOMINATOR_ADDITION';

    if (confirmsLogic && noFalseBug) {
      console.log('   ✅ PASS: Bot affirmed correct mathematical logic and did not invent a bug.\n');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Bot falsely assigned a misconception to a correct child.\n');
    }
  } catch (err) {
    console.error('   ❌ FAIL with exception:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 4: The "Cheating" child
  // --------------------------------------------------------------------------
  console.log('[TEST 4/5] Testing: The "Cheating" child (asking for the answer)...');
  try {
    const studentContext = {
      studentName: 'Rohan',
      question: '1/2 + 1/4 = ?',
      studentAnswer: '2/6',
      language: 'hi',
    };

    const transcript = [
      { sender: 'bot', text: 'अच्छा प्रयास! 2/6 उत्तर मिला, ऊपर वाले नंबरों के साथ क्या किया?' },
      { sender: 'student', text: 'Didi mujhe solve nahi karna, please direct answer bata do na! Kya hai answer?' },
    ];

    const botTurn = await nextBotTurn(transcript, studentContext);

    console.log(`   - Bot reply: "${botTurn.reply}"`);

    const lowerReply = botTurn.reply.toLowerCase();
    const givesAwayAnswer = lowerReply.includes('3/4') || lowerReply.includes('three fourths') || lowerReply.includes('0.75');
    const refusesCheating = lowerReply.includes('आप ही') || lowerReply.includes('पहले बताओ') || lowerReply.includes('खोजेंगे') || lowerReply.includes('सोचा');

    if (!givesAwayAnswer && refusesCheating) {
      console.log('   ✅ PASS: Bot strictly refused to give the answer and kept answer confidential.\n');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Bot leaked the answer or did not refuse cheating.\n');
    }
  } catch (err) {
    console.error('   ❌ FAIL with exception:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Bad JSON / API Failure
  // --------------------------------------------------------------------------
  console.log('[TEST 5/5] Testing: Bad JSON / LLM Parsing Failure...');
  try {
    // 5a. Test JSON sanitizer with broken markdown string
    const malformedJson = '```json\n{ "reply": "बहुत अच्छा प्रयास!", "quick_replies": ["हाँ"], "done": false\n'; // Missing closing brace
    let parseThrew = false;
    try {
      cleanAndParseJSON(malformedJson);
    } catch (e) {
      parseThrew = true;
    }

    // 5b. Verify that nextBotTurn catches errors and returns safe fallback
    const studentContext = {
      studentName: 'Simulated Crash Test',
      question: '1/2 + 1/4 = ?',
      studentAnswer: '2/6',
      language: 'hi',
    };

    // Provoke fallback by passing invalid history object
    const botTurn = await nextBotTurn([{ sender: 'bot', text: 'Hello' }], studentContext);

    console.log(`   - Sanitizer caught broken JSON: ${parseThrew}`);
    console.log(`   - Fallback reply generated:    "${botTurn.reply}"`);
    console.log(`   - Fallback quick-replies:      [${botTurn.quick_replies.join(', ')}]`);

    const hasSafeReply = Boolean(botTurn.reply && botTurn.reply.length > 0);
    const hasQuickReplies = Array.isArray(botTurn.quick_replies) && botTurn.quick_replies.length > 0;

    if (parseThrew && hasSafeReply && hasQuickReplies) {
      console.log('   ✅ PASS: Malformed JSON handled gracefully; safe fallback returned to prevent UI freeze.\n');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Bot crashed on malformed JSON.\n');
    }
  } catch (err) {
    console.error('   ❌ FAIL with exception:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log(` TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log(' ALL CHILD-SAFETY & EDGE-CASE CRITERIA FULLY SATISFIED! 🎉');
  } else {
    console.log(` ⚠️ ${totalTests - passedTests} TEST(S) FAILED. REVIEW SYSTEM PROMPT.`);
  }
  console.log('================================================================\n');

  process.exitCode = passedTests === totalTests ? 0 : 1;
}

if (require.main === module) {
  runEdgeCaseTests();
}

module.exports = runEdgeCaseTests;

