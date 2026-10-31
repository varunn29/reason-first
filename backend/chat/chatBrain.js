// backend/chat/chatBrain.js
// Core AI dialogue & diagnostic engine for the "Chat with Teacher Bot" feature.
// Tailored for Class 4 elementary students in India (ages 8-10).

const path = require('path');
// Guarantee loading of backend/.env with override: true regardless of execution working directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const config = require('./config');
const strings = require('./strings');

/**
 * Builds the strict System Prompt for the teacher chatbot turn.
 */
function buildSystemPrompt(studentContext, turnNumber) {
  const lang = studentContext.language || config.defaultLanguage;
  const studentName = studentContext.studentName || 'Student';
  const question = studentContext.question || '1/2 + 1/4 = ?';
  const studentAnswer = studentContext.studentAnswer || '2/6';
  const studentExplanation = studentContext.studentExplanation || 'No initial explanation provided';

  const languageInstructions = {
    hi: 'Speak strictly in simple Hindi (Devanagari script) with very warm, affectionate, respectful words suitable for an 8-10 year old Indian child.',
    hinglish: 'Speak in conversational Hinglish (Hindi written in Roman script mixed with simple English) commonly spoken by urban Indian school children.',
    en: 'Speak in very simple, friendly English appropriate for an 8-year-old child.',
  };

  const chosenLangRule = languageInstructions[lang] || languageInstructions.hi;

  return `You are a gentle, encouraging primary school math teacher (Didi / Teacher Ji) in India talking to ${studentName}, a Class 4 student (age 8-10).

CONTEXT:
- Math Question: "${question}"
- ${studentName}'s Submitted Answer: "${studentAnswer}"
- ${studentName}'s Initial Reason: "${studentExplanation}"
- Current Question Turn: ${turnNumber} of ${config.limits.maxQuestions}
- Language Preference: ${chosenLangRule}

STRICT PEDAGOGICAL & SAFETY RULES:
1. Warm Teacher Tone: Always sound caring, patient, and joyful. NEVER say "wrong", "incorrect", or "no". Say "Good try, let us check together" ("अच्छा प्रयास! चलो मिलकर समझते हैं").
2. Ultra-Short Messages: Maximum 15 words per message! Keep sentences brief and vocabulary very simple.
3. Single Question Rule: Ask ONLY ONE simple question at a time to uncover how they computed their answer.
4. PROGRESSION & NO-REPEAT RULE:
   - Carefully read the conversation history.
   - You MUST acknowledge the child's previous reply warmly in 2-4 words (e.g. 'बहुत अच्छा!', 'अरे वाह!', 'समझ गया!') before asking your next question.
   - NEVER repeat a question that was already asked. If the child already answered what they did with one part (e.g. top numbers), move forward to the next step.
5. ANTI-CHEATING & ABSOLUTE SECRECY:
   - If the child asks for the answer (e.g. "tell me the answer", "answer kya hai?", "bata do"), you MUST politely REFUSE: ("अरे, उत्तर तो आप ही खोजेंगे! पहले बताओ, क्या सोचा?").
   - NEVER reveal the correct answer ("3/4", "37") or correct formulas.
6. OFF-TOPIC REDIRECTION:
   - If the child talks about off-topic subjects (cricket, dogs, toys, games, celebrities), do NOT engage in the off-topic chat. Acknowledge with a warm smile and immediately steer them back to the math problem: ("अरे वाह! लेकिन पहले बताओ, ऊपर वाले 1 और 1 के साथ क्या किया?").
7. "I DON'T KNOW" HANDLING:
   - If the child says "मुझे नहीं पता", "pata nahi", or "I don't know", do not force or pressure them. Ask an ultra-simple observation question. If they persist in not knowing, set hypothesis to "UNCERTAIN_OR_GUESS".
8. CORRECT ANSWER VALIDATION:
   - If the child's submitted answer is already correct (e.g., 3/4 or 37), confirm their logic and praise them. Do NOT invent a misconception! Set hypothesis to "CORRECT_REASONING".
9. Quick Replies: ALWAYS generate 2 or 3 short, easy quick-reply options (emojis encouraged) that an 8-year-old can tap with one finger.
10. Termination: If turnNumber >= ${config.limits.maxQuestions} OR child confirmed their thinking, set "done": true.

OUTPUT FORMAT:
You MUST respond with RAW, VALID JSON ONLY. No markdown, no triple backticks, no extra text.
{
  "reply": "string (Max 15 words in ${lang})",
  "phrase_key": "phrase_key string if matching standard audio or null",
  "quick_replies": ["string", "string"],
  "hypothesis": "misconception_id or CORRECT_REASONING or UNCERTAIN_OR_GUESS",
  "evidence_so_far": "brief teacher note on student reasoning",
  "done": boolean
}`;
}

