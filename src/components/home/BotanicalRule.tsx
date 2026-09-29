export function BotanicalRule() {
  return (
    <div className="botanical-rule" aria-hidden>
      <svg viewBox="0 0 640 48" preserveAspectRatio="xMidYMid meet">
        <path
          className="brush"
          d="M8 30 C 70 28, 90 14, 140 22 C 190 30, 200 12, 250 18 C 300 24, 320 36, 370 20 C 430 4, 470 30, 520 18 C 560 10, 590 26, 632 16"
          fill="none"
          stroke="var(--leaf-green)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="140" cy="20" r="3.2" fill="var(--petal-white)" stroke="var(--oak)" strokeWidth="0.6" />
        <circle cx="250" cy="16" r="2.6" fill="var(--petal-white)" stroke="var(--oak)" strokeWidth="0.6" />
        <circle cx="370" cy="18" r="3.4" fill="var(--petal-white)" stroke="var(--gold)" strokeWidth="0.6" />
        <circle cx="520" cy="16" r="2.8" fill="var(--petal-white)" stroke="var(--oak)" strokeWidth="0.6" />
      </svg>
    </div>
  );
}
