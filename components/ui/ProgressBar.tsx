import { cn } from "./cn";

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  /** Texto visible y accesible, p. ej. «de las becas cubiertas». */
  label: string;
  className?: string;
};

/** Barra de avance accesible con el porcentaje en texto (no solo color). */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-base">
        <strong className="font-semibold text-brand-purple">{pct} %</strong> {label}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct} % ${label}`}
        className="h-3 w-full overflow-hidden rounded-full bg-brand-pink-soft ring-1 ring-brand-pink"
      >
        <div className="h-full rounded-full bg-brand-purple" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
