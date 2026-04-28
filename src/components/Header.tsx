import agasthiyar from "@/assets/agasthiyar.jpg";

export const Header = () => {
  return (
    <header className="relative w-full bg-gradient-header text-palm-dark shadow-[var(--shadow-leaf)] border-b border-palm-gold/40">
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-gold" />
      <div className="container relative flex flex-col items-center gap-3 py-3 sm:flex-row sm:gap-5 sm:py-5">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-gold opacity-60 blur-sm" />
          <img
            src={agasthiyar}
            alt="Sage Agasthiyar"
            className="relative h-16 w-16 rounded-2xl border-2 border-palm-gold object-cover object-top sm:h-20 sm:w-20"
          />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="font-tamil text-2xl font-bold leading-tight text-palm-dark sm:text-3xl md:text-4xl">
            அகத்தியர் வாக்கு
          </h1>
          <p className="mt-0.5 font-display text-[10px] uppercase tracking-[0.3em] text-accent sm:text-xs">
            Agasthiyar Olai Voice
          </p>
        </div>
      </div>
    </header>
  );
};
