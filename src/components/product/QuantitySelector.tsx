import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  compact?: boolean;
}

export function QuantitySelector({ value, onChange, min = 1, max = 99, id, compact = false }: QuantitySelectorProps) {
  const size = compact ? "h-10 w-10" : "h-11 w-11";

  return (
    <div
      className="inline-flex items-center rounded-xl border border-border/70 bg-card shadow-sm"
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        aria-controls={id}
        className={`${size} flex items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Minus className="w-4 h-4" aria-hidden />
      </button>
      <span
        id={id}
        aria-live="polite"
        aria-label={`Quantity: ${value}`}
        className="w-10 text-center text-base font-bold tabular-nums text-foreground"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        aria-controls={id}
        className={`${size} flex items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Plus className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}
