import { useEffect, useState } from "react";

const CELLS = Array.from({ length: 9 }, (_, index) => index);
const ACTIVE_SEQUENCE = [0, 1, 2, 5, 4, 3, 6, 7, 8];
const STEP_INTERVAL_MS = 200;

export function GridPulse({ size = "large", className = "", decorative = false }) {
  const [activeCell, setActiveCell] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion.matches) return undefined;

    const interval = setInterval(() => {
      setActiveCell((current) => ACTIVE_SEQUENCE[(ACTIVE_SEQUENCE.indexOf(current) + 1) % ACTIVE_SEQUENCE.length]);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const activeSequenceIndex = ACTIVE_SEQUENCE.indexOf(activeCell);
  const previousCell = ACTIVE_SEQUENCE[(activeSequenceIndex + ACTIVE_SEQUENCE.length - 1) % ACTIVE_SEQUENCE.length];
  const activeRow = Math.floor(activeCell / 3);
  const activeColumn = activeCell % 3;
  const sizeClass = size === "tiny"
    ? "w-5 gap-[2px]"
    : size === "medium"
      ? "w-[76px] gap-1.5"
      : size === "small"
        ? "w-10 gap-1"
        : "w-[150px] gap-2.5 sm:w-[174px] sm:gap-3";
  const cellRadius = size === "tiny" ? "rounded-[1px]" : size === "small" ? "rounded-sm" : size === "medium" ? "rounded-md" : "rounded-lg";

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "A 3 by 3 grid of lights pulsing one after another"}
      aria-hidden={decorative || undefined}
      data-grid-size={size}
      className={`grid grid-cols-3 ${sizeClass} ${className}`}
    >
      {CELLS.map((cell) => (
        <div
          key={cell}
          aria-hidden="true"
          className={`grid-loader-cell aspect-square ${cellRadius} border ${
            cell === activeCell
              ? "grid-loader-cell-current"
              : cell === previousCell
                ? "grid-loader-cell-previous"
                : Math.abs(Math.floor(cell / 3) - activeRow) <= 1 && Math.abs((cell % 3) - activeColumn) <= 1
                  ? "grid-loader-cell-neighbor"
                  : "border-primary/20 bg-primary/5"
          }`}
        />
      ))}
    </div>
  );
}

function GridLoadingScreen({
  eyebrow = "Creating your presentation",
  title = "Working on your presentation",
  subtitle = "This should only take a moment.",
  progress = 0,
  progressMessage,
  progressLabel = "Loading progress",
  showProgress = true,
}) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <div className={`relative flex h-full min-h-[440px] flex-col items-center justify-center overflow-hidden px-6 text-center sm:px-10 ${showProgress ? "pb-32 pt-12" : "py-12"}`}>
      <GridPulse className="mb-9" />

      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>

      {showProgress && (
        <div className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background/90 px-6 pb-7 pt-5 text-left backdrop-blur-sm sm:px-10">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 text-xs text-muted-foreground">
            <span aria-live="polite">{progressMessage || subtitle}</span>
            <span className="tabular-nums">{safeProgress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
            className="mx-auto mt-2.5 h-1.5 w-full max-w-3xl overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GridLoadingScreen;
