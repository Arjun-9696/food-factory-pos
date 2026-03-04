"use client";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-8 h-8", text: "text-sm" },
    md: { icon: "w-10 h-10", text: "text-lg" },
    lg: { icon: "w-14 h-14", text: "text-2xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${icon} rounded-xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30`}>
        <span className="text-white font-bold">FF</span>
      </div>
      <div className="flex flex-col">
        <span className={`font-extrabold text-foreground leading-none ${text}`}>
          Food Factory
        </span>
        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium tracking-wider uppercase">
          The Quality Taste
        </span>
      </div>
    </div>
  );
}

export function LogoIcon({ className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-lg",
    lg: "w-14 h-14 text-2xl",
  };

  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 ${className}`}>
      <span className="text-white font-bold">FF</span>
    </div>
  );
}
