// backend/chat/test-chat.js
// Interactive CLI test script for the Teacher Bot dialogue brain.
// Simulates Class 4 student "Rahul Kumar" with the classic fraction bug (1/2 + 1/4 = 2/6).

const readline = require('readline');
const { nextBotTurn, generateTeacherSummary } = require('./chatBrain');

async function runInteractiveTest() {
  console.clear();
  console.log('================================================================');
  console.log('       REASON-FIRST: TEACHER BOT CHAT BRAIN (TERMINAL TEST)     ');
  console.log('================================================================');

  const studentContext = {
    studentName: 'Rahul Kumar',
    grade: 'Class 4',
    question: '1/2 + 1/4 = ?',
    studentAnswer: '2/6',
    studentExplanation: 'I added the numbers on top and bottom',
    language: process.env.CHAT_DEFAULT_LANGUAGE || 'hi',
  };

  console.log(` Student:     ${studentContext.studentName} (${studentContext.grade})`);
  console.log(` Question:    ${studentContext.question}`);
  console.log(` Answer:      ${studentContext.studentAnswer} (Misconception: 1+1 / 2+4)`);
  console.log(` Language:    ${studentContext.language.toUpperCase()}`);
  console.log('----------------------------------------------------------------');
  console.log(' Instructions: Type your own reply OR type 1, 2, or 3 for quick-reply.');
  console.log('----------------------------------------------------------------\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (promptText) =>
    new Promise((resolve) => rl.question(promptText, resolve));

  const chatHistory = [];
  let isDone = false;
  let turnNumber = 1;

  while (!isDone && turnNumber <= 4) {
    process.stdout.write(`⏳ Thinking (Turn ${turnNumber}/4)...\r`);

    let botTurn;
    try {
      botTurn = await nextBotTurn(chatHistory, studentContext);
    } catch (err) {
      console.error('\n Error during bot turn:', err.message);
      break;
    }

    console.log(`\n\n🤖 TEACHER BOT:`);
    console.log(`   "${botTurn.reply}"\n`);

    if (botTurn.evidence_so_far) {
      console.log(`   [Internal Note: ${botTurn.evidence_so_far} | Hypothesis: ${botTurn.hypothesis}]`);
    }

    // Record bot's message in history
    chatHistory.push({
      sender: 'bot',
      text: botTurn.reply,
      quick_replies: botTurn.quick_replies,
      turn_number: turnNumber,
    });

    if (botTurn.done) {
      console.log('\n✅ Bot marked conversation as complete.');
      isDone = true;
      break;
    }

    // Show Quick-Reply buttons
    console.log('\n👉 Quick Replies:');
    (botTurn.quick_replies || []).forEach((qr, idx) => {
      console.log(`   [${idx + 1}] ${qr}`);
    });

    const userInput = await ask('\n Rahul (type text or number 1-3): ');
    const trimmedInput = userInput.trim();

    // Map numeric choice (1, 2, 3) to quick reply string
    let finalStudentText = trimmedInput;
    const choiceNum = parseInt(trimmedInput, 10);
    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= botTurn.quick_replies.length) {
      finalStudentText = botTurn.quick_replies[choiceNum - 1];
    }

    if (!finalStudentText) {
      finalStudentText = 'मुझे नहीं पता 🤔';
    }

    console.log(` Rahul chose: "${finalStudentText}"`);

    // Record student's turn
    chatHistory.push({
      sender: 'student',
      text: finalStudentText,
      turn_number: turnNumber,
    });

    turnNumber++;
  }

  rl.close();

  // Generate and display final teacher summary
  console.log('\n================================================================');
  console.log('          GENERATING FINAL TEACHER AI SUMMARY...                ');
  console.log('================================================================');

  try {
    const summary = await generateTeacherSummary(chatHistory, studentContext, {
      ruleId: 'DENOMINATOR_ADDITION',
    });

    console.log('\n' + JSON.stringify(summary, null, 2));
    console.log('\n================================================================');
    console.log(' Test complete! Chat brain executed and validated successfully.');
    console.log('================================================================\n');
  } catch (summaryErr) {
    console.error('Failed to generate summary:', summaryErr.message);
  }
}

if (require.main === module) {
  runInteractiveTest();
}

module.exports = runInteractiveTest;

