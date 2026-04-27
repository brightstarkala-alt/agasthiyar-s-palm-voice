import { useState } from "react";
import { Delete, CornerDownLeft, X, Space } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TamilKeyboardProps {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

// Tamil character sets
const VOWELS = ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ", "ஃ"];

const CONSONANTS = [
  "க", "ங", "ச", "ஞ", "ட", "ண", "த", "ந", "ப", "ம",
  "ய", "ர", "ல", "வ", "ழ", "ள", "ற", "ன",
  "ஜ", "ஷ", "ஸ", "ஹ", "க்ஷ", "ஶ்ரீ",
];

// Vowel signs (matras) — applied to the last consonant in the textarea
// Order matches VOWELS visually: அ(none), ஆ(ா), இ(ி), ஈ(ீ), உ(ு), ஊ(ூ), எ(ெ), ஏ(ே), ஐ(ை), ஒ(ொ), ஓ(ோ), ஔ(ௌ), ஃ(special)
const VOWEL_SIGNS: { label: string; sign: string }[] = [
  { label: "அ", sign: "" },        // base form
  { label: "ஆ ா", sign: "ா" },
  { label: "இ ி", sign: "ி" },
  { label: "ஈ ீ", sign: "ீ" },
  { label: "உ ு", sign: "ு" },
  { label: "ஊ ூ", sign: "ூ" },
  { label: "எ ெ", sign: "ெ" },
  { label: "ஏ ே", sign: "ே" },
  { label: "ஐ ை", sign: "ை" },
  { label: "ஒ ொ", sign: "ொ" },
  { label: "ஓ ோ", sign: "ோ" },
  { label: "ஔ ௌ", sign: "ௌ" },
  { label: "் (புள்ளி)", sign: "்" },
];

const NUMBERS = ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"];

type Tab = "vowels" | "consonants" | "uyirmei" | "numbers";

export const TamilKeyboard = ({
  open,
  onClose,
  onInsert,
  onBackspace,
  onEnter,
}: TamilKeyboardProps) => {
  const [tab, setTab] = useState<Tab>("consonants");

  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "vowels", label: "உயிர்" },
    { id: "consonants", label: "மெய்" },
    { id: "uyirmei", label: "உயிர்மெய்" },
    { id: "numbers", label: "எண்" },
  ];

  const KeyBtn = ({
    children,
    onTap,
    wide,
    accent,
    aria,
  }: {
    children: React.ReactNode;
    onTap: () => void;
    wide?: boolean;
    accent?: boolean;
    aria?: string;
  }) => (
    <button
      type="button"
      aria-label={aria}
      onMouseDown={(e) => e.preventDefault()} // keep textarea focus
      onClick={onTap}
      className={cn(
        "key-press flex h-12 items-center justify-center rounded-lg border font-tamil text-lg font-semibold shadow-sm sm:h-14 sm:text-xl",
        accent
          ? "border-accent/50 bg-accent/15 text-accent hover:bg-accent/25"
          : "border-palm-gold/40 bg-card text-palm-dark hover:bg-palm-gold/15",
        wide ? "min-w-[3.5rem] px-3" : "min-w-[2.6rem]"
      )}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* panel */}
      <div
        role="dialog"
        aria-label="தமிழ் விசைப்பலகை"
        className="slide-up fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-palm-gold/40 bg-gradient-parchment shadow-[var(--shadow-deep)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-palm-gold/30 bg-card/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-tamil text-base font-bold text-palm-dark sm:text-lg">
              தமிழ் விசைப்பலகை
            </h3>
            <span className="text-xs font-tamil text-muted-foreground">
              Tamil Keyboard
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="மூடு"
            className="h-9 w-9 text-palm-dark hover:bg-palm-gold/15"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-palm-gold/20 bg-card/40 px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "key-press shrink-0 rounded-md px-3 py-1.5 font-tamil text-sm font-semibold",
                tab === t.id
                  ? "bg-accent text-accent-foreground shadow"
                  : "text-palm-dark hover:bg-palm-gold/15"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Keys area */}
        <div className="max-h-[48vh] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          {tab === "vowels" && (
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8 sm:gap-2">
              {VOWELS.map((v) => (
                <KeyBtn key={v} onTap={() => onInsert(v)}>
                  {v}
                </KeyBtn>
              ))}
            </div>
          )}

          {tab === "consonants" && (
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 sm:gap-2">
              {CONSONANTS.map((c) => (
                <KeyBtn key={c} onTap={() => onInsert(c)}>
                  {c}
                </KeyBtn>
              ))}
            </div>
          )}

          {tab === "uyirmei" && (
            <div className="space-y-2">
              <p className="font-tamil text-xs text-muted-foreground">
                முன்னர் ஒரு மெய் எழுத்தைத் தட்டச்சு செய்து, பின்னர் கீழே உள்ள உயிர்க்குறியீட்டைத் தேர்ந்தெடுக்கவும்.
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2">
                {VOWEL_SIGNS.map((vs) => (
                  <KeyBtn
                    key={vs.label}
                    wide
                    onTap={() => (vs.sign ? onInsert(vs.sign) : null)}
                  >
                    {vs.label}
                  </KeyBtn>
                ))}
              </div>
            </div>
          )}

          {tab === "numbers" && (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
              {NUMBERS.map((n) => (
                <KeyBtn key={n} onTap={() => onInsert(n)}>
                  {n}
                </KeyBtn>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action row */}
        <div className="flex items-center gap-2 border-t border-palm-gold/30 bg-card/70 px-3 py-3 sm:px-4">
          <KeyBtn aria="Backspace" onTap={onBackspace}>
            <Delete className="h-5 w-5" />
          </KeyBtn>
          <button
            type="button"
            aria-label="Space"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(" ")}
            className="key-press flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-palm-gold/40 bg-card font-tamil text-sm text-palm-dark hover:bg-palm-gold/15 sm:h-14"
          >
            <Space className="h-4 w-4" /> இடைவெளி
          </button>
          <KeyBtn aria="Enter" onTap={onEnter}>
            <CornerDownLeft className="h-5 w-5" />
          </KeyBtn>
          <KeyBtn aria="Close" accent onTap={onClose}>
            மூடு
          </KeyBtn>
        </div>
      </div>
    </>
  );
};
