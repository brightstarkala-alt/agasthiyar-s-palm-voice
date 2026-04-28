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
        "relative flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground sm:h-24 sm:w-24",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isListening ? "mic-recording" : "mic-button"
      )}
    >
      {isListening ? (
        <Square className="h-8 w-8 fill-current sm:h-10 sm:w-10" strokeWidth={0} />
      ) : (
        <Mic className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={2.2} />
      )}
    </button>
  );
};
