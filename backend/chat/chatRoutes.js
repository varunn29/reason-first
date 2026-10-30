// backend/chat/chatRoutes.js
// Express API router for Teacher Bot Chat feature.
// Prefix: /chat

const express = require('express');
const { randomUUID } = require('crypto');
const config = require('./config');
const chatModel = require('./chatModel');
const { nextBotTurn, generateTeacherSummary } = require('./chatBrain');

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
 * Initializes a new diagnostic dialogue session and produces the opening bot turn.
 */
router.post('/start', async (req, res) => {
  try {
    const {
      studentId = 'student_01',
      questionId = 'probe_01',
      responseId = null,
      language = config.defaultLanguage,
      studentName = 'Student',
      question = '61 - 24 = ?',
      studentAnswer = '43',
      studentExplanation = '',
    } = req.body;

    const sessionId = randomUUID();

    // 1. Persist session
    const session = await chatModel.createSession({
      id: sessionId,
      responseId,
      studentId,
      questionId,
      language,
    });

    // 2. Prepare student context
    const studentContext = {
      studentName,
      question,
      studentAnswer,
      studentExplanation,
      language,
    };

    // 3. Generate opening turn from bot
    const botTurn = await nextBotTurn([], studentContext);

    // 4. Save bot message to DB
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
      },
    });

    // Update turn count
    await chatModel.updateSession(sessionId, { turnCount: 1 });

    res.json({
      ok: true,
      sessionId,
      dbPersisted: Boolean(session?.persistedToDb),
      turn: 1,
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

    const context = {
      studentName: studentContext.studentName || 'Student',
      question: studentContext.question || '1/2 + 1/4 = ?',
      studentAnswer: studentContext.studentAnswer || '2/6',
      studentExplanation: studentContext.studentExplanation || '',
      language: session.language || config.defaultLanguage,
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

    const context = {
      studentName: studentContext.studentName || 'Student',
      question: studentContext.question || '1/2 + 1/4 = ?',
      studentAnswer: studentContext.studentAnswer || '2/6',
      language: session.language || 'hi',
    };

    const summaryData = await generateTeacherSummary(messages, context, existingDiagnosis);

    const summaryId = randomUUID();
    const saved = await chatModel.saveSummary({
      id: summaryId,
      sessionId,
      responseId: session.responseId,
      studentId: session.studentId,
      misconceptionId: summaryData.misconception_id,
      evidence: summaryData.evidence,
      whatChildUnderstands: summaryData.what_child_understands,
      confidence: summaryData.confidence,
      suggestedNextStep: summaryData.suggested_next_step,
      agreesWithExistingDiagnosis: summaryData.agrees_with_existing_diagnosis,
      needsTeacherReview: summaryData.needs_teacher_review,
      rawSummaryJson: summaryData,
    });

    await chatModel.updateSession(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      sessionId,
      dbPersisted: Boolean(saved?.persistedToDb),
      summary: saved,
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

