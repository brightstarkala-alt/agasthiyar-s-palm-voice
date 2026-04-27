import { useEffect, useState } from "react";
import { Copy, Download, RotateCcw, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { MicButton } from "@/components/MicButton";
import { Waveform } from "@/components/Waveform";
import { PdfDialog } from "@/components/PdfDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTamilSpeech } from "@/hooks/useTamilSpeech";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);

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
  });

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

  return (
    <div className="min-h-screen pb-16">
      <Header />

      <main className="container mt-8 max-w-4xl space-y-8">
        {/* Mic + status card */}
        <section className="palm-card relative float-in overflow-hidden p-6 sm:p-10">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="font-tamil text-2xl font-bold text-palm-dark sm:text-3xl">
                {isListening ? "கேட்கிறேன்..." : "உங்கள் குரலைப் பதிவு செய்யுங்கள்"}
              </h2>
              <p className="mt-2 font-tamil text-sm text-muted-foreground sm:text-base">
                {isListening
                  ? "தமிழில் பேசுங்கள் • புதிய வரிக்கு \"அடுத்தவரி\" எனச் சொல்லுங்கள்"
                  : "மைக்கை அழுத்தி தமிழில் பேசத் தொடங்குங்கள்"}
              </p>
            </div>

            {!isSupported && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-tamil">
                  உங்கள் உலாவி ஆதரிக்கவில்லை. Google Chrome ஐ பயன்படுத்தவும்.
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
        <section className="palm-card relative float-in p-5 sm:p-8">
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
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/10"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> அழி
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-palm-gold/40 font-tamil text-palm-dark hover:bg-palm-gold/10"
              >
                <Copy className="mr-1.5 h-4 w-4" /> நகலெடு
              </Button>
              <Button
                size="sm"
                onClick={() => setPdfOpen(true)}
                className="bg-gradient-gold font-tamil text-primary-foreground hover:opacity-90"
              >
                <Download className="mr-1.5 h-4 w-4" /> PDF பதிவிறக்கு
              </Button>
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={transcript + (interim ? (transcript && !transcript.endsWith("\n") ? " " : "") + interim : "")}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="உங்கள் உரை இங்கே தோன்றும்..."
              className="min-h-[320px] resize-y border-palm-gold/30 bg-background/40 font-tamil text-lg leading-relaxed text-ink shadow-inner placeholder:text-muted-foreground/60 focus-visible:ring-palm-gold/50 sm:text-xl sm:leading-loose"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 38px, hsl(var(--palm-gold) / 0.18) 38px, hsl(var(--palm-gold) / 0.18) 39px)",
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

      <PdfDialog open={pdfOpen} onOpenChange={setPdfOpen} transcript={transcript} />
    </div>
  );
};

export default Index;
