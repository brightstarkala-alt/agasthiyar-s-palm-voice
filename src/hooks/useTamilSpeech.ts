import { useCallback, useEffect, useRef, useState } from "react";

interface UseTamilSpeechOptions {
  onError?: (message: string) => void;
  /** Called once for every FINAL chunk produced by the recognizer. */
  onFinalText?: (chunk: string) => void;
  /** Called when a ~2s silence pause is detected (debounced, fires once per pause). */
  onPause?: () => void;
}

/**
 * Tamil speech recognition hook.
 *
 * Responsibilities (kept minimal & stable):
 *  - Start / stop Web Speech API in ta-IN.
 *  - Emit ONLY final results via onFinalText (interim is exposed read-only for UI hints).
 *  - Debounced onPause callback (single fire per silence window).
 *
 * Text shaping (cursor insertion, line rules, dedup) is handled by the consumer
 * so it can target the actual cursor position in the textarea.
 */
export function useTamilSpeech({
  onError,
  onFinalText,
  onPause,
}: UseTamilSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const pauseFiredRef = useRef<boolean>(true);
  // Track the highest result index we've already committed to avoid duplicates
  // if the recognizer re-delivers the same final result.
  const processedUpToRef = useRef<number>(-1);

  // Stable refs to latest callbacks so we don't rebuild handlers each render.
  const onFinalRef = useRef(onFinalText);
  const onPauseRef = useRef(onPause);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFinalRef.current = onFinalText;
    onPauseRef.current = onPause;
    onErrorRef.current = onError;
  }, [onFinalText, onPause, onError]);

  useEffect(() => {
    const SR =
      (window as unknown as Window).SpeechRecognition ||
      (window as unknown as Window).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "ta-IN";
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
  }, []);

  const clearPauseTimer = () => {
    if (pauseTimerRef.current) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  const schedulePause = useCallback(() => {
    clearPauseTimer();
    pauseFiredRef.current = false;
    pauseTimerRef.current = window.setTimeout(() => {
      if (!pauseFiredRef.current) {
        pauseFiredRef.current = true;
        onPauseRef.current?.();
      }
    }, 2000);
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      onErrorRef.current?.(
        "உங்கள் உலாவி குரல் அறிதலை ஆதரிக்கவில்லை. Chrome ஐ பயன்படுத்தவும்."
      );
      return;
    }
    // Guard: never start a second instance while one is already active.
    if (isListening) return;
    try {
      setInterim("");
      processedUpToRef.current = -1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        setInterim("");
        // Do NOT clear the pause timer here — a natural end IS a pause and
        // should still let the silence callback fire once.
      };
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === "no-speech") return;
        if (e.error === "not-allowed") {
          onErrorRef.current?.("மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.");
        } else if (e.error === "audio-capture") {
          onErrorRef.current?.("மைக்ரோஃபோன் கிடைக்கவில்லை.");
        } else {
          onErrorRef.current?.(`பிழை: ${e.error}`);
        }
      };
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            // Guard against the same final index being emitted twice.
            if (i > processedUpToRef.current) {
              processedUpToRef.current = i;
              const cleaned = text.replace(/\s+/g, " ").trim();
              if (cleaned) onFinalRef.current?.(cleaned);
            }
          } else {
            interimText += text;
          }
        }
        setInterim(interimText);
        // Any activity (interim or final) restarts the pause window.
        schedulePause();
      };
      rec.start();
    } catch (err) {
      console.error(err);
      onErrorRef.current?.("குரல் அறிதலைத் தொடங்க முடியவில்லை.");
    }
  }, [schedulePause]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    clearPauseTimer();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    processedUpToRef.current = -1;
  }, []);

  useEffect(
    () => () => {
      clearPauseTimer();
      recognitionRef.current?.abort();
    },
    []
  );

  return {
    isListening,
    isSupported,
    interim,
    transcript,
    setTranscript,
    start,
    stop,
    reset,
  };
}
