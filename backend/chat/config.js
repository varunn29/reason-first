// backend/chat/config.js
// Configuration and feature flags for the Teacher Bot Chat module.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });

const config = {
  // Master feature flag: When false, app operates exactly as today
  isEnabled: process.env.CHAT_FEATURE_ENABLED === 'true',

  // Conversation constraints tailored for Class 4 students (ages 8-10)
  limits: {
    maxQuestions: 4,
    maxWordsPerMessage: 15,
    quickRepliesCount: 3,
  },

  // Supported languages
  supportedLanguages: ['hi', 'hinglish', 'en'],
  defaultLanguage: process.env.CHAT_DEFAULT_LANGUAGE || 'hi',

  // LLM settings
  llm: {
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.CHAT_LLM_MODEL || 'gemini-3.8-flash',
    temperature: 0.2, // low temperature for consistent diagnostic behavior
  },

  // Misconception IDs reused from the existing diagnostic system
  knownMisconceptions: [
    'SMALLER_FROM_LARGER',
    'BORROW_WITHOUT_DECREMENT',
    'ADD_INSTEAD_OF_SUBTRACT',
    'DENOMINATOR_ADDITION', // Fraction misconception: e.g. 1/3 + 1/3 = 2/6
    'NUMERATOR_ONLY_OPERATION',
    'CORRECT_REASONING',
    'UNCERTAIN_OR_GUESS',
  ],
};

module.exports = config;

