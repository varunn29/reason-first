import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  X,
  Radio
} from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import phraseMap from '../data/phrases.json';

const ChatScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { 
    currentAssignment, 
    activeStudent,
    studentAnswer, 
    diagnosticResult, 
    latestResponseId, 
    setChatSummary 
  } = useContext(AppContext);

  // Feature Flag: Check if chat is enabled
  const isChatEnabled = import.meta.env.VITE_CHAT_FEATURE_ENABLED !== 'false';

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(1);

  // Smart Focus Anchor States
  const [anchorTopic, setAnchorTopic] = useState('Subtraction');
  const [anchorQuestion, setAnchorQuestion] = useState(location.state?.questionText || '61 - 24 = ?');
  const [anchorStudentAnswer, setAnchorStudentAnswer] = useState(location.state?.studentAnswer ?? studentAnswer ?? '43');

  // Audio & Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [interimSpokenText, setInterimSpokenText] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  const isListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const latestSpokenTextRef = useRef('');

  const question = currentAssignment?.questions?.[0] || {
    id: 'probe_01',
    text: '61 - 24 = ?',
    correctAnswer: 37,
  };

  const currentAnswer = location.state?.studentAnswer ?? studentAnswer ?? '43';
  const responseId = location.state?.responseId ?? latestResponseId ?? null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isSending, isListening]);

  // Sync live spoken words directly into the text input box in real time
  useEffect(() => {
    if (isListening && interimSpokenText) {
      setInputText(interimSpokenText);
    }
  }, [interimSpokenText, isListening]);

  // 1. Play teacher voice: Checks pre-recorded audio in /audio/phrases/ or falls back to TTS
  const playTeacherVoice = (phraseKey, textFallback) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const phraseData = phraseKey ? phraseMap[phraseKey] : null;
    const audioUrl = phraseData?.audioFile;

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);

      audio.play().then(() => {
        audio.onended = () => {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
        };
      }).catch((err) => {
        console.warn('Pre-recorded audio playback skipped, falling back to Web Speech synthesis:', err.message);
        fallbackSpeechSynthesis(textFallback || phraseData.text);
      });
    } else if (textFallback) {
      fallbackSpeechSynthesis(textFallback);
    }
  };

  const fallbackSpeechSynthesis = (text) => {
    if ('speechSynthesis' in window) {
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // 2. Initialize dialogue session on mount with Smart Focus parameters
  useEffect(() => {
    if (!isChatEnabled) {
      navigate('/report', { replace: true });
      return;
    }

    // Check browser speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }

    let isMounted = true;

    async function initChat() {
      setIsLoading(true);
      const activeStudentId = location.state?.studentId || currentUser?.id || activeStudent?.id || '';
      const activeStudentName = location.state?.studentName || currentUser?.name || activeStudent?.displayName || 'Student';
      const activeQuestionId = location.state?.questionId || question.id;
      const activeQuestionText = location.state?.questionText || question.text;
      const quizResults = location.state?.quizResults || [];

      try {
        const data = await api.startChat({
          studentId: activeStudentId,
          questionId: activeQuestionId,
          responseId,
          language: 'hi',
          studentName: activeStudentName,
          question: activeQuestionText,
          studentAnswer: currentAnswer,
          studentExplanation: '',
          quizResults,
        });

        if (isMounted && data.ok) {
          setSessionId(data.sessionId);
          setCurrentTurn(data.turn || 1);
          if (data.anchorQuestion) setAnchorQuestion(data.anchorQuestion);
          if (data.anchorTopic) setAnchorTopic(data.anchorTopic);
          if (data.anchorStudentAnswer) setAnchorStudentAnswer(data.anchorStudentAnswer);

          setMessages([
            {
              id: data.bot.id || 'bot_1',
              sender: 'bot',
              text: data.bot.reply,
              phraseKey: data.bot.phrase_key || 'phrase_opener_01',
            },
          ]);
          setQuickReplies(data.bot.quick_replies || []);
          if (data.bot.done) setIsDone(true);

          // Automatically play opening greeting
          playTeacherVoice(data.bot.phrase_key || 'phrase_opener_01', data.bot.reply);
        }
      } catch (err) {
        console.warn('Chat API offline, starting with standard probe opener:', err.message);
        if (isMounted) {
          setSessionId('offline_session_' + Date.now());
          const isMixed = (location.state?.quizResults || []).length > 1;
          const fallbackText = isMixed
            ? `I see you worked on a few topics today. Let's look at the subtraction problem: ${activeQuestionText}. You answered ${currentAnswer}. How did you solve the ones column?`
            : `शाबाश ${activeStudentName}! आपने उत्तर ${currentAnswer} चुना। मुझे समझाओगे कि आपने यह कैसे सोचा?`;

          setMessages([
            {
              id: 'offline_1',
              sender: 'bot',
              text: fallbackText,
              phraseKey: 'phrase_opener_01',
            },
          ]);
          setQuickReplies([
            'मैंने जोड़ दिया ➕',
            'ऊपर-नीचे घटाया ➖',
            'मुझे नहीं पता 🤔',
          ]);
          playTeacherVoice('phrase_opener_01', fallbackText);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initChat();

    return () => {
      isMounted = false;
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // 3. Hands-Free Voice Input: Web Speech Recognition with Keep-Alive for Silence
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    if (currentAudioRef.current) currentAudioRef.current.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    isListeningRef.current = true;
    latestSpokenTextRef.current = '';
    setIsListening(true);
    setMicPermissionDenied(false);
    setInterimSpokenText('');

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setMicPermissionDenied(false);
      };

      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcriptPart;
          } else {
            interimText += transcriptPart;
          }
        }

        const currentCaptured = (finalText || interimText).trim();
        if (currentCaptured) {
          latestSpokenTextRef.current = currentCaptured;
          setInterimSpokenText(currentCaptured);
          setInputText(currentCaptured);
        }

        if (finalText.trim()) {
          stopListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          isListeningRef.current = false;
          setIsListening(false);
          setMicPermissionDenied(true);
          setInterimSpokenText('');
          latestSpokenTextRef.current = '';
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (startErr) {
                if (startErr.name !== 'InvalidStateError') {
                  startListening();
                }
              }
            }
          }, 100);
        } else {
          setIsListening(false);
          setInterimSpokenText('');
          latestSpokenTextRef.current = '';
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = (shouldSend = false) => {
    const textToSend = (latestSpokenTextRef.current || interimSpokenText || inputText || '').trim();

    isListeningRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    setIsListening(false);
    setInterimSpokenText('');
    latestSpokenTextRef.current = '';

    if (shouldSend && textToSend) {
      handleSendMessage(textToSend);
    } else if (textToSend) {
      setInputText(textToSend);
    }
  };

  // 4. Send Message (Voice transcription or Text or Quick Reply)
  const handleSendMessage = async (customText = null, quickReplyTag = null) => {
    const text = (customText || inputText).trim();
    if (!text || isSending) return;

    if (isListening) {
      stopListening(false);
    }

    setInputText('');
    setInterimSpokenText('');
    setIsSending(true);

    const userMsg = {
      id: 'student_' + Date.now(),
      sender: 'student',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuickReplies([]);

    try {
      if (sessionId && !sessionId.startsWith('offline_session_')) {
        const data = await api.sendChatMessage({
          sessionId,
          text,
          selectedQuickReply: quickReplyTag,
          studentContext: {
            studentName: location.state?.studentName || currentUser?.name || activeStudent?.displayName || 'Student',
            question: anchorQuestion,
            studentAnswer: anchorStudentAnswer || currentAnswer,
            anchorTopic,
            anchorQuestion,
          },
        });

        if (data.ok) {
          setCurrentTurn(data.turn || currentTurn + 1);
          setMessages((prev) => [
            ...prev,
            {
              id: data.bot.id || 'bot_' + Date.now(),
              sender: 'bot',
              text: data.bot.reply,
              phraseKey: data.bot.phrase_key,
            },
          ]);
          setQuickReplies(data.bot.quick_replies || []);

          // Play bot audio response
          playTeacherVoice(data.bot.phrase_key, data.bot.reply);

          if (data.bot.done || data.turn >= 4) {
            setIsDone(true);
          }
        }
      } else {
        // Offline simulation response
        setTimeout(() => {
          const closingText = 'बहुत अच्छा! आपने बहुत अच्छे से समझाया। चलो अब आगे बढ़ते हैं!';
          setMessages((prev) => [
            ...prev,
            {
              id: 'bot_' + Date.now(),
              sender: 'bot',
              text: closingText,
              phraseKey: 'phrase_closing_01',
            },
          ]);
          playTeacherVoice('phrase_closing_01', closingText);
          setIsDone(true);
          setIsSending(false);
        }, 800);
        return;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const fallbackText = 'बहुत बढ़िया प्रयास! आपने बहुत अच्छा समझाया। अब आगे बढ़ते हैं!';
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: fallbackText,
          phraseKey: 'phrase_closing_01',
        },
      ]);
      playTeacherVoice('phrase_closing_01', fallbackText);
      setIsDone(true);
    } finally {
      setIsSending(false);
    }
  };

  // 5. Complete dialogue & generate Teacher Summary
  const handleFinish = async () => {
    setIsFinishing(true);
    if (currentAudioRef.current) currentAudioRef.current.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const activeStudentName = location.state?.studentName || currentUser?.name || activeStudent?.displayName || 'Student';
    let generatedSummary = null;

    try {
      if (sessionId && !sessionId.startsWith('offline_session_')) {
        const data = await api.finishChat({
          sessionId,
          studentContext: {
            studentName: activeStudentName,
            question: anchorQuestion,
            studentAnswer: anchorStudentAnswer || currentAnswer,
            anchorTopic,
            anchorQuestion,
          },
          existingDiagnosis: diagnosticResult,
        });

        if (data.ok && data.summary) {
          generatedSummary = data.summary;
          setChatSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('Error finishing chat session:', err.message);
    } finally {
      setIsFinishing(false);
      navigate('/report', {
        state: {
          sessionId,
          responseId,
          summary: generatedSummary,
          studentName: activeStudentName,
        },
      });
    }
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-between select-none">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                <img 
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" 
                  alt="Teacher Bot" 
                  className="w-9 h-9" 
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-darkText">दीदी (Teacher Bot)</h2>
                {isPlayingAudio && (
                  <span className="flex items-center text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full animate-pulse">
                    <Radio size={10} className="mr-0.5 animate-spin" /> बोल रही हैं...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Class 3 Math Guide • Turn {Math.min(currentTurn, 4)}/4</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            disabled={isFinishing}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-primary px-3 py-1.5 rounded-full hover:bg-gray-50 active:scale-95 transition"
          >
            <span>छोड़ें</span>
            <X size={14} />
          </button>
        </div>

        {/* Question Reminder Card */}
        <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">
            {anchorTopic ? `${anchorTopic}: ` : 'सवाल: '}
            <strong className="text-darkText font-bold">{anchorQuestion || question.text}</strong>
          </span>
          <span className="px-2 py-0.5 bg-white border border-blue-200 rounded-lg text-primary font-bold">
            उत्तर: {anchorStudentAnswer || currentAnswer}
          </span>
        </div>

        {/* Chat Transcript Area */}
        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3 animate-fade-in">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-100 shadow-xs mb-1">
                <Bot className="text-primary" size={32} />
              </div>
              <h3 className="text-base font-bold text-darkText">Great job finishing the test!</h3>
              <p className="text-xs text-gray-500 font-medium max-w-xs leading-relaxed">
                Now, let's talk about some of your answers so I can help you better.
              </p>
              <Loader2 className="animate-spin text-primary mt-3" size={24} />
            </div>
          ) : (
            messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
                >
                  {isBot && (
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mb-1">
                      <Bot size={18} className="text-primary" />
                    </div>
                  )}

                  <div className={`relative max-w-[82%] px-4 py-3 rounded-2xl shadow-xs ${
                    isBot 
                      ? 'bg-white text-darkText rounded-bl-xs border border-gray-100' 
                      : 'bg-primary text-white rounded-br-xs font-medium'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>

                    {/* Bot Audio Re-play button */}
                    {isBot && (
                      <button
                        type="button"
                        onClick={() => playTeacherVoice(msg.phraseKey, msg.text)}
                        aria-label="Replay teacher voice"
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-primary hover:text-indigo-800 transition active:scale-90"
                      >
                        <Volume2 size={13} />
                        <span>फिर से सुनें (Listen)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Bot size={18} className="text-primary" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-xs border border-gray-100 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Interactive Area */}
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sticky bottom-0 z-10">
          {isDone ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 text-center animate-fade-in shadow-xs">
              <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-darkText mb-1">शाबाश! बातचीत पूरी हुई 🎉</h3>
              <p className="text-xs text-gray-600 mb-3.5">
                आपने अपनी सोच बहुत अच्छे से समझाई। अब अपना रिपोर्ट कार्ड देखें!
              </p>
              <CustomButton
                text={isFinishing ? "रिपोर्ट तैयार हो रही है..." : "रिपोर्ट देखें (Finish) 🚀"}
                variant="secondary"
                onClick={handleFinish}
                disabled={isFinishing}
                icon={isFinishing ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              />
            </div>
          ) : (
            <>
              {/* 1. Big Microphone Action (Centerpiece for Class 4 Kids) */}
              {isSpeechSupported && !micPermissionDenied && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => (isListening ? stopListening(false) : startListening())}
                    disabled={isSending}
                    className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-sm transition-all active:scale-95 ${
                      isListening
                        ? 'bg-danger text-white animate-pulse shadow-md ring-4 ring-red-100'
                        : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-95'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={20} />
                        <span>बोलना पूरा हुआ (Stop Mic) 🛑</span>
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        <span>बोलकर उत्तर दें (Tap to Speak) 🎙️</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 2. Big Tappable Quick-Reply Buttons */}
              {quickReplies && quickReplies.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    या नीचे दिए विकल्प चुनें (Or tap a button):
                  </p>
                  <div className="flex flex-col gap-2">
                    {quickReplies.map((qr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(qr, qr)}
                        disabled={isSending || isListening}
                        className="w-full text-left px-4 py-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 text-darkText text-sm font-semibold transition active:scale-95 shadow-xs flex items-center justify-between disabled:opacity-50"
                      >
                        <span>{qr}</span>
                        <span className="text-xs text-primary font-bold">चुनें 👆</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Text Input Box & Send Button */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  placeholder={isListening ? "दीदी सुन रही हैं... बोलिए..." : "यहाँ टाइप करें (Type here)..."}
                  disabled={isSending}
                  className={`flex-1 border rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    isListening
                      ? 'bg-red-50/70 border-red-300 text-darkText ring-2 ring-red-100 placeholder-red-400'
                      : 'bg-gray-50 border-gray-200 text-darkText placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim() || isSending}
                  aria-label="Send message"
                  className="p-2.5 bg-primary text-white rounded-2xl shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MobileWrapper>
  );
};

export default ChatScreen;
