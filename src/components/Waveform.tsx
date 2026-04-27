interface WaveformProps {
  active: boolean;
}

export const Waveform = ({ active }: WaveformProps) => {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <div className="flex h-12 items-center justify-center gap-1.5">
      {bars.map((i) => (
        <span
          key={i}
          className="wave-bar block w-1.5 rounded-full bg-gradient-gold"
          style={{
            height: active ? `${30 + (i % 4) * 14}px` : "6px",
            animationDelay: active ? `${i * 0.08}s` : "0s",
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
};
