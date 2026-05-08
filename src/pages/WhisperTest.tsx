import { useRef, useState } from "react";

const WhisperTest = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log("Uploading chunk");

          const formData = new FormData();
          formData.append("file", event.data, "chunk.webm");

          try {
            const response = await fetch(
              "https://voiceapi.brightstar-es.com/transcribe",
              {
                method: "POST",
                body: formData,
              }
            );

            const data = await response.json();

            console.log("Whisper response:", data);

            if (data.text) {
              const el = document.getElementById("transcript") as HTMLTextAreaElement | null;
              if (el) el.value += " " + data.text;
            }
          } catch (err) {
            console.error(err);
          }
        }
      };

      mediaRecorder.start(3000);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch (err) {
      console.error(err);
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <h1 className="mb-4 text-2xl font-bold">Whisper API Test</h1>
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleStart}
          disabled={isRecording}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Start Recording
        </button>
        <button
          onClick={handleStop}
          disabled={!isRecording}
          className="rounded bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
        >
          Stop
        </button>
      </div>
      <textarea
        id="transcript"
        className="h-96 w-full rounded border border-input bg-background p-3 text-sm"
        placeholder="Transcript will appear here..."
      />
    </main>
  );
};

export default WhisperTest;
