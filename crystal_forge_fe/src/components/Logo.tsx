type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

export function Logo({
  size = 32,
  withWordmark = false,
  tone = "dark",
  className = "",
}: LogoProps) {
  const wordmarkClass =
    tone === "light" ? "text-white" : "text-forge-900";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Crystal Forge logo"
        role="img"
      >
        <defs>
          <linearGradient id="cf-gradient-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a5aa1" />
            <stop offset="100%" stopColor="#1f2750" />
          </linearGradient>
          <linearGradient id="cf-gradient-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffcb4a" />
            <stop offset="100%" stopColor="#f99008" />
          </linearGradient>
        </defs>
        {/* Outer crystal silhouette */}
        <path
          d="M16 2 L29 12 L24 29 L8 29 L3 12 Z"
          fill="url(#cf-gradient-1)"
        />
        {/* Top facet (warm) */}
        <path
          d="M16 2 L29 12 L16 14 Z"
          fill="url(#cf-gradient-2)"
          opacity="0.95"
        />
        {/* Side facet (lighter) */}
        <path d="M16 2 L3 12 L16 14 Z" fill="#6b7cba" opacity="0.7" />
        {/* Inner highlight */}
        <path
          d="M16 14 L24 29 L16 22 Z"
          fill="#ffffff"
          opacity="0.08"
        />
      </svg>
      {withWordmark && (
        <span
          className={`font-display text-base font-semibold tracking-tight ${wordmarkClass}`}
        >
          Crystal Forge
        </span>
      )}
    </span>
  );
}
