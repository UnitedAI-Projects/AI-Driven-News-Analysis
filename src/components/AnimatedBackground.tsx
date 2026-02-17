"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-deepBlue/5 via-blueLight to-greenBg/80" />
      {/* Animated waves */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-1/4 top-1/4 h-[500px] w-[150%] animate-wave rounded-full bg-gradient-to-r from-green/20 to-deepBlue/20 blur-3xl" />
        <div className="absolute -right-1/4 bottom-1/4 h-[400px] w-[120%] animate-wave rounded-full bg-gradient-to-l from-deepBlue/20 to-green/20 blur-3xl" style={{ animationDirection: "reverse", animationDuration: "15s" }} />
      </div>
      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-green/30"
            style={{
              left: `${10 + (i * 7) % 80}%`,
              top: `${15 + (i * 11) % 70}%`,
              animation: `particle-float ${14 + (i % 5)}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <div
            key={`b-${i}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-deepBlue/25"
            style={{
              left: `${5 + (i * 13) % 85}%`,
              top: `${20 + (i * 9) % 65}%`,
              animation: `particle-float ${12 + (i % 4)}s ease-in-out infinite reverse`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