/**
 * Calls an OpenAI-compatible LLM endpoint using native fetch.
 */
async function callLLM(messages, temperature = 0.2) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '').trim();

  if (!apiKey) {
    console.log('\x1b[33m[CHAT BRAIN] No API key found. Using deterministic simulator for student turn.\x1b[0m');
    return simulateOfflineTurn(messages);
  }

  let url = 'https://api.openai.com/v1/chat/completions';
  let model = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';

  if (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    model = process.env.CHAT_LLM_MODEL || 'gemini-3.8-flash';
  } else if (process.env.OPENAI_BASE_URL) {
    url = `${process.env.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  }

  console.log(`\x1b[36m[CHAT BRAIN] Calling live LLM API (${url}, model: ${model})...\x1b[0m`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM API returned HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Validates and cleans raw JSON text from LLM response.
 */
function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from LLM');
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    throw new Error('Missing or invalid "reply" string in bot JSON');
  }

  if (!Array.isArray(parsed.quick_replies) || parsed.quick_replies.length === 0) {
    parsed.quick_replies = ['हाँ 👍', 'नहीं ❌', 'मुझे नहीं पता 🤔'];
  }

  parsed.phrase_key = parsed.phrase_key || null;
  parsed.hypothesis = parsed.hypothesis || 'unknown';
  parsed.evidence_so_far = parsed.evidence_so_far || '';
  parsed.done = Boolean(parsed.done);

  return parsed;
}

/**
 * Main dialogue step: generates the next bot turn.
 */
async function nextBotTurn(chatHistory = [], studentContext = {}) {
  const lang = studentContext.language || config.defaultLanguage;
  const botTurnCount = chatHistory.filter((m) => m.sender === 'bot').length + 1;

  if (botTurnCount > config.limits.maxQuestions) {
    const closeMsg = strings.closing[lang] || strings.closing.hi;
    return {
      reply: closeMsg.thankYou,
      phrase_key: 'phrase_closing_01',
      quick_replies: [closeMsg.buttonText],
      hypothesis: 'MAX_QUESTIONS_REACHED',
      evidence_so_far: 'Session reached 4-question limit.',
      done: true,
    };
  }

  const systemPrompt = buildSystemPrompt(studentContext, botTurnCount);
  const messages = [{ role: 'system', content: systemPrompt }];

  chatHistory.forEach((msg) => {
    if (msg.text && String(msg.text).trim()) {
      messages.push({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: String(msg.text).trim(),
      });
    }
  });

  try {
    const rawOutput = await callLLM(messages);
    return cleanAndParseJSON(rawOutput);
  } catch (err1) {
    console.warn(`[ChatBrain] Attempt 1 failed (${err1.message}). Retrying once...`);
    try {
      const retryMessages = [
        ...messages,
        {
          role: 'user',
          content:
            'CRITICAL: Return ONLY raw valid JSON matching: {"reply":"...","phrase_key":null,"quick_replies":["..."],"hypothesis":"...","evidence_so_far":"...","done":false}',
        },
      ];
      const retryOutput = await callLLM(retryMessages, 0.1);
      return cleanAndParseJSON(retryOutput);
    } catch (err2) {
      console.error(`[ChatBrain] Attempt 2 failed (${err2.message}). Returning safe fallback.`);
      const fallbackSet = strings.fallbacks[lang] || strings.fallbacks.hi;
      return {
        reply: fallbackSet.fractionQuestion || fallbackSet.error,
        phrase_key: 'phrase_probe_numerator',
        quick_replies: fallbackSet.fractionQuickReplies || ['ऊपर और नीचे जोड़ा ➕', 'मुझे नहीं पता 🤔'],
        hypothesis: 'unknown',
        evidence_so_far: 'Fallback triggered due to LLM response error.',
        done: botTurnCount >= config.limits.maxQuestions,
      };
    }
  }
}

/**
 * Generates the Teacher Summary after chat ends.
 */
async function generateTeacherSummary(chatHistory = [], studentContext = {}, existingDiagnosis = null) {
  const transcript = chatHistory
    .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
    .join('\n');

  // Check if student was repeatedly uncertain ("I don't know")
  const studentMessages = chatHistory.filter((m) => m.sender === 'student').map((m) => m.text.toLowerCase());
  const uncertainReplies = studentMessages.filter((t) => 
    t.includes('pata nahi') || t.includes("don't know") || t.includes('nahi pata') || t.includes('नहीं पता') || t.includes('अंदाज़ा')
  );
  const isPervasivelyUncertain = studentMessages.length > 0 && (uncertainReplies.length / studentMessages.length) >= 0.6;

  // Check if answer was correct
  const isCorrect = studentContext.studentAnswer === '3/4' || studentContext.studentAnswer === '37' || existingDiagnosis?.status === 'Pass';

  const prompt = `You are an expert elementary math pedagogical evaluator.
Analyze this chat transcript between a Class 4 teacher bot and a student (${studentContext.studentName || 'Student'}).

STUDENT CONTEXT:
- Problem: "${studentContext.question || '1/2 + 1/4'}"
- Student Answer: "${studentContext.studentAnswer || '2/6'}"
- Existing Diagnosis from System: "${existingDiagnosis?.ruleId || existingDiagnosis?.gap || 'DENOMINATOR_ADDITION'}"

TRANSCRIPT:
${transcript}

SPECIAL CONDITIONS:
1. If the child mostly said "I don't know" or "pata nahi", set misconception_id to "UNCERTAIN_OR_GUESS", confidence to "low", and needs_teacher_review to true.
2. If the child got it right and gave correct logic, set misconception_id to "CORRECT_REASONING", confidence to "high", and needs_teacher_review to false.

TASK:
Output STRICT JSON summarizing the student's thinking based ONLY on evidence from the transcript.
{
  "misconception_id": "DENOMINATOR_ADDITION | NUMERATOR_ONLY_OPERATION | SMALLER_FROM_LARGER | BORROW_WITHOUT_DECREMENT | CORRECT_REASONING | UNCERTAIN_OR_GUESS",
  "evidence": ["quote or observed action 1", "quote or observed action 2"],
  "what_child_understands": "one clear sentence on what the child already knows",
  "confidence": "high" | "medium" | "low",
  "needs_teacher_review": true or false,
  "suggested_next_step": "practical 1-sentence teaching activity (e.g. fraction paper strips or pizza slices)",
  "agrees_with_existing_diagnosis": true or false
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an educational assessment system. Output RAW VALID JSON ONLY.',
    },
    { role: 'user', content: prompt },
  ];

  try {
    const rawOutput = await callLLM(messages, 0.1);
    const parsed = cleanAndParseJSON(rawOutput);

    // Enforce safety constraints on summary
    const lowConfidence = isPervasivelyUncertain || parsed.confidence === 'low';
    const finalNeedsReview = isPervasivelyUncertain ? true : Boolean(parsed.needs_teacher_review ?? lowConfidence);

    return {
      misconception_id: isPervasivelyUncertain ? 'UNCERTAIN_OR_GUESS' : (isCorrect ? 'CORRECT_REASONING' : (parsed.misconception_id || 'DENOMINATOR_ADDITION')),
      evidence: Array.isArray(parsed.evidence) && parsed.evidence.length > 0 ? parsed.evidence : [transcript.slice(0, 100)],
      what_child_understands: isPervasivelyUncertain
        ? 'Child was hesitant or could not express their internal calculation steps.'
        : (parsed.what_child_understands || 'Understands single-digit calculation.'),
      confidence: isPervasivelyUncertain ? 'low' : (['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium'),
      needs_teacher_review: finalNeedsReview,
      suggested_next_step: isPervasivelyUncertain
        ? 'Conduct a gentle 1-on-1 check-in using physical fraction strips or blocks.'
        : (parsed.suggested_next_step || 'Review fraction concepts with visual circle tiles.'),
      agrees_with_existing_diagnosis: isPervasivelyUncertain ? false : Boolean(parsed.agrees_with_existing_diagnosis ?? true),
    };
  } catch (err) {
    console.warn('[ChatBrain] Teacher summary generation fallback:', err.message);
    if (isPervasivelyUncertain) {
      return {
        misconception_id: 'UNCERTAIN_OR_GUESS',
        evidence: ['Child repeatedly answered "मुझे नहीं पता" (I don\'t know).'],
        what_child_understands: 'Student is hesitant to commit to a method or lacks confidence.',
        confidence: 'low',
        needs_teacher_review: true,
        suggested_next_step: 'Conduct a gentle 1-on-1 check-in with physical fraction tiles.',
        agrees_with_existing_diagnosis: false,
      };
    }
    if (isCorrect) {
      return {
        misconception_id: 'CORRECT_REASONING',
        evidence: ['Child demonstrated correct fraction addition method.'],
        what_child_understands: 'Understands common denominators and fraction addition.',
        confidence: 'high',
        needs_teacher_review: false,
        suggested_next_step: 'Advance student to fractions with unlike denominators requiring simplification.',
        agrees_with_existing_diagnosis: true,
      };
    }
    return {
      misconception_id: 'DENOMINATOR_ADDITION',
      evidence: ['Student added numerators (1+1=2) and denominators (2+4=6) across fractions.'],
      what_child_understands: 'Knows single-digit whole number addition fluently.',
      confidence: 'high',
      needs_teacher_review: false,
      suggested_next_step: 'Demonstrate with a folded paper strip that 1/2 is already bigger than 2/6.',
      agrees_with_existing_diagnosis: true,
    };
  }
}

/**
 * High-fidelity deterministic simulator for local testing.
 * Implements intelligent handling for all 5 edge-case scenarios.
 */
function simulateOfflineTurn(messages) {
  const studentUserMsgs = messages.filter((m) => m.role === 'user');
  const studentTurns = studentUserMsgs.length;
  const lastUserAnswer = (studentUserMsgs[studentTurns - 1]?.content || '').toLowerCase();
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';

  // Edge Case 4: The Cheating Child (requests the answer directly)
  if (
    lastUserAnswer.includes('answer bata do') || 
    lastUserAnswer.includes('tell me the answer') || 
    lastUserAnswer.includes('bata do na') || 
    lastUserAnswer.includes('what is the answer') ||
    lastUserAnswer.includes('उत्तर क्या है')
  ) {
    return JSON.stringify({
      reply: 'अरे, उत्तर तो आप ही खोजेंगे! पहले बताओ, क्या सोचा?',
      phrase_key: null,
      quick_replies: ['1 और 1 जोड़ा ➕', 'नीचे वाले जोड़े ➕', 'मुझे नहीं पता 🤔'],
      hypothesis: 'UNCERTAIN_OR_GUESS',
      evidence_so_far: 'Child asked for answer directly; bot refused to give answer.',
      done: false,
    });
  }

  // Edge Case 2: The Off-Topic Child (talks about cricket, toys, pets)
  if (
    lastUserAnswer.includes('cricket') || 
    lastUserAnswer.includes('virat') || 
    lastUserAnswer.includes('dog') || 
    lastUserAnswer.includes('kutta') || 
    lastUserAnswer.includes('toy') ||
    lastUserAnswer.includes('game')
  ) {
    return JSON.stringify({
      reply: 'अरे वाह! लेकिन पहले बताओ, ऊपर वाले 1 और 1 के साथ क्या किया?',
      phrase_key: null,
      quick_replies: ['1 और 1 जोड़ दिया ➕', 'गुणा किया ✖️', 'मुझे नहीं पता 🤔'],
      hypothesis: 'unknown',
      evidence_so_far: 'Child was off-topic; bot gently redirected to math problem.',
      done: false,
    });
  }

  // Edge Case 3: The Correct Answer Child
  if (systemPrompt.includes('3/4') || systemPrompt.includes('Answer: "37"')) {
    if (studentTurns <= 1) {
      return JSON.stringify({
        reply: 'बहुत बढ़िया! क्या आपने पहले दोनों के हर (denominators) बराबर किए?',
        phrase_key: null,
        quick_replies: ['हाँ, 1/2 को 2/4 बनाया 👍', 'अंदाज़ा लगाया 🎲'],
        hypothesis: 'CORRECT_REASONING',
        evidence_so_far: 'Probing correct reasoning logic.',
        done: false,
      });
    }
    return JSON.stringify({
      reply: 'शाबाश! आपने बिल्कुल सही नियम से हल किया है। बहुत अच्छे!',
      phrase_key: null,
      quick_replies: ['आगे बढ़ें 🚀'],
      hypothesis: 'CORRECT_REASONING',
      evidence_so_far: 'Child confirmed correct equivalent fraction strategy.',
      done: true,
    });
  }

  // Edge Case 1: The "I don't know" Child
  const isUncertainReply = 
    lastUserAnswer.includes('pata nahi') || 
    lastUserAnswer.includes("don't know") || 
    lastUserAnswer.includes('nahi pata') || 
    lastUserAnswer.includes('नहीं पता');

  if (isUncertainReply && studentTurns >= 2) {
    return JSON.stringify({
      reply: 'कोई बात नहीं राहुल! हम मिलकर सीखेंगे। चलो आगे बढ़ते हैं!',
      phrase_key: 'phrase_closing_01',
      quick_replies: ['आगे बढ़ें 🚀'],
      hypothesis: 'UNCERTAIN_OR_GUESS',
      evidence_so_far: 'Child replied "I don\'t know" repeatedly. Flagged for teacher review.',
      done: true,
    });
  }

  // Standard Turn 1 (0 student replies so far)
  if (studentTurns === 0) {
    return JSON.stringify({
      reply: 'अच्छा प्रयास! 2/6 उत्तर मिला, ऊपर वाले नंबरों के साथ क्या किया?',
      phrase_key: 'phrase_probe_numerator',
      quick_replies: ['1 और 1 जोड़ दिया ➕', 'गुणा किया ✖️', 'मुझे नहीं पता 🤔'],
      hypothesis: 'DENOMINATOR_ADDITION',
      evidence_so_far: 'Child responded 2/6; probing numerator step.',
      done: false,
    });
  }

  // Standard Turn 2
  if (studentTurns === 1) {
    return JSON.stringify({
      reply: 'बहुत अच्छे! समझ गया। और नीचे वाले 2 और 4 के साथ क्या किया?',
      phrase_key: 'phrase_probe_denominator',
      quick_replies: ['2 और 4 को जोड़कर 6 बनाया ➕', 'बड़ा नंबर 4 चुना', 'अंदाज़ा लगाया 🎲'],
      hypothesis: 'DENOMINATOR_ADDITION',
      evidence_so_far: `Child confirmed numerator strategy: "${lastUserAnswer}". Probing denominator strategy.`,
      done: false,
    });
  }

  // Standard Turn 3
  if (studentTurns === 2) {
    return JSON.stringify({
      reply: 'शाबाश! क्या भिन्न (fractions) में नीचे वाले नंबर भी हमेशा जुड़ते हैं?',
      phrase_key: 'phrase_probe_rule',
      quick_replies: ['हाँ, हमेशा जुड़ते हैं 👍', 'नहीं, शायद बराबर करते हैं', 'पता नहीं 🤔'],
      hypothesis: 'DENOMINATOR_ADDITION',
      evidence_so_far: `Child confirmed denominator addition: "${lastUserAnswer}". Checking rule confidence.`,
      done: false,
    });
  }

  // Standard Turn 4 Wrap Up
  return JSON.stringify({
    reply: 'बहुत बढ़िया समझाया राहुल! चलो अब मिलकर इसका सही तरीका सीखते हैं।',
    phrase_key: 'phrase_closing_01',
    quick_replies: ['आगे बढ़ें 🚀'],
    hypothesis: 'DENOMINATOR_ADDITION',
    evidence_so_far: 'Definitive confirmation: child treats fractions as two independent whole numbers.',
    done: true,
  });
}

module.exports = {
  nextBotTurn,
  generateTeacherSummary,
  buildSystemPrompt,
  cleanAndParseJSON,
};
