import { useEffect, useRef, useState } from 'react';
import './VoiceAgent.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface ChatTurn {
  role: 'user' | 'agent';
  text: string;
  sources?: string[];
  speechText?: string;
  guardStatus?: string;
  audioUrl?: string;
}

interface VoiceAgentProps {
  scanId?: string;
  requestId?: string;
  authToken?: string | null;
  lang?: 'en' | 'hi';
  apiBase?: string;
  imageUploaded?: boolean;
  deviceHint?: string;
  scanData?: any;
}

// ── Quick-chip labels by language & context ───────────────────────────────────

const QUICK_CHIPS_SCAN: Record<string, string[]> = {
  en: ['Why this price?', 'Is it safe?', 'Where can I sell it?', 'Is this offer fair?'],
  hi: ['यह कीमत क्यों?', 'क्या यह सुरक्षित है?', 'इसे कहाँ बेचूँ?', 'क्या यह ऑफर ठीक है?'],
};

const QUICK_CHIPS_UPLOAD: Record<string, string[]> = {
  en: ['What is this device worth?', 'Is it safe?', 'Where can I sell it?', 'How does pickup work?'],
  hi: ['इसकी क्या कीमत मिलेगी?', 'क्या यह सुरक्षित है?', 'इसे कहाँ बेचूँ?', 'पिकअप कैसे होगा?'],
};

const QUICK_CHIPS_MAIN: Record<string, string[]> = {
  en: ['What devices can I sell?', 'How does pickup work?', 'Is swollen battery dangerous?', 'How are eco points earned?'],
  hi: ['मैं क्या बेच सकता हूँ?', 'पिकअप कैसे काम करता है?', 'क्या फूली बैटरी खतरनाक है?', 'इको पॉइंट्स कैसे मिलते हैं?'],
};

const STATE_LABELS: Record<VoiceState, Record<string, string>> = {
  idle:      { en: 'Ask',       hi: 'पूछें' },
  listening: { en: 'Listening', hi: 'सुन रहा हूँ...' },
  thinking:  { en: 'Thinking',  hi: 'सोच रहा हूँ...' },
  speaking:  { en: 'Speaking',  hi: 'बोल रहा हूँ...' },
};

