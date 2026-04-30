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
  const silenceStopTimerRef = useRef<number | null>(null);
  const pauseFiredRef = useRef<boolean>(true);
  const listeningRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  const manualStopRef = useRef<boolean>(true);
  const processedResultsRef = useRef<Map<string, number>>(new Map());
  const lastFinalRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });

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
    rec.interimResults = false;
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

  const clearSilenceStopTimer = () => {
    if (silenceStopTimerRef.current) {
      window.clearTimeout(silenceStopTimerRef.current);
      silenceStopTimerRef.current = null;
    }
  };

  const stopInternal = () => {
    manualStopRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
    }
  };

  const scheduleSilenceStop = useCallback(() => {
    clearSilenceStopTimer();
    silenceStopTimerRef.current = window.setTimeout(() => {
      // 5s of silence — stop recording, do NOT auto-restart.
      stopInternal();
    }, 5000);
  }, []);

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
    // Guard: never start a second instance while one is already active/starting.
    if (listeningRef.current || startingRef.current) return;
    try {
      clearPauseTimer();
      clearSilenceStopTimer();
      setInterim("");
      processedResultsRef.current.clear();
      lastFinalRef.current = { text: "", time: 0 };
      manualStopRef.current = false;
      startingRef.current = true;

      rec.onstart = () => {
        startingRef.current = false;
        listeningRef.current = true;
        setIsListening(true);
        scheduleSilenceStop();
      };
      rec.onend = () => {
        startingRef.current = false;
        listeningRef.current = false;
        setIsListening(false);
        setInterim("");
        clearSilenceStopTimer();
        // Do NOT auto-restart — only the user toggling the mic restarts.
      };
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === "no-speech") return;
        if (e.error === "not-allowed") {
          manualStopRef.current = true;
          onErrorRef.current?.("மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.");
        } else if (e.error === "audio-capture") {
          manualStopRef.current = true;
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
            const cleaned = text.replace(/\s+/g, " ").trim();
            if (!cleaned) continue;

            const now = Date.now();
            const key = `${i}:${cleaned}`;
            processedResultsRef.current.forEach((time, storedKey) => {
              if (now - time > 5000) processedResultsRef.current.delete(storedKey);
            });
            const repeatedResult = processedResultsRef.current.has(key);
            const rapidDuplicate =
              lastFinalRef.current.text === cleaned && now - lastFinalRef.current.time < 1500;
            if (!repeatedResult && !rapidDuplicate) {
              processedResultsRef.current.set(key, now);
              lastFinalRef.current = { text: cleaned, time: now };
              onFinalRef.current?.(cleaned);
            }
          } else {
            interimText += text;
          }
        }
        setInterim(interimText);
        // Any activity restarts the pause + silence-stop windows.
        schedulePause();
        scheduleSilenceStop();
      };
      rec.start();
    } catch (err) {
      startingRef.current = false;
      listeningRef.current = false;
      manualStopRef.current = true;
      console.error(err);
      onErrorRef.current?.("குரல் அறிதலைத் தொடங்க முடியவில்லை.");
    }
  }, [schedulePause]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    clearRestartTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }
    clearPauseTimer();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    processedResultsRef.current.clear();
    lastFinalRef.current = { text: "", time: 0 };
  }, []);

  useEffect(
    () => () => {
      clearPauseTimer();
      clearRestartTimer();
      manualStopRef.current = true;
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
