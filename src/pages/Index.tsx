import { useEffect, useRef, useState } from "react";
import { Copy, Download, RotateCcw, AlertCircle, Keyboard } from "lucide-react";
import { Header } from "@/components/Header";
import { MicButton } from "@/components/MicButton";
import { Waveform } from "@/components/Waveform";
import { PdfDialog } from "@/components/PdfDialog";
import { TamilKeyboard } from "@/components/TamilKeyboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTamilSpeech } from "@/hooks/useTamilSpeech";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Forward refs so speech callbacks can read the latest transcript/cursor
  // without recreating the hook every keystroke.
  const transcriptRef = useRef("");
  const insertAtCursorRef = useRef<(text: string) => void>(() => {});

  const {
    isListening,
    isSupported,
    interim,
    transcript,
    setTranscript,
    start,
    stop,
    reset,
  } = useTamilSpeech({
    onError: (msg) =>
      toast({ title: "பிழை", description: msg, variant: "destructive" }),
    onFinalText: (chunk) => {
      // Replace the line-break keyword with a real newline.
      // Collapse any whitespace produced by trimming the keyword.
      let out = chunk.replace(/\s*அடுத்தவரி\s*/g, "\n");
      out = out.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
      if (!out) return;

      // Dedup: if the exact phrase already sits immediately before the cursor,
      // skip it (guards against engines re-firing the same final result).
      const current = transcriptRef.current;
      const tail = current.slice(Math.max(0, current.length - out.length));
      if (tail === out) return;

      // Add a single leading space if we're continuing a word (no newline / space).
      const needsSpace =
        current.length > 0 &&
        !current.endsWith("\n") &&
        !current.endsWith(" ") &&
        !out.startsWith("\n");
      insertAtCursorRef.current(needsSpace ? " " + out : out);
    },
    onPause: () => {
      // Single newline per silence window — only if we aren't already on a fresh line.
      const current = transcriptRef.current;
      if (!current || current.endsWith("\n")) return;
      insertAtCursorRef.current("\n");
    },
  });

  // Keep the latest transcript available to the speech callbacks.
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Show a brief processing indicator after stopping
  useEffect(() => {
    if (!isListening && interim) {
      setShowProcessing(true);
      const t = setTimeout(() => setShowProcessing(false), 600);
      return () => clearTimeout(t);
    }
  }, [isListening, interim]);

  const handleMic = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  const handleCopy = async () => {
    if (!transcript.trim()) {
      toast({
        title: "உரை இல்லை",
        description: "நகலெடுக்க உரை இல்லை.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(transcript);
      toast({
        title: "நகலெடுக்கப்பட்டது!",
        description: "உரை கிளிப்போர்டுக்கு நகலெடுக்கப்பட்டது.",
      });
    } catch {
      toast({
        title: "பிழை",
        description: "நகலெடுக்க முடியவில்லை.",
        variant: "destructive",
      });
    }
  };

  // Track cursor position as user moves through the textarea
  const captureCursor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    cursorRef.current = {
      start: ta.selectionStart ?? transcript.length,
      end: ta.selectionEnd ?? transcript.length,
    };
  };

  // Insert text at the current cursor position; restore cursor + focus
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    const { start, end } = cursorRef.current;
    const safeStart = Math.min(start, transcript.length);
    const safeEnd = Math.min(end, transcript.length);
    const next = transcript.slice(0, safeStart) + text + transcript.slice(safeEnd);
    setTranscript(next);
    const newPos = safeStart + text.length;
    cursorRef.current = { start: newPos, end: newPos };
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleBackspace = () => {
    const { start, end } = cursorRef.current;
    const ta = textareaRef.current;
    if (start === end && start > 0) {
      const next = transcript.slice(0, start - 1) + transcript.slice(end);
      setTranscript(next);
      const newPos = start - 1;
      cursorRef.current = { start: newPos, end: newPos };
      requestAnimationFrame(() => {
        if (ta) {
          ta.focus({ preventScroll: true });
          ta.setSelectionRange(newPos, newPos);
        }
      });
    } else if (start !== end) {
      const next = transcript.slice(0, start) + transcript.slice(end);
      setTranscript(next);
      cursorRef.current = { start, end: start };
      requestAnimationFrame(() => {
        if (ta) {
          ta.focus({ preventScroll: true });
          ta.setSelectionRange(start, start);
        }
      });
    }
  };

  const openKeyboard = () => {
    captureCursor();
    // If textarea hasn't been focused yet, default to end of text
    if (cursorRef.current.start === 0 && cursorRef.current.end === 0 && transcript.length > 0) {
      cursorRef.current = { start: transcript.length, end: transcript.length };
    }
    setKeyboardOpen(true);
  };

  return (
    <div className="relative min-h-screen pb-24">
      <Header />

      <main className="container mt-6 max-w-4xl space-y-6 sm:mt-8 sm:space-y-8">
        {/* Mic + status card */}
        <section className="palm-card float-in overflow-hidden p-5 sm:p-10">
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            <div className="text-center">
              <h2 className="font-tamil text-2xl font-bold text-palm-dark sm:text-3xl">
                {isListening ? "கேட்கிறேன்..." : "உங்கள் குரலைப் பதிவு செய்யுங்கள்"}
              </h2>
              <p className="mt-2 font-tamil text-sm text-muted-foreground sm:text-base">
                {isListening
                  ? 'தமிழில் பேசுங்கள் • புதிய வரிக்கு "அடுத்தவரி" எனச் சொல்லுங்கள்'
                  : "மைக்கை அழுத்தி தமிழில் பேசத் தொடங்குங்கள்"}
              </p>
            </div>

            {!isSupported && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-tamil">
                    குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. தயவுசெய்து தமிழ் விசைப்பலகையைப் பயன்படுத்தவும்.
                  </span>
                </div>
                <span className="text-xs opacity-80">
                  Voice input not supported. Please use Tamil keyboard.
                </span>
              </div>
            )}

            <MicButton
              isListening={isListening}
              onClick={handleMic}
              disabled={!isSupported}
            />

            <Waveform active={isListening} />

            {showProcessing && (
              <p className="font-tamil text-sm text-accent animate-pulse">
                செயலாக்குகிறது...
              </p>
            )}
          </div>

          {/* Decorative ornament corners */}
          <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-palm-gold/60" />
          <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-palm-gold/60" />
          <div className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-palm-gold/60" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-palm-gold/60" />
        </section>

        {/* Transcript editor */}
        <section className="palm-card float-in p-4 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-tamil text-xl font-bold text-palm-dark sm:text-2xl">
                ஓலைச்சுவடி
              </h3>
              <p className="font-tamil text-xs text-muted-foreground sm:text-sm">
                உரையைத் திருத்தலாம் • Editable Tamil text
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  toast({ title: "அழிக்கப்பட்டது" });
                }}
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/15"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> அழி
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/15"
              >
                <Copy className="mr-1.5 h-4 w-4" /> நகலெடு
              </Button>
              <Button
                size="sm"
                onClick={() => setPdfOpen(true)}
                className="bg-gradient-gold font-tamil text-primary-foreground hover:opacity-90"
              >
                <Download className="mr-1.5 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          {/* Tamil keyboard trigger */}
          <div className="mb-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={openKeyboard}
              className="border-accent/50 bg-accent/10 font-tamil text-accent hover:bg-accent/20"
            >
              <Keyboard className="mr-1.5 h-4 w-4" /> தமிழ் விசைப்பலகை
            </Button>
          </div>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={transcript + (interim ? (transcript && !transcript.endsWith("\n") ? " " : "") + interim : "")}
              onChange={(e) => setTranscript(e.target.value)}
              onSelect={captureCursor}
              onKeyUp={captureCursor}
              onClick={captureCursor}
              onBlur={captureCursor}
              placeholder="உங்கள் உரை இங்கே தோன்றும்..."
              className="min-h-[280px] resize-y scroll-smooth border-palm-gold/40 bg-card/70 font-tamil text-lg leading-relaxed text-ink shadow-inner placeholder:text-muted-foreground/60 focus-visible:ring-palm-gold/50 sm:text-xl sm:leading-loose"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 38px, hsl(var(--palm-gold) / 0.22) 38px, hsl(var(--palm-gold) / 0.22) 39px)",
              }}
            />
            {interim && (
              <span className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-tamil text-accent">
                live
              </span>
            )}
          </div>

          <p className="mt-3 font-tamil text-xs text-muted-foreground">
            💡 குறிப்பு: "அடுத்தவரி" எனச் சொன்னால் புதிய வரி • 2 விநாடி இடைவெளியில்
            தானாக புதிய வரி • 4 வரிகளுக்குப் பின் தானாக வெற்று வரி
          </p>
        </section>
      </main>

      {/* Sticky mobile mic — quick access while scrolling the transcript */}
      <button
        onClick={handleMic}
        disabled={!isSupported}
        aria-label={isListening ? "பதிவை நிறுத்து" : "மீண்டும் தொடங்கு"}
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-deep)] transition-transform active:scale-95 disabled:opacity-50 sm:hidden ${
          isListening ? "mic-recording" : "mic-button"
        }`}
      >
        {isListening ? (
          <span className="h-4 w-4 rounded-sm bg-current" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
          </svg>
        )}
      </button>

      <PdfDialog open={pdfOpen} onOpenChange={setPdfOpen} transcript={transcript} />

      <TamilKeyboard
        open={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        onInsert={insertAtCursor}
        onBackspace={handleBackspace}
        onEnter={() => insertAtCursor("\n")}
      />
    </div>
  );
};

export default Index;
