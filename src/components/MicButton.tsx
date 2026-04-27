import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MicButton = ({ isListening, onClick, disabled }: MicButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? "பதிவை நிறுத்து" : "பதிவை தொடங்கு"}
      className={cn(
        "relative flex h-32 w-32 items-center justify-center rounded-full text-primary-foreground",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isListening ? "mic-recording" : "mic-button"
      )}
    >
      {isListening ? (
        <Square className="h-12 w-12 fill-current" strokeWidth={0} />
      ) : (
        <Mic className="h-14 w-14" strokeWidth={2.2} />
      )}
    </button>
  );
};
