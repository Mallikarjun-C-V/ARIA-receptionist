// ─── Speech Recognition ────────────────────────────────────────
export class SpeechRecognitionService {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.supported = false;
      return;
    }
    this.supported = true;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }

  isSupported() {
    return this.supported;
  }

  start({ onStart, onInterimResult, onFinalResult, onError, onEnd } = {}) {
    if (!this.supported) {
      onError?.('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }

    this.recognition.onstart = () => onStart?.();

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) onInterimResult?.(interim);
      if (final) {
        onFinalResult?.(final);
        this.stop();
      }
    };

    this.recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
        'no-speech': 'No speech detected. Please try again.',
        'network': 'Network error with speech recognition.',
        'audio-capture': 'No microphone found.',
      };
      onError?.(messages[event.error] || `Speech error: ${event.error}`);
    };

    this.recognition.onend = () => onEnd?.();

    try {
      this.recognition.start();
    } catch (e) {
      onError?.('Failed to start speech recognition: ' + e.message);
    }
  }

  stop() {
    try {
      this.recognition?.stop();
    } catch (e) {
      // ignore
    }
  }

  abort() {
    try {
      this.recognition?.abort();
    } catch (e) {
      // ignore
    }
  }
}

// ─── Speech Synthesis ──────────────────────────────────────────
export class SpeechSynthesisService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.preferredVoiceNames = [
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Victoria',
      'Karen',
      'Moira',
      'Fiona',
      'Alex',
    ];

    // Load voices
    if (this.synth) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
      this.voices = this.synth.getVoices();
    }
  }

  getPreferredVoice() {
    const voices = this.synth.getVoices();
    for (const name of this.preferredVoiceNames) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  speak(text, { onStart, onEnd, onError, rate = 0.95, pitch = 1.05, volume = 1 } = {}) {
    if (!this.synth) {
      onError?.('Speech synthesis not supported');
      return;
    }

    this.synth.cancel();

    // Small delay to ensure cancel completes
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.getPreferredVoice();
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => onStart?.();
      utterance.onend = () => onEnd?.();
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') onError?.(e.error);
        else onEnd?.();
      };

      this.synth.speak(utterance);
    }, 100);
  }

  stop() {
    this.synth?.cancel();
  }

  isSupported() {
    return !!this.synth;
  }
}

// ─── Singleton instances ───────────────────────────────────────
export const speechRecognition = new SpeechRecognitionService();
export const speechSynthesis = new SpeechSynthesisService();
