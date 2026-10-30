// backend/chat/strings.js
// Central repository for all user-facing strings across Hindi, Hinglish, and English.
// EDIT THIS FILE to customize phrasing, tone, or dialect for Class 4 students.

module.exports = {
  // Greetings & Opening openers (Starts from already submitted answer)
  openers: {
    hi: {
      default: 'शाबाश! आपने जो उत्तर दिया, वह कैसे सोचा? मुझे समझाओगे?',
      encouragement: 'बहुत अच्छा प्रयास! चलो मिलकर समझते हैं।',
    },
    hinglish: {
      default: 'Good try! Yeh answer kaise nikala? Mujhe thoda bataoge?',
      encouragement: 'Nice attempt! Chalo saath milkar dekhte hain.',
    },
    en: {
      default: 'Good try! How did you get that answer? Can you explain?',
      encouragement: 'Great effort! Let us check it together.',
    },
  },

  // Standard Quick-Replies offered to the child
  quickReplies: {
    hi: {
      dontKnow: 'मुझे नहीं पता 🤔',
      guessed: 'मैंने अंदाज़ा लगाया 🎲',
      addedNumbers: 'मैंने दोनों को जोड़ दिया ➕',
      subtractedTopBottom: 'ऊपर-नीचे घटाया ➖',
      borrowedOne: '१ उधार (borrow) लिया 🔄',
      needHelp: 'थोड़ी मदद चाहिए 🙋',
      done: 'हाँ, समझ गया! 👍',
      addedAcrossFractions: 'ऊपर-ऊपर और नीचे-नीचे जोड़ा ➕',
      multipliedInstead: 'गुणा कर दिया ✖️',
    },
    hinglish: {
      dontKnow: 'Mujhe nahi pata 🤔',
      guessed: 'Maine andaza lagaya 🎲',
      addedNumbers: 'Maine add kar diya ➕',
      subtractedTopBottom: 'Bade se chhota ghataya ➖',
      borrowedOne: '1 borrow kiya 🔄',
      needHelp: 'Help chahiye 🙋',
      done: 'Haan, samajh gaya! 👍',
      addedAcrossFractions: 'Upar-upar aur neeche-neeche add kiya ➕',
      multipliedInstead: 'Multiply kar diya ✖️',
    },
    en: {
      dontKnow: "I don't know 🤔",
      guessed: 'I just guessed 🎲',
      addedNumbers: 'I added them ➕',
      subtractedTopBottom: 'I subtracted numbers ➖',
      borrowedOne: 'I borrowed 1 🔄',
      needHelp: 'Need help 🙋',
      done: 'Yes, understood! 👍',
      addedAcrossFractions: 'Added top-to-top and bottom-to-bottom ➕',
      multipliedInstead: 'I multiplied them ✖️',
    },
  },

  // Transition & Completion Messages
  closing: {
    hi: {
      thankYou: 'बहुत बढ़िया! आपने बहुत अच्छा समझाया। अब आगे बढ़ते हैं!',
      buttonText: 'आगे बढ़ें 🚀',
    },
    hinglish: {
      thankYou: 'Super! Aapne mast samjhaya. Ab aage chalte hain!',
      buttonText: 'Aage badhein 🚀',
    },
    en: {
      thankYou: 'Awesome! You explained so well. Let us move ahead!',
      buttonText: 'Continue 🚀',
    },
  },

  // Error & Fallback responses
  fallbacks: {
    hi: {
      error: 'अरे, कुछ गड़बड़ हो गई! कोई बात नहीं, आगे बढ़ते हैं।',
      timeout: 'चलो, अब अगला सवाल देखते हैं!',
      fractionQuestion: 'बहुत अच्छा प्रयास! मुझे बताओ, ऊपर और नीचे के नंबरों के साथ क्या किया?',
      fractionQuickReplies: ['ऊपर-ऊपर और नीचे-नीचे जोड़ा ➕', 'सिर्फ नीचे वाले जोड़े ➕', 'अंदाज़ा लगाया 🎲'],
    },
    hinglish: {
      error: 'Arre, network mein problem hui. Koi baat nahi, aage badhein!',
      timeout: 'Chalo, ab next question dekhte hain!',
      fractionQuestion: 'Good try! Mujhe batao, upar aur neeche ke numbers ke saath kya kiya?',
      fractionQuickReplies: ['Upar aur neeche dono add kiye ➕', 'Sirf neeche wale add kiye', 'Andaza lagaya 🎲'],
    },
    en: {
      error: 'Oops, something went wrong. No worries, let us continue!',
      timeout: 'Let us move to the next question!',
      fractionQuestion: 'Good try! Tell me, what did you do with the top and bottom numbers?',
      fractionQuickReplies: ['Added top-to-top and bottom-to-bottom ➕', 'Added only bottom numbers', 'I just guessed 🎲'],
    },
  },

  // System UI labels for the student screen
  ui: {
    hi: {
      headerTitle: 'दीदी / शिक्षक जी से बात',
      inputPlaceholder: 'यहाँ बोलें या लिखें...',
      speakButton: 'बोलकर बताएं 🎙️',
      skipButton: 'छोड़ें (Skip)',
    },
    hinglish: {
      headerTitle: 'Teacher Ji se baat',
      inputPlaceholder: 'Yahan bole ya likhein...',
      speakButton: 'Bolkar batayein 🎙️',
      skipButton: 'Skip karein',
    },
    en: {
      headerTitle: 'Chat with Teacher',
      inputPlaceholder: 'Speak or type here...',
      speakButton: 'Tap to speak 🎙️',
      skipButton: 'Skip',
    },
  },
};
