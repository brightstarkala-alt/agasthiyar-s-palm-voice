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
      // Detect the line-break keyword in all common variants the
      // recognizer might emit: "அடுத்தவரி", "அடுத்த வரி", "அடுத்தவரீ", etc.
      // Replace each occurrence with a real newline and STRIP the word itself.
      const NEWLINE_RE = /\s*அடுத்த\s*வரி[ிீ]?\s*/g;
      let out = chunk.replace(NEWLINE_RE, "\n");
      // Normalize whitespace but keep newlines intact.
      out = out.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n");
      // Trim only leading/trailing spaces (not newlines so a pure keyword stays as "\n").
      out = out.replace(/^[ \t]+|[ \t]+$/g, "");
      if (!out) return;

      // Dedup: if the exact phrase already sits immediately before the cursor,
      // skip it (guards against engines re-firing the same final result).
      const current = transcriptRef.current;
      const tail = current.slice(Math.max(0, current.length - out.length));
      if (tail === out && out !== "\n") return;

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

  const trimDuplicatePrefix = (text: string, beforeCursor: string) => {
    if (text === "\n") return text;
    const normalizedText = text.trimStart();
    const recentWords = beforeCursor.trim().split(/\s+/).filter(Boolean).slice(-8);
    if (!recentWords.length) return text;

    let bestOverlap = 0;
    for (let count = 1; count <= recentWords.length; count++) {
      const phrase = recentWords.slice(-count).join(" ");
      if (normalizedText === phrase || normalizedText.startsWith(`${phrase} `)) {
        bestOverlap = phrase.length;
      }
    }

    if (bestOverlap === 0) return text;
    return normalizedText.slice(bestOverlap).trimStart();
  };

  const applyFourLineRule = (value: string, cursor: number) => {
    const lines = value.split("\n");
    const rebuilt: string[] = [];
    let nonEmptyCount = 0;
    let originalPos = 0;
    let newCursor = cursor;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const hasText = line.trim().length > 0;
      rebuilt.push(line);
      originalPos += line.length;

      if (hasText) nonEmptyCount += 1;

      if (index < lines.length - 1) {
        rebuilt.push("\n");
        originalPos += 1;
      }

      if (hasText && nonEmptyCount % 4 === 0 && index < lines.length - 1) {
        let skipped = 0;
        while (index + 1 + skipped < lines.length && lines[index + 1 + skipped].trim() === "") {
          skipped += 1;
        }
        if (skipped === 0) {
          rebuilt.push("\n");
          if (originalPos <= cursor) newCursor += 1;
        } else if (skipped > 1) {
          for (let s = 1; s < skipped; s++) {
            originalPos += lines[index + s].length + 1;
            if (originalPos <= cursor) newCursor -= lines[index + s].length + 1;
          }
          index += skipped - 1;
        }
      }
    }

    return {
      value: rebuilt.join(""),
      cursor: Math.max(0, newCursor),
    };
  };

  // Insert text at the current cursor position; restore cursor + focus.
  // Also enforces the "blank line after every 4 non-empty lines" rule
  // by inspecting the surrounding text — never double-inserts.
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    const current = transcriptRef.current;
    const { start, end } = cursorRef.current;
    const safeStart = Math.min(start, current.length);
    const safeEnd = Math.min(end, current.length);

    const before = current.slice(0, safeStart);
    const after = current.slice(safeEnd);
    const insertion = trimDuplicatePrefix(text, before);
    if (!insertion) return;

    const inserted = before + insertion + after;
    const rawPos = safeStart + insertion.length;
    const formatted = applyFourLineRule(inserted, rawPos);
    setTranscript(formatted.value);
    transcriptRef.current = formatted.value;
    const newPos = formatted.cursor;
    cursorRef.current = { start: newPos, end: newPos };
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(newPos, newPos);
      }
    });
  };

  // Expose the latest insertAtCursor to the speech hook callbacks.
  useEffect(() => {
    insertAtCursorRef.current = insertAtCursor;
  });

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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <Header />

      {!isSupported && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:mx-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-tamil">
            குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. தயவுசெய்து தமிழ் விசைப்பலகையைப் பயன்படுத்தவும்.
          </span>
        </div>
      )}

      {/* Middle: editable transcript — flexes to fill, scrolls if long */}
      <main className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 sm:px-6">
        <div className="palm-card float-in flex min-h-0 flex-1 flex-col p-3 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-tamil text-lg font-bold text-palm-dark sm:text-xl">
              ஓலைச்சுவடி
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={openKeyboard}
                className="border-accent/50 bg-accent/10 font-tamil text-accent hover:bg-accent/20"
              >
                <Keyboard className="mr-1 h-4 w-4" /> விசைப்பலகை
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  toast({ title: "அழிக்கப்பட்டது" });
                }}
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/15"
              >
                <RotateCcw className="mr-1 h-4 w-4" /> அழி
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/15"
              >
                <Copy className="mr-1 h-4 w-4" /> நகலெடு
              </Button>
              <Button
                size="sm"
                onClick={() => setPdfOpen(true)}
                className="bg-gradient-gold font-tamil text-primary-foreground hover:opacity-90"
              >
                <Download className="mr-1 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <Textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onSelect={captureCursor}
              onKeyUp={captureCursor}
              onClick={captureCursor}
              onBlur={captureCursor}
              placeholder="உங்கள் உரை இங்கே தோன்றும்..."
              className="h-full w-full resize-none scroll-smooth border-palm-gold/40 bg-card/70 font-tamil text-base leading-relaxed text-ink shadow-inner placeholder:text-muted-foreground/60 focus-visible:ring-palm-gold/50 sm:text-lg sm:leading-loose"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 34px, hsl(var(--palm-gold) / 0.22) 34px, hsl(var(--palm-gold) / 0.22) 35px)",
              }}
            />
            {interim && (
              <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
                <span className="truncate rounded-md bg-card/85 px-2 py-1 font-tamil text-xs text-muted-foreground italic shadow-sm">
                  {interim}
                </span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-tamil text-accent">
                  live
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom: mic + status — always visible, on the same screen */}
      <footer className="shrink-0 border-t border-palm-gold/30 bg-gradient-header/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2">
          <p className="font-tamil text-xs text-palm-dark sm:text-sm">
            {isListening
              ? 'கேட்கிறேன்... • "அடுத்தவரி" = புதிய வரி'
              : "மைக்கை அழுத்தி தமிழில் பேசுங்கள்"}
          </p>
          <div className="flex items-center gap-4">
            <Waveform active={isListening} />
            <MicButton
              isListening={isListening}
              onClick={handleMic}
              disabled={!isSupported}
            />
            <Waveform active={isListening} />
          </div>
          {showProcessing && (
            <p className="font-tamil text-xs text-accent animate-pulse">
              செயலாக்குகிறது...
            </p>
          )}
        </div>
      </footer>

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
