import { useCallback, useEffect, useRef, useState } from "react";

interface UseTamilSpeechOptions {
  onError?: (message: string) => void;
}

/**
 * Tamil speech recognition hook.
 * - Replaces "அடுத்தவரி" with newline.
 * - Inserts newline after ~2s pause.
 * - After every 4 lines, inserts an empty line.
 */
export function useTamilSpeech({ onError }: UseTamilSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const lastFinalAtRef = useRef<number>(0);
  // Track a stable line counter for "every 4 lines insert empty line"
  const lineCounterRef = useRef<number>(0);

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

  const appendFinal = useCallback((chunk: string) => {
    setTranscript((prev) => {
      let cleaned = chunk.trim();
      if (!cleaned) return prev;

      // Replace the keyword "அடுத்தவரி" with a newline marker
      cleaned = cleaned.replace(/\s*அடுத்தவரி\s*/g, "\n");

      let next = prev;
      if (next && !next.endsWith("\n") && !next.endsWith(" ")) {
        next += " ";
      }
      next += cleaned;

      // Normalize: remove triple+ newlines
      next = next.replace(/\n{3,}/g, "\n\n");

      // Apply "every 4 lines, add empty line" rule based on non-empty line count
      const lines = next.split("\n");
      const rebuilt: string[] = [];
      let nonEmptyCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        rebuilt.push(l);
        if (l.trim().length > 0) {
          nonEmptyCount++;
          const isLast = i === lines.length - 1;
          const nextLine = lines[i + 1];
          if (
            nonEmptyCount % 4 === 0 &&
            !isLast &&
            nextLine !== "" &&
            nextLine?.trim().length !== 0
          ) {
            rebuilt.push("");
          }
        }
      }
      lineCounterRef.current = nonEmptyCount;
      return rebuilt.join("\n");
    });
  }, []);

  const schedulePauseLineBreak = useCallback(() => {
    clearPauseTimer();
    pauseTimerRef.current = window.setTimeout(() => {
      setTranscript((prev) => {
        if (!prev) return prev;
        if (prev.endsWith("\n")) return prev;
        return prev + "\n";
      });
    }, 2000);
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      onError?.("உங்கள் உலாவி குரல் அறிதலை ஆதரிக்கவில்லை. Chrome ஐ பயன்படுத்தவும்.");
      return;
    }
    try {
      setInterim("");
      lastFinalAtRef.current = Date.now();

      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        setInterim("");
        clearPauseTimer();
      };
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === "no-speech") return;
        if (e.error === "not-allowed") {
          onError?.("மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.");
        } else if (e.error === "audio-capture") {
          onError?.("மைக்ரோஃபோன் கிடைக்கவில்லை.");
        } else {
          onError?.(`பிழை: ${e.error}`);
        }
      };
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            appendFinal(text);
            lastFinalAtRef.current = Date.now();
            schedulePauseLineBreak();
          } else {
            interimText += text;
          }
        }
        setInterim(interimText);
        if (interimText) schedulePauseLineBreak();
      };
      rec.start();
    } catch (err) {
      console.error(err);
      onError?.("குரல் அறிதலைத் தொடங்க முடியவில்லை.");
    }
  }, [appendFinal, onError, schedulePauseLineBreak]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    clearPauseTimer();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    lineCounterRef.current = 0;
  }, []);

  useEffect(() => () => {
    clearPauseTimer();
    recognitionRef.current?.abort();
  }, []);

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
