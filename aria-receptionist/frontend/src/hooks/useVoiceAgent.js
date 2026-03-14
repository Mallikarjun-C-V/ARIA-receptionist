import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { speechRecognition, speechSynthesis } from '../services/speechService';
import { sendMessage, healthCheck } from '../services/apiService';

export const STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

export function useVoiceAgent() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [sessionId] = useState(() => uuidv4());

  // Keep history for Claude context (last 10 exchanges = 20 messages)
  const historyRef = useRef([]);

  // Check backend on mount
  useEffect(() => {
    healthCheck().then(({ online }) => setIsOnline(online));
  }, []);

  const addMessage = useCallback((role, content, extra = {}) => {
    const msg = {
      id: uuidv4(),
      role,
      content,
      ts: Date.now(),
      ...extra,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const processUserInput = useCallback(async (text) => {
    if (!text?.trim()) return;

    setTranscript('');
    addMessage('user', text);

    // Add to history
    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: text },
    ].slice(-20);

    setStatus(STATUS.PROCESSING);

    let retryCount = 0;
    const MAX_RETRIES = 2;
    let lastError;

    while (retryCount < MAX_RETRIES) {
      try {
        // Send to backend (which calls Claude)
        const data = await sendMessage(text, sessionId, historyRef.current.slice(0, -1));

        // Validate response has expected structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }
        
        const aiText = data.response || "I'm here to assist you.";
        
        if (!aiText || typeof aiText !== 'string') {
          throw new Error('Invalid response text from server');
        }

        // Update history with AI response
        historyRef.current = [
          ...historyRef.current,
          { role: 'assistant', content: aiText },
        ].slice(-20);

        // Add AI message with extras (with safe defaults)
        addMessage('assistant', aiText, {
          intent: data.intent || 'general',
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          booking: data.booking || null,
          sentiment: data.sentiment || 'neutral',
          actionResult: data.actionResult || null,
        });

// Speak the response (with error handling)
      try {
        setStatus(STATUS.SPEAKING);
        speechSynthesis.speak(aiText, {
          onStart: () => setStatus(STATUS.SPEAKING),
          onEnd: () => setStatus(STATUS.IDLE),
          onError: (err) => {
            console.error('Speech synthesis error:', err);
            setStatus(STATUS.IDLE);
          },
        });
      } catch (speechError) {
        console.error('Speech synthesis error:', speechError);
        setStatus(STATUS.IDLE);
      }
        
        return; // Success - exit retry loop

      } catch (error) {
        lastError = error;
        retryCount++;
        console.error(`Voice agent error (attempt ${retryCount}/${MAX_RETRIES}):`, error);

        if (retryCount < MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
      }
    }

    // All retries exhausted
    console.error('Voice agent failed after retries:', lastError);
    const errorMsg = "I apologize, I'm having trouble connecting right now. Please check your connection and try again.";
    addMessage('assistant', errorMsg, { isError: true });

    setStatus(STATUS.SPEAKING);
    speechSynthesis.speak(errorMsg, {
      onEnd: () => setStatus(STATUS.IDLE),
      onError: () => setStatus(STATUS.IDLE),
    });
  }, [sessionId, addMessage]);

  const startListening = useCallback(() => {
    if (!speechRecognition.isSupported()) {
      addMessage('assistant', 'Speech recognition is not supported in your browser. Please use Google Chrome or Microsoft Edge.', { isError: true });
      return;
    }

    speechSynthesis.stop();
    setStatus(STATUS.LISTENING);
    setTranscript('');

    speechRecognition.start({
      onStart: () => setStatus(STATUS.LISTENING),
      onInterimResult: (t) => setTranscript(t),
      onFinalResult: (t) => {
        setTranscript(t);
        processUserInput(t);
      },
      onError: (msg) => {
        setStatus(STATUS.IDLE);
        setTranscript('');
        if (msg !== 'No speech detected. Please try again.') {
          addMessage('assistant', msg, { isError: true });
        }
      },
      onEnd: () => {
        if (status === STATUS.LISTENING) setStatus(STATUS.IDLE);
      },
    });
  }, [processUserInput, addMessage, status]);

  const stopListening = useCallback(() => {
    speechRecognition.stop();
    setStatus(STATUS.IDLE);
    setTranscript('');
  }, []);

  const handleMicClick = useCallback(() => {
    switch (status) {
      case STATUS.IDLE:
        startListening();
        break;
      case STATUS.LISTENING:
        stopListening();
        break;
      case STATUS.SPEAKING:
        speechSynthesis.stop();
        setStatus(STATUS.IDLE);
        setTimeout(startListening, 200);
        break;
      default:
        break;
    }
  }, [status, startListening, stopListening]);

  const sendTextMessage = useCallback((text) => {
    speechSynthesis.stop();
    processUserInput(text);
  }, [processUserInput]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    speechSynthesis.stop();
    setStatus(STATUS.IDLE);
    setTranscript('');
  }, []);

  const greet = useCallback(() => {
    const greetings = [
      "Good evening! I'm ARIA, your AI receptionist at The Velvet Room. I can help you make a reservation, check availability, or answer any questions about our restaurant. How may I assist you?",
    ];
    const text = greetings[0];
    addMessage('assistant', text, {
      suggestions: ['Book a table', 'Check availability', 'View our hours', 'Special occasions'],
    });
    setTimeout(() => {
      setStatus(STATUS.SPEAKING);
      speechSynthesis.speak(text, {
        onEnd: () => setStatus(STATUS.IDLE),
        onError: () => setStatus(STATUS.IDLE),
      });
    }, 600);
  }, [addMessage]);

  return {
    messages,
    status,
    transcript,
    isOnline,
    sessionId,
    handleMicClick,
    sendTextMessage,
    clearConversation,
    greet,
    startListening,
    stopListening,
  };
}
