import { useState, useEffect, useRef } from "react";

/**
 * VoiceRecorder — uses Web Speech API to transcribe speech into text.
 * Calls onTranscript(text) whenever speech is captured.
 * Falls back gracefully if browser doesn't support it.
 */
export default function VoiceRecorder({ onTranscript, disabled = false }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInterimText(interim);
      if (final) onTranscript(final);
    };

    recognition.onerror = () => stopListening();
    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const startListening = () => {
    if (!recognitionRef.current || disabled) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (_) {}
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_) {}
    setListening(false);
    setInterimText("");
  };

  const toggle = () => (listening ? stopListening() : startListening());

  if (!supported) {
    return (
      <span className="text-xs font-mono text-muted/50 flex items-center gap-1">
        🎤 Voice not supported in this browser
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={disabled}
        title={listening ? "Stop recording" : "Start voice input"}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
          border transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${
            listening
              ? "border-danger/50 bg-danger/10 text-danger animate-pulse-slow"
              : "border-border-light text-muted hover:border-accent hover:text-accent"
          }
        `}
      >
        {listening ? (
          <>
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Stop Recording
          </>
        ) : (
          <>🎤 Voice Input</>
        )}
      </button>

      {interimText && (
        <span className="text-xs text-muted/60 font-mono italic truncate max-w-[200px]">
          "{interimText}..."
        </span>
      )}
    </div>
  );
}