const PLACEHOLDERS: Record<string, string> = {
  en: 'Or type your question…',
  hi: 'या यहाँ टाइप करें…',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceAgent({
  scanId,
  requestId,
  authToken,
  lang = 'en',
  apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  imageUploaded = false,
  deviceHint,
  scanData,
}: VoiceAgentProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastScanIdRef = useRef<string | undefined>(undefined);
  const lastUploadRef = useRef<boolean>(false);

  // Auto-scroll chat to bottom inside chat window only (prevents window scrolling)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (turns.length > 0 && chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [turns]);

  // React to new image upload
  useEffect(() => {
    if (imageUploaded && !lastUploadRef.current && !scanId) {
      lastUploadRef.current = true;
      setIsMinimized(false);
      setTurns((prev) => [
        ...prev,
        {
          role: 'agent',
          text: lang === 'hi'
            ? `📷 फोटो मिल गई (${deviceHint || 'डिवाइस'})! पूरी कीमत और सुरक्षा रिपोर्ट देखने के लिए 'Inspect Device Now' दबाएँ, या मुझसे कोई भी सवाल पूछें।`
            : `📷 Photo detected (${deviceHint || 'device'})! Tap 'Inspect Device Now' to calculate circular value, or ask me any question.`,
        },
      ]);
    } else if (!imageUploaded) {
      lastUploadRef.current = false;
    }
  }, [imageUploaded, scanId, deviceHint, lang]);

  // React to new scan completed
  useEffect(() => {
    if (scanId && scanId !== lastScanIdRef.current) {
      lastScanIdRef.current = scanId;
      setIsMinimized(false);
      setTurns((prev) => [
        ...prev,
        {
          role: 'agent',
          text: lang === 'hi'
            ? `📸 स्कैन सत्यापित हुआ (${deviceHint || 'डिवाइस'})! आप अनुमानित मूल्य, सुरक्षा या कहाँ बेचना है, इसके बारे में पूछ सकते हैं।`
            : `📸 Scan verified (${deviceHint || 'Device'})! I'm ready to answer questions about price, safety, or where to sell it.`,
        },
      ]);
    } else if (!scanId) {
      lastScanIdRef.current = undefined;
    }
  }, [scanId, deviceHint, lang]);

  // ── Ask the agent ──────────────────────────────────────────────────────────

  const askAgent = async (userText: string, audioKey?: string) => {
    if (!userText.trim() && !audioKey) return;

    // Add user bubble immediately
    setTurns((prev) => [...prev, { role: 'user', text: userText || '🎙️ …' }]);
    setVoiceState('thinking');
    setError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const body: Record<string, unknown> = {
      session_id: sessionId,
      scan_id: scanId,
      request_id: requestId,
      lang_hint: lang,
      image_uploaded: Boolean(imageUploaded),
      device_hint: deviceHint,
      scan_data: scanData,
      input: audioKey ? { audio_key: audioKey } : { text: userText },
    };

    try {
      const res = await fetch(`${apiBase}/v1/voice/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Agent error');
      }

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      const agentTurn: ChatTurn = {
        role: 'agent',
        text: data.display_text || data.transcript || 'No response.',
        sources: data.sources || [],
        speechText: data.speech_text,
        guardStatus: data.guard_status,
        audioUrl: data.audio_url,
      };

      setTurns((prev) => [...prev, agentTurn]);

      // Speak the response
      await speakReply(agentTurn);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(msg);
      setTurns((prev) => [
        ...prev,
        { role: 'agent', text: `⚠️ ${msg}` },
      ]);
      setVoiceState('idle');
    }
  };

  // ── Speech Output ──────────────────────────────────────────────────────────

  const speakReply = async (turn: ChatTurn) => {
    setVoiceState('speaking');
    const text = turn.speechText || turn.text;

    // Try Polly audio URL first
    if (turn.audioUrl) {
      try {
        const audio = new Audio(turn.audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => setVoiceState('idle');
        audio.onerror = () => speakBrowser(text);
        await audio.play();
        return;
      } catch {
        // fall through to browser
      }
    }

    speakBrowser(text);
  };

  const speakBrowser = (text: string) => {
    if (!window.speechSynthesis) {
      setVoiceState('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utt.rate = 0.92;
    utt.onend = () => setVoiceState('idle');
    utt.onerror = () => setVoiceState('idle');
    window.speechSynthesis.speak(utt);
  };

  const replayTurn = (turn: ChatTurn) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    window.speechSynthesis?.cancel();
    void speakReply(turn);
  };

  const speechRecognitionRef = useRef<any>(null);
  const recognitionFinalRef = useRef<string>('');

  // ── Speech Capture (Real-time SpeechRecognition + MediaRecorder Fallback) ──

  const startListening = () => {
    setError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SR) {
      try {
        const rec = new SR();
        speechRecognitionRef.current = rec;
        recognitionFinalRef.current = '';
        rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          setVoiceState('listening');
        };

        rec.onresult = (e: any) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < e.results.length; i++) {
            const item = e.results[i];
            if (item.isFinal) {
              final += item[0].transcript;
            } else {
              interim += item[0].transcript;
            }
          }
          if (final) {
            recognitionFinalRef.current = final;
          }
          const liveText = (final || interim).trim();
          if (liveText) {
            setTextInput(liveText);
          }
        };

        rec.onerror = (e: any) => {
          console.warn('[VoiceAgent] SpeechRecognition error:', e.error);
          if (e.error === 'not-allowed') {
            setError(lang === 'hi' ? 'माइक्रोफ़ोन अनुमति नहीं मिली। कृपया टाइप करें।' : 'Microphone permission denied. Please allow mic access or type.');
            setVoiceState('idle');
          } else if (e.error === 'no-speech') {
            setVoiceState('idle');
          } else {
            // Try MediaRecorder fallback on unsupported or network error
            void startMediaRecorder();
          }
        };

        rec.onend = () => {
          const finalPrompt = recognitionFinalRef.current.trim() || textInput.trim();
          if (finalPrompt) {
            setTextInput('');
            void askAgent(finalPrompt);
          } else {
            setVoiceState('idle');
          }
        };

        rec.start();
        return;
      } catch (err) {
        console.warn('[VoiceAgent] SpeechRecognition start failed, trying MediaRecorder:', err);
      }
    }

    // Fallback: MediaRecorder with S3 upload
    void startMediaRecorder();
  };

  const stopListening = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const startMediaRecorder = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(lang === 'hi' ? 'माइक्रोफ़ोन उपलब्ध नहीं है। कृपया टाइप करें।' : 'Microphone not available. Please type your question.');
      setVoiceState('idle');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const effectiveType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: effectiveType });
        void handleAudioBlob(blob, effectiveType);
      };

      recorder.start();
      setVoiceState('listening');
    } catch {
      setError(lang === 'hi' ? 'माइक्रोफ़ोन अनुमति नहीं मिली।' : 'Microphone permission denied.');
      setVoiceState('idle');
    }
  };

  const handleAudioBlob = async (blob: Blob, mimeType: string) => {
    setVoiceState('thinking');
    try {
      const urlRes = await fetch(`${apiBase}/v1/voice/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: mimeType }),
      });
      const { upload_url, audio_key } = await urlRes.json();

      await fetch(upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });

      await askAgent('', audio_key);
    } catch {
      setVoiceState('idle');
      setError(lang === 'hi' ? 'ऑडियो अपलोड विफल। कृपया टेक्स्ट टाइप करें।' : 'Audio upload failed. Please use text input instead.');
    }
  };

  // ── Handle mic button ──────────────────────────────────────────────────────

  const handleMicBtn = () => {
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'speaking') {
      currentAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setVoiceState('idle');
    }
  };

  // ── Handle text submit ────────────────────────────────────────────────────

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    void askAgent(textInput);
    setTextInput('');
  };

  // ── Handle chip click ─────────────────────────────────────────────────────

  const handleChipClick = (chip: string) => {
    if (chip.includes('fair') || chip.includes('ऑफर')) {
      setShowOfferInput((prev) => !prev);
      return;
    }
    void askAgent(chip);
  };

  const handleOfferSubmit = () => {
    if (!offerAmount.trim()) return;
    const q = lang === 'hi'
      ? `उसने ₹${offerAmount} का ऑफर दिया है, क्या यह ठीक है?`
      : `He is offering ₹${offerAmount}. Is that a fair price?`;
    void askAgent(q);
    setShowOfferInput(false);
    setOfferAmount('');
  };

  // ── Mic icon ──────────────────────────────────────────────────────────────

  const MicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );

  const SendIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );

  const SpinnerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );

  const WaveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );

  const StopIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  );

  const chips = scanId
    ? (QUICK_CHIPS_SCAN[lang] || QUICK_CHIPS_SCAN.en)
    : imageUploaded
      ? (QUICK_CHIPS_UPLOAD[lang] || QUICK_CHIPS_UPLOAD.en)
      : (QUICK_CHIPS_MAIN[lang] || QUICK_CHIPS_MAIN.en);

  return (
    <div className="voice-agent-container" role="region" aria-label="Voice Assistant">
      {/* Header */}
      <div className="voice-agent-header">
        <span style={{ fontSize: '1.1rem' }}>🎙️</span>
        <span className="voice-agent-title">
          {scanId
            ? (lang === 'hi' ? 'डिवाइस वॉइस एजेंट' : 'Device Voice Assistant')
            : imageUploaded
              ? (lang === 'hi' ? 'फोटो पहचानी गई' : 'Assistant (Photo Detected)')
              : (lang === 'hi' ? 'स्क्रैपमित्र वॉइस एजेंट' : 'Ask the Voice Agent')}
        </span>
        <span className={`voice-state-label ${voiceState}`}>
          {STATE_LABELS[voiceState][lang] || STATE_LABELS[voiceState].en}
        </span>
        <button
          type="button"
          className="voice-toggle-btn"
          onClick={() => setIsMinimized((prev) => !prev)}
          title={isMinimized ? 'Expand' : 'Collapse'}
        >
          {isMinimized ? (lang === 'hi' ? '▲ खोलें' : '▲ Expand') : (lang === 'hi' ? '▼ छोटा करें' : '▼ Minimize')}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Window */}
          <div ref={chatWindowRef} className="voice-chat-window" role="log" aria-live="polite">
            {turns.length === 0 && (
              <div className="voice-empty-hint">
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                <span>
                  {scanId
                    ? (lang === 'hi' ? 'इस स्कैन के मूल्य, सुरक्षा या खरीदार ऑफर के बारे में पूछें।' : 'Ask about price breakdown, safety, or where to sell.')
                    : imageUploaded
                      ? (lang === 'hi' ? 'फोटो मिल गई! जाँच करने से पहले कुछ भी पूछें।' : 'Photo detected! Ask about this item or tap Inspect.')
                      : (lang === 'hi' ? 'ई-कचरा, मूल्य, सुरक्षा या पिकअप के बारे में बोलकर पूछें।' : 'Ask by voice or text about e-waste price, safety, or pickup.')}
                </span>
              </div>
            )}

        {turns.map((turn, idx) => (
          <div key={idx} className={`voice-bubble ${turn.role}`}>
            {turn.text}

            {turn.role === 'agent' && (
              <>
                {/* Source chip */}
                {turn.sources && turn.sources.length > 0 && (
                  <div className="source-chip">
                    📊 {turn.sources[0]}
                  </div>
                )}

                {/* Replay button */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="replay-btn"
                    onClick={() => replayTurn(turn)}
                    aria-label="Replay this response"
                  >
                    🔊 {lang === 'hi' ? 'फिर सुनें' : 'Replay'}
                  </button>

                  {/* Guard status badge */}
                  {turn.guardStatus && turn.guardStatus !== 'ok' && (
                    <span className={`voice-guard-badge ${turn.guardStatus.startsWith('safety') ? 'safety' : 'warn'}`}>
                      {turn.guardStatus.startsWith('safety') ? '🛡️ Safety' : '⚠️ Verified'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="voice-bubble agent" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Quick Chips */}
      <div className="voice-quick-chips" role="group" aria-label="Quick questions">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="voice-chip"
            onClick={() => handleChipClick(chip)}
            disabled={voiceState === 'thinking'}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Offer input (shown when "Is this offer fair?" chip is clicked) */}
      {showOfferInput && (
        <div className="voice-offer-row">
          <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>₹</span>
          <input
            id="voice-offer-amount"
            type="number"
            className="voice-offer-input"
            placeholder={lang === 'hi' ? 'राशि दर्ज करें' : 'Enter amount'}
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleOfferSubmit()}
            aria-label="Offered price in rupees"
          />
          <button type="button" className="voice-offer-btn" onClick={handleOfferSubmit}>
            {lang === 'hi' ? 'जाँचें' : 'Check'}
          </button>
        </div>
      )}
        </>
      )}

      {/* Input Row */}
      <div className="voice-input-row">
        {/* Text fallback */}
        <input
          id="voice-text-input"
          type="text"
          className="voice-text-input"
          placeholder={PLACEHOLDERS[lang] || PLACEHOLDERS.en}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          disabled={voiceState === 'thinking'}
          aria-label="Type your question"
        />

        {/* Send button */}
        <button
          type="button"
          id="voice-send-btn"
          className="voice-send-btn"
          onClick={handleTextSubmit}
          disabled={!textInput.trim() || voiceState === 'thinking'}
          aria-label="Send message"
        >
          <SendIcon />
        </button>

        {/* Mic button */}
        <button
          type="button"
          id="voice-mic-btn"
          className={`voice-mic-btn ${voiceState}`}
          onClick={handleMicBtn}
          aria-label={voiceState === 'listening' ? 'Stop recording' : voiceState === 'speaking' ? 'Stop speaking' : 'Start recording'}
          disabled={voiceState === 'thinking'}
        >
          {voiceState === 'thinking' && <SpinnerIcon />}
          {voiceState === 'speaking' && <WaveIcon />}
          {voiceState === 'listening' && <StopIcon />}
          {voiceState === 'idle' && <MicIcon />}
        </button>
      </div>
    </div>
  );
}
