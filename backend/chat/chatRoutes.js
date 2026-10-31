// backend/chat/chatRoutes.js
// Express API router for Teacher Bot Chat feature with Smart Focus topic selection.
// Prefix: /chat

const express = require('express');
const { randomUUID } = require('crypto');
const config = require('./config');
const chatModel = require('./chatModel');
const { nextBotTurn, generateTeacherSummary, selectSmartFocusAnchor } = require('./chatBrain');

const router = express.Router();

/**
 * Middleware: Check if chat feature is enabled.
 * If CHAT_FEATURE_ENABLED is false, requests are safely bypassed/rejected.
 */
router.use((req, res, next) => {
  if (!config.isEnabled) {
    return res.status(403).json({
      ok: false,
      featureEnabled: false,
      message: 'Chat feature is disabled via CHAT_FEATURE_ENABLED in .env',
    });
  }
  next();
});

/**
 * 1. POST /chat/start
 * Initializes a new diagnostic dialogue session with "Smart Focus" topic anchor.
 */
router.post('/start', async (req, res) => {
  try {
    const {
      studentId,
      questionId,
      responseId = null,
      language = config.defaultLanguage,
      studentName = 'Student',
      question = '',
      studentAnswer = '',
      studentExplanation = '',
      quizResults = [],
      responses = [],
    } = req.body;

    const sessionId = randomUUID();

    // 1. Smart Focus Logic: Topic Grouping & Anchor Question Selection
    const resultsPool = Array.isArray(quizResults) && quizResults.length > 0 ? quizResults : responses;
    const smartFocus = selectSmartFocusAnchor(resultsPool, {
      questionId,
      questionText: question,
      studentAnswer,
      studentExplanation,
    });

    const activeQuestion = smartFocus.anchorQuestion || question || '61 - 24 = ?';
    const activeQuestionId = smartFocus.anchorQuestionId || questionId || 'probe_01';
    const activeStudentAnswer = smartFocus.anchorStudentAnswer || studentAnswer || '43';

    // 2. Persist session
    const session = await chatModel.createSession({
      id: sessionId,
      responseId,
      studentId,
      questionId: activeQuestionId,
      language,
    });

    // 3. Prepare student context with Anchor Question & Anchor Topic
    const studentContext = {
      studentName,
      question: activeQuestion,
      studentAnswer: activeStudentAnswer,
      studentExplanation,
      language,
      anchorTopic: smartFocus.anchorTopic,
      anchorQuestion: activeQuestion,
      isMixedTopics: smartFocus.isMixedTopics,
    };

    // 4. Generate opening turn from bot
    const botTurn = await nextBotTurn([], studentContext);

    // 5. Save bot message to DB with metadata
    const botMsgId = randomUUID();
    await chatModel.addMessage({
      id: botMsgId,
      sessionId,
      sender: 'bot',
      text: botTurn.reply,
      quickReplies: botTurn.quick_replies || [],
      turnNumber: 1,
      metadata: {
        phrase_key: botTurn.phrase_key || null,
        hypothesis: botTurn.hypothesis,
        evidence_so_far: botTurn.evidence_so_far,
        anchor_topic: smartFocus.anchorTopic,
        anchor_question: activeQuestion,
        anchor_question_id: activeQuestionId,
        anchor_answer: activeStudentAnswer,
        is_mixed_topics: smartFocus.isMixedTopics,
      },
    });

    // Update turn count
    await chatModel.updateSession(sessionId, { turnCount: 1 });

    res.json({
      ok: true,
      sessionId,
      dbPersisted: Boolean(session?.persistedToDb),
      turn: 1,
      anchorTopic: smartFocus.anchorTopic,
      anchorQuestion: activeQuestion,
      anchorQuestionId: activeQuestionId,
      anchorStudentAnswer: activeStudentAnswer,
      isMixedTopics: smartFocus.isMixedTopics,
      bot: {
        id: botMsgId,
        reply: botTurn.reply,
        phrase_key: botTurn.phrase_key || null,
        quick_replies: botTurn.quick_replies,
        hypothesis: botTurn.hypothesis,
        done: botTurn.done,
      },
    });
  } catch (err) {
    console.error('Error starting chat session:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 2. POST /chat/message
 * Accepts the student's reply (text or quick-reply) and computes the bot's response.
 * Maintains focus on the anchor topic even if student mentions other topics.
 */
router.post('/message', async (req, res) => {
  try {
    const {
      sessionId,
      text,
      selectedQuickReply = null,
      studentContext = {},
    } = req.body;

    if (!sessionId || !text) {
      return res.status(400).json({ ok: false, error: 'sessionId and text are required' });
    }

    const session = await chatModel.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Chat session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ ok: false, error: 'Chat session is already finished' });
    }

    // 1. Fetch current conversation history
    const existingMessages = await chatModel.getMessages(sessionId);
    const studentTurnNum = existingMessages.filter((m) => m.sender === 'bot').length;

    // 2. Save student message
    const studentMsgId = randomUUID();
    await chatModel.addMessage({
      id: studentMsgId,
      sessionId,
      sender: 'student',
      text,
      selectedQuickReply,
      turnNumber: studentTurnNum,
    });

    // 3. Rebuild updated transcript for the bot
    const updatedHistory = [...existingMessages, { sender: 'student', text }];

    const firstBotMsg = existingMessages.find((m) => m.sender === 'bot');
    const anchorTopic = studentContext.anchorTopic || firstBotMsg?.metadata?.anchor_topic || 'Subtraction';
    const anchorQuestion = studentContext.anchorQuestion || firstBotMsg?.metadata?.anchor_question || studentContext.question || '61 - 24 = ?';
    const anchorAnswer = studentContext.studentAnswer || firstBotMsg?.metadata?.anchor_answer || '43';
    const isMixedTopics = studentContext.isMixedTopics ?? firstBotMsg?.metadata?.is_mixed_topics ?? false;

    const context = {
      studentName: studentContext.studentName || 'Student',
      question: anchorQuestion,
      studentAnswer: anchorAnswer,
      studentExplanation: studentContext.studentExplanation || '',
      language: session.language || config.defaultLanguage,
      anchorTopic,
      anchorQuestion,
      isMixedTopics,
    };

    // 4. Generate next bot turn
    const botTurn = await nextBotTurn(updatedHistory, context);
    const botTurnNum = studentTurnNum + 1;

    // 5. Save bot reply
    const botMsgId = randomUUID();
    await chatModel.addMessage({
      id: botMsgId,
      sessionId,
      sender: 'bot',
      text: botTurn.reply,
      quickReplies: botTurn.quick_replies || [],
      turnNumber: botTurnNum,
      metadata: {
        phrase_key: botTurn.phrase_key || null,
        hypothesis: botTurn.hypothesis,
        evidence_so_far: botTurn.evidence_so_far,
        anchor_topic: anchorTopic,
        anchor_question: anchorQuestion,
        is_mixed_topics: isMixedTopics,
      },
    });

    // 6. Update session progress
    await chatModel.updateSession(sessionId, {
      turnCount: botTurnNum,
      status: botTurn.done ? 'completed' : 'active',
      completedAt: botTurn.done ? new Date().toISOString() : null,
    });

    res.json({
      ok: true,
      sessionId,
      turn: botTurnNum,
      bot: {
        id: botMsgId,
        reply: botTurn.reply,
        phrase_key: botTurn.phrase_key || null,
        quick_replies: botTurn.quick_replies,
        hypothesis: botTurn.hypothesis,
        done: botTurn.done,
      },
    });
  } catch (err) {
    console.error('Error handling chat message:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 3. POST /chat/finish
 * Concludes the conversation and generates the Teacher Summary.
 * The trained Python ML model (Port 8000) is the authoritative diagnostic engine.
 * LLM is strictly used for conversational summarization and quotes, with graceful fallback if ML is offline.
 */
router.post('/finish', async (req, res) => {
  try {
    const { sessionId, studentContext = {}, existingDiagnosis = null } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'sessionId is required' });
    }

    const session = await chatModel.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }

    const existingSummary = await chatModel.getSummary(sessionId);
    if (existingSummary) {
      return res.json({ ok: true, sessionId, summary: existingSummary });
    }

    const messages = await chatModel.getMessages(sessionId);

    // 1. Prepare student context & dialogue data
    const firstBotMsg = messages.find((m) => m.sender === 'bot');
    const anchorTopic = studentContext.anchorTopic || firstBotMsg?.metadata?.anchor_topic || 'Subtraction';
    const anchorQuestion = studentContext.question || firstBotMsg?.metadata?.anchor_question || '61 - 24 = ?';
    const anchorQuestionId = session.questionId || firstBotMsg?.metadata?.anchor_question_id || studentContext.questionId || 'probe_01';
    const anchorAnswer = studentContext.studentAnswer ?? firstBotMsg?.metadata?.anchor_answer ?? existingDiagnosis?.answer ?? existingDiagnosis?.selectedAnswer ?? 43;
    const isMixedTopics = studentContext.isMixedTopics ?? firstBotMsg?.metadata?.is_mixed_topics ?? false;

    const questionId = anchorQuestionId;
    const rawAnswer = anchorAnswer;
    const studentAnswer = Number.isNaN(Number(rawAnswer)) ? rawAnswer : Number(rawAnswer);
    const studentSpokenText = messages.filter(m => m.sender === 'student').map(m => m.text).join(' ');
    const fullTranscript = messages.map(m => `${m.sender === 'student' ? 'Student' : 'Teacher'}: ${m.text}`).join('\n');
    const chatTurns = messages.map(m => ({ sender: m.sender, text: m.text }));

    const context = {
      studentName: studentContext.studentName || 'Student',
      question: anchorQuestion,
      studentAnswer: String(studentAnswer),
      studentExplanation: studentContext.studentExplanation || studentSpokenText,
      language: session.language || 'hi',
      anchorTopic,
      anchorQuestion,
      isMixedTopics,
    };

    // 2. Use LLM strictly for conversational synthesis and dialogue nuances (NOT final misconception ID)
    const summaryData = await generateTeacherSummary(messages, context, existingDiagnosis);

    // 3. Authoritative Diagnosis via trained Python ML Model (Port 8000 /predict)
    const mlService = require('../services/mlService');
    const mlRes = await mlService.predictChatDiagnosis({
      questionId,
      answer: studentAnswer,
      explanation: studentSpokenText || studentContext.studentExplanation || '',
      chatTurns,
      transcript: fullTranscript,
    });

    let authoritativeDiagnosis = null;
    let finalMisconceptionId = summaryData.misconception_id;
    let finalConfidence = summaryData.confidence || 'MEDIUM';
    let finalSuggestedNextStep = summaryData.suggested_next_step;
    let finalEvidence = summaryData.evidence;
    let finalWhatChildUnderstands = summaryData.what_child_understands;
    let diagnosticEngine = 'llm_fallback';

    if (mlRes.status === 'ok' && mlRes.diagnosis) {
      authoritativeDiagnosis = mlRes.diagnosis;
      diagnosticEngine = 'trained_python_ml_model';

      // Python ML model is the authority for final misconception, confidence, and next steps
      finalMisconceptionId = authoritativeDiagnosis.misconception_id || authoritativeDiagnosis.ruleId || authoritativeDiagnosis.possibleMisconception || summaryData.misconception_id;
      finalConfidence = authoritativeDiagnosis.confidence || 'HIGH';
      finalSuggestedNextStep = authoritativeDiagnosis.suggested_next_step || authoritativeDiagnosis.suggestedActivity || summaryData.suggested_next_step;

      if (authoritativeDiagnosis.evidence) {
        if (Array.isArray(authoritativeDiagnosis.evidence) && authoritativeDiagnosis.evidence.length > 0) {
          finalEvidence = authoritativeDiagnosis.evidence;
        } else if (typeof authoritativeDiagnosis.evidence === 'object') {
          finalEvidence = Object.entries(authoritativeDiagnosis.evidence).map(([k, v]) => `${k}: ${v}`);
        }
      }
      if (authoritativeDiagnosis.what_child_understands || authoritativeDiagnosis.observations) {
        finalWhatChildUnderstands = authoritativeDiagnosis.what_child_understands || authoritativeDiagnosis.observations;
      }
    } else {
      console.warn('[WARNING] Using LLM fallback instead of trained ML model');
    }

    const summaryId = randomUUID();
    const saved = await chatModel.saveSummary({
      id: summaryId,
      sessionId,
      responseId: session.responseId,
      studentId: session.studentId,
      misconceptionId: finalMisconceptionId,
      evidence: finalEvidence,
      whatChildUnderstands: finalWhatChildUnderstands,
      confidence: finalConfidence,
      suggestedNextStep: finalSuggestedNextStep,
      agreesWithExistingDiagnosis: summaryData.agrees_with_existing_diagnosis,
      needsTeacherReview: summaryData.needs_teacher_review,
      rawSummaryJson: {
        ...summaryData,
        misconception_id: finalMisconceptionId,
        confidence: finalConfidence,
        suggested_next_step: finalSuggestedNextStep,
        diagnostic_engine: diagnosticEngine,
        python_ml_diagnosis: authoritativeDiagnosis,
      },
    });

    // 4. Update Postgres Diagnoses record if responseId is linked
    if (session.responseId && process.env.DATABASE_URL) {
      try {
        const DiagnosisModel = require('../models/Diagnosis');
        await DiagnosisModel.create({
          responseId: session.responseId,
          observations: finalWhatChildUnderstands,
          possibleMisconception: finalMisconceptionId,
          evidence: Array.isArray(finalEvidence) ? finalEvidence : [finalEvidence],
          alternatives: authoritativeDiagnosis?.alternatives || ['Calculation slip', 'Guessing'],
          confidence: finalConfidence,
          followUpQuestion: authoritativeDiagnosis?.followUpQuestion || summaryData.suggested_next_step,
          suggestedActivity: finalSuggestedNextStep,
          ruleId: finalMisconceptionId,
        });
        console.log(`[ChatRoutes] Synced authoritative Python ML diagnosis to DB for responseId: ${session.responseId}`);
      } catch (dbDiagErr) {
        console.warn('[ChatRoutes] Could not update DiagnosisModel for responseId:', dbDiagErr.message);
      }
    }

    await chatModel.updateSession(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      sessionId,
      dbPersisted: Boolean(saved?.persistedToDb),
      summary: saved,
      reconciledDiagnosis: authoritativeDiagnosis,
      diagnosticEngine,
    });
  } catch (err) {
    console.error('Error finishing chat session:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 4. GET /chat/summary/:sessionId
 */
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const summary = await chatModel.getSummary(sessionId);
    if (!summary) {
      return res.status(404).json({ ok: false, error: 'Summary not found' });
    }
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 5. GET /chat/summary/response/:responseId
 */
router.get('/summary/response/:responseId', async (req, res) => {
  try {
    const { responseId } = req.params;
    const summary = await chatModel.getSummaryByResponseId(responseId);
    if (!summary) {
      return res.status(404).json({ ok: false, error: 'Summary for response not found' });
    }
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 6. GET /chat/transcript/:sessionId
 */
router.get('/transcript/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await chatModel.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    const messages = await chatModel.getMessages(sessionId);
    const summary = await chatModel.getSummary(sessionId);

    res.json({
      ok: true,
      session,
      messages,
      summary,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 7. GET /chat/transcript/response/:responseId
 */
router.get('/transcript/response/:responseId', async (req, res) => {
  try {
    const { responseId } = req.params;
    const session = await chatModel.getSessionByResponseId(responseId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session for response not found' });
    }
    const messages = await chatModel.getMessages(session.id);
    const summary = await chatModel.getSummary(session.id);

    res.json({
      ok: true,
      session,
      messages,
      summary,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 8. POST /chat/feedback
 * Records teacher dispute or review on the generated AI summary.
 */
router.post('/feedback', async (req, res) => {
  try {
    const {
      sessionId,
      responseId = null,
      feedback = 'summary_disputed',
      note = '',
      originalRuleId = 'UNKNOWN',
    } = req.body;

    const feedbackId = randomUUID();
    const saved = await chatModel.saveFeedback({
      id: feedbackId,
      sessionId,
      responseId,
      feedback,
      note,
      originalRuleId,
    });

    res.json({
      ok: true,
      feedbackId,
      message: 'Teacher feedback recorded successfully',
      feedback: saved,
    });
  } catch (err) {
    console.error('Error saving teacher feedback:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
