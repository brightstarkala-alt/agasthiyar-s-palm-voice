import { useCallback, useEffect, useRef, useState } from "react";

interface UseTamilSpeechOptions {
  onError?: (message: string) => void;
  /** Called once for every transcribed chunk returned by the Whisper API. */
  onFinalText?: (chunk: string) => void;
  /** Called when a ~2s silence pause is detected (debounced, fires once per pause). */
  onPause?: () => void;
}

const WHISPER_ENDPOINT = "http://135.181.106.14:8000/transcribe";
const CHUNK_MS = 2000;

/**
 * Tamil speech-to-text via custom Whisper API.
 *
 * Captures audio with MediaRecorder in 2-second chunks, POSTs each chunk as
 * multipart/form-data to the Whisper endpoint, and forwards the returned text
 * incrementally through onFinalText. The public surface mirrors the previous
 * Web Speech API hook so the UI does not need to change.
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const pauseTimerRef = useRef<number | null>(null);
  const pauseFiredRef = useRef<boolean>(true);
  const inflightRef = useRef<number>(0);
  const stoppingRef = useRef<boolean>(false);

  const onFinalRef = useRef(onFinalText);
  const onPauseRef = useRef(onPause);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFinalRef.current = onFinalText;
    onPauseRef.current = onPause;
    onErrorRef.current = onError;
  }, [onFinalText, onPause, onError]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setIsSupported(false);
    }
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

  const pickMimeType = (): string => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const t of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported(t)
      ) {
        return t;
      }
    }
    return "";
  };

  const sendChunk = useCallback(async (blob: Blob, attempt = 0): Promise<void> => {
    if (!blob || blob.size < 1024) return; // skip tiny/empty chunks
    inflightRef.current += 1;
    setInterim("transcribing...");
    try {
      const formData = new FormData();
      const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
      formData.append("file", blob, `chunk.${ext}`);

      const response = await fetch(WHISPER_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { text?: string };
      const text = (data?.text ?? "").trim();
      if (text) {
        onFinalRef.current?.(text);
        schedulePause();
      }
    } catch (err) {
      if (attempt < 1) {
        // single retry
        await new Promise((r) => setTimeout(r, 400));
        inflightRef.current -= 1;
        return sendChunk(blob, attempt + 1);
      }
      console.error("Whisper transcribe failed", err);
      onErrorRef.current?.("ஒலியை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      inflightRef.current = Math.max(0, inflightRef.current - 1);
      if (inflightRef.current === 0) setInterim("");
    }
  }, [schedulePause]);

  const start = useCallback(async () => {
    if (mediaRecorderRef.current || stoppingRef.current) return;
    if (!navigator.mediaDevices || typeof window.MediaRecorder === "undefined") {
      onErrorRef.current?.(
        "உங்கள் உலாவி ஒலிப் பதிவை ஆதரிக்கவில்லை. Chrome ஐ பயன்படுத்தவும்."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          void sendChunk(event.data);
        }
      };
      recorder.onerror = () => {
        onErrorRef.current?.("பதிவில் பிழை ஏற்பட்டது.");
      };
      recorder.onstop = () => {
        stoppingRef.current = false;
        setIsListening(false);
        setInterim("");
        clearPauseTimer();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.start(CHUNK_MS);
      setIsListening(true);
      schedulePause();
    } catch (err) {
      console.error(err);
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError") {
        onErrorRef.current?.("மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.");
      } else if (name === "NotFoundError") {
        onErrorRef.current?.("மைக்ரோஃபோன் கிடைக்கவில்லை.");
      } else {
        onErrorRef.current?.("குரல் பதிவைத் தொடங்க முடியவில்லை.");
      }
    }
  }, [schedulePause, sendChunk]);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    stoppingRef.current = true;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {
      /* noop */
    }
    clearPauseTimer();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  useEffect(
    () => () => {
      clearPauseTimer();
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
