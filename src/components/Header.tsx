import agasthiyar from "@/assets/agasthiyar.png";

export const Header = () => {
  return (
    <header className="relative w-full bg-gradient-header text-primary-foreground shadow-[var(--shadow-deep)]">
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-gold" />
      <div className="container flex flex-col items-center gap-4 py-6 sm:flex-row sm:gap-6 sm:py-8">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-full bg-gradient-gold opacity-80 blur-sm" />
          <img
            src={agasthiyar}
            alt="Sage Agasthiyar"
            width={96}
            height={96}
            className="relative h-20 w-20 rounded-full border-2 border-palm-gold object-cover sm:h-24 sm:w-24"
          />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="font-tamil text-3xl font-bold leading-tight text-palm-gold sm:text-4xl md:text-5xl">
            அகத்தியர் வாக்கு
          </h1>
          <p className="mt-1 font-display text-sm uppercase tracking-[0.3em] text-primary-foreground/70 sm:text-base">
            Agasthiyar Olai Voice
          </p>
          <p className="mt-2 font-tamil text-sm text-primary-foreground/60">
            ஓலைச்சுவடியின் ஞானம் • குரலில் இருந்து எழுத்துக்கு
          </p>
        </div>
      </div>
    </header>
  );
};
