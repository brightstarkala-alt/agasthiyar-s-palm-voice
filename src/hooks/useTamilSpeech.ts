import { useCallback, useEffect, useRef, useState } from "react";

interface UseTamilSpeechOptions {
  onError?: (message: string) => void;
  /** Called once for every transcribed chunk returned by the Whisper API. */
  onFinalText?: (chunk: string) => void;
  /** Reserved for parity with the previous hook surface. Not invoked. */
  onPause?: () => void;
}

const WHISPER_ENDPOINT = "https://voiceapi.brightstar-es.com/transcribe";
const CHUNK_MS = 3000;

/**
 * Tamil speech-to-text via custom Whisper API.
 *
 * Captures audio with MediaRecorder in fixed-length chunks and POSTs each
 * chunk to the Whisper endpoint. The transcribed text is forwarded through
 * onFinalText so the UI can append it. No browser SpeechRecognition is used.
 */
export function useTamilSpeech({
  onError,
  onFinalText,
}: UseTamilSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inflightRef = useRef<number>(0);

  const onFinalRef = useRef(onFinalText);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFinalRef.current = onFinalText;
    onErrorRef.current = onError;
  }, [onFinalText, onError]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setIsSupported(false);
    }
  }, []);

  const start = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    if (!navigator.mediaDevices || typeof window.MediaRecorder === "undefined") {
      onErrorRef.current?.(
        "உங்கள் உலாவி ஒலிப் பதிவை ஆதரிக்கவில்லை. Chrome ஐ பயன்படுத்தவும்."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          console.log("Uploading chunk to Whisper");
          const formData = new FormData();
          formData.append("file", event.data, "chunk.webm");
          inflightRef.current += 1;
          setInterim("transcribing...");
          try {
            const response = await fetch(WHISPER_ENDPOINT, {
              method: "POST",
              body: formData,
            });
            const data = (await response.json()) as { text?: string };
            console.log("API response:", data);
            if (data?.text && data.text.trim() !== "") {
              setTranscript((prev) =>
                prev ? prev + "\n" + data.text : (data.text as string)
              );
              console.log("Transcript updated");
            }
          } catch (err) {
            console.error("Whisper upload/parse failed:", err);
            onErrorRef.current?.("ஒலியை அனுப்ப முடியவில்லை.");
          } finally {
            inflightRef.current = Math.max(0, inflightRef.current - 1);
            if (inflightRef.current === 0) setInterim("");
          }
        }
      };

      recorder.onerror = () => {
        onErrorRef.current?.("பதிவில் பிழை ஏற்பட்டது.");
      };

      recorder.onstop = () => {
        setIsListening(false);
        setInterim("");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.start(CHUNK_MS);
      setIsListening(true);
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
  }, []);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {
      /* noop */
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  useEffect(
    () => () => {
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
