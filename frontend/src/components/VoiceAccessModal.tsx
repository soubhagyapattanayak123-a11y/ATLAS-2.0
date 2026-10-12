import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Search, X, AlertCircle, Sparkles } from 'lucide-react';

interface VoiceAccessModalProps {
  isOpen: boolean;
  language: 'English' | 'Hindi' | 'Odia';
  mode: 'question' | 'math' | 'voice' | 'geography';
  initialText?: string;
  onSearchSolution: (spokenText: string) => void;
  onClose: () => void;
}

export const VoiceAccessModal: React.FC<VoiceAccessModalProps> = ({
  isOpen,
  language,
  mode,
  initialText = '',
  onSearchSolution,
  onClose,
}) => {
  const [currentLang, setCurrentLang] = useState<'English' | 'Hindi' | 'Odia'>(language);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>(initialText);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSearchCountdown, setAutoSearchCountdown] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Sync prop language with internal state when modal opens or prop changes
  useEffect(() => {
    setCurrentLang(language);
  }, [language, isOpen]);

  // Language configuration for SpeechRecognition
  const langConfigMap = {
    Odia: {
      bcp47: 'or-IN',
      fallback: 'hi-IN',
      name: 'ଓଡ଼ିଆ (Odia Voice)',
      title: 'ଓଡ଼ିଆରେ କୁହନ୍ତୁ (Speak in Odia)',
      prompt: 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ ବା ଗଣିତ ସମସ୍ୟା କୁହନ୍ତୁ...',
      searching: 'ସମାଧାନ ଖୋଜୁଛି...',
      searchBtn: 'ସମାଧାନ ଖୋଜନ୍ତୁ (Search Solution)',
      listeningBadge: 'ଶୁଣୁଛି... କୁହନ୍ତୁ (Listening)',
      startBtn: 'କୁହିବା ଆରମ୍ଭ କରନ୍ତୁ (Start Speaking)',
      stopBtn: 'ବନ୍ଦ କରନ୍ତୁ (Stop)',
    },
    Hindi: {
      bcp47: 'hi-IN',
      fallback: 'hi-IN',
      name: 'हिन्दी (Hindi Voice)',
      title: 'हिन्दी में बोलें (Speak in Hindi)',
      prompt: 'अपना प्रश्न या गणितीय समस्या बोलें...',
      searching: 'समाधान खोज रहा है...',
      searchBtn: 'समाधान खोजें (Search Solution)',
      listeningBadge: 'सुन रहा है... बोलिए (Listening)',
      startBtn: 'बोलना शुरू करें (Start Speaking)',
      stopBtn: 'रोकें (Stop)',
    },
    English: {
      bcp47: 'en-IN',
      fallback: 'en-US',
      name: 'English (Voice Access)',
      title: 'Speak in English',
      prompt: 'Ask your academic question or math problem...',
      searching: 'Searching solution...',
      searchBtn: 'Search Solution',
      listeningBadge: 'Listening... Speak now',
      startBtn: 'Start Speaking',
      stopBtn: 'Stop Listening',
    },
  };

  const activeLangConfig = langConfigMap[currentLang];

  // Stop any active recognition
  const stopRecognition = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setAutoSearchCountdown(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
    }
  };

  // Start SpeechRecognition session
  const startRecognition = (langToUse = currentLang) => {
    setErrorMessage(null);
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage(
        'Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = langConfigMap[langToUse].bcp47;

      rec.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        const combined = (finalText + ' ' + interimText).trim();
        if (combined) {
          setTranscript(combined);
          // Start auto-search countdown after user pauses speaking
          if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
          setAutoSearchCountdown(3);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('[Speech Recognition Event]', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
          setIsListening(false);
        } else if (event.error === 'language-not-supported') {
          // Fallback to secondary Indic language
          rec.lang = langConfigMap[langToUse].fallback;
          try {
            rec.start();
          } catch {
            setErrorMessage('Language speech model not installed locally. Trying fallback model...');
          }
        } else if (event.error === 'no-speech') {
          // Silence detected, keep waiting
        } else {
          setErrorMessage(`Voice input alert: ${event.error}`);
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setErrorMessage('Could not activate microphone. Please try again.');
      setIsListening(false);
    }
  };

  // Switch voice language
  const handleSelectLanguage = (newLang: 'English' | 'Hindi' | 'Odia') => {
    if (newLang === currentLang) return;
    setCurrentLang(newLang);
    stopRecognition();
    setTimeout(() => {
      startRecognition(newLang);
    }, 250);
  };

  // Auto-search countdown effect
  useEffect(() => {
    if (autoSearchCountdown === null) return;
    if (autoSearchCountdown <= 0) {
      if (transcript.trim()) {
        stopRecognition();
        onSearchSolution(transcript.trim());
      }
      setAutoSearchCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoSearchCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoSearchCountdown, transcript]);

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      setTranscript(initialText);
      startRecognition(language);
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [isOpen, language]);

  // Handle ESC and Enter keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (transcript.trim()) {
          stopRecognition();
          onSearchSolution(transcript.trim());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, transcript]);

  if (!isOpen) return null;

  const modeBadge =
    mode === 'math'
      ? 'Math Solver'
      : mode === 'question'
      ? 'Ask a Question'
      : mode === 'geography'
      ? 'Geography Idea'
      : 'Voice Dictation';

  return (
    <div className="voice-modal-backdrop" onClick={onClose}>
      <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="voice-modal-header">
          <div className="voice-modal-title-group">
            <span className="voice-modal-flag">🎙️</span>
            <div>
              <h3 className="voice-modal-title">{activeLangConfig.title}</h3>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                <span className="voice-modal-lang-badge">{activeLangConfig.name}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>• {modeBadge}</span>
              </div>
            </div>
          </div>
          <button type="button" className="voice-modal-btn-close" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Multilingual Language Switcher Tabs */}
        <div className="voice-modal-lang-tabs">
          {(['English', 'Hindi', 'Odia'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`voice-lang-tab-btn ${currentLang === l ? 'active' : ''}`}
              onClick={() => handleSelectLanguage(l)}
            >
              {l === 'Odia' ? '🇮🇳 ଓଡ଼ିଆ (Odia)' : l === 'Hindi' ? '🇮🇳 हिन्दी (Hindi)' : '🌐 English'}
            </button>
          ))}
        </div>

        {/* Central Pulsing Microphone Visualizer */}
        <div className="voice-visualizer-container">
          <div className={`voice-mic-glow-ring ${isListening ? 'active' : ''}`}>
            <button
              type="button"
              className={`voice-mic-main-btn ${isListening ? 'recording' : ''}`}
              onClick={isListening ? stopRecognition : () => startRecognition(currentLang)}
              title={isListening ? 'Click to pause' : 'Click to speak'}
            >
              {isListening ? <Mic size={38} className="mic-pulse" /> : <MicOff size={38} />}
            </button>
          </div>

          <div className="voice-status-text">
            {isListening ? (
              <span className="voice-listening-pill">
                <span className="recording-dot" />
                {activeLangConfig.listeningBadge}
              </span>
            ) : (
              <span className="voice-idle-pill">{activeLangConfig.startBtn}</span>
            )}
          </div>
        </div>

        {/* Live Spoken Transcript Box with Editable Support */}
        <div className="voice-transcript-box">
          <textarea
            className="voice-transcript-textarea"
            rows={3}
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              if (autoSearchCountdown !== null) setAutoSearchCountdown(null);
            }}
            placeholder={activeLangConfig.prompt}
          />

          {autoSearchCountdown !== null && autoSearchCountdown > 0 && (
            <div className="voice-auto-search-banner">
              <span>
                ⚡ Auto-searching solution in <strong>{autoSearchCountdown}s</strong>...
              </span>
              <button
                type="button"
                className="btn-cancel-auto-search"
                onClick={() => setAutoSearchCountdown(null)}
              >
                Cancel Auto-Search
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="voice-modal-error">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="voice-modal-actions">
          <button
            type="button"
            className="btn-voice-search-solution"
            disabled={!transcript.trim()}
            onClick={() => {
              stopRecognition();
              onSearchSolution(transcript.trim());
            }}
          >
            <Search size={16} />
            <span>{activeLangConfig.searchBtn}</span>
            <Sparkles size={14} style={{ opacity: 0.8 }} />
          </button>

          <button
            type="button"
            className="btn-voice-toggle-listen"
            onClick={isListening ? stopRecognition : () => startRecognition(currentLang)}
          >
            {isListening ? activeLangConfig.stopBtn : activeLangConfig.startBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
export default VoiceAccessModal;
