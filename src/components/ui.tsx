"use client";

/*
 * espenxa design-system primitives. Soft, large radii; filled surfaces instead
 * of outlines; white for the active state; ember for the one action that
 * matters on a screen.
 */
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Alert02Icon, Cancel01Icon, InformationCircleIcon, StarIcon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ApiError, type Rank } from "@/lib/api/types";
import { rankLabel } from "@/lib/labels";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Icon({ icon, size = 18, className, stroke = 1.8 }: { icon: IconSvgElement; size?: number; className?: string; stroke?: number }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={stroke} className={className} aria-hidden />;
}

/* ---- buttons -------------------------------------------------------------- */

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-cream text-ink hover:bg-cream/85 font-medium",
  accent: "bg-ember text-ink hover:bg-ember-hi font-medium",
  secondary: "bg-transparent text-cream shadow-[inset_0_0_0_1px_var(--color-cream)] hover:bg-cream hover:text-ink font-medium",
  ghost: "text-cream hover:bg-char font-medium",
  danger: "bg-transparent text-bad shadow-[inset_0_0_0_1px_var(--color-bad)] hover:bg-bad/8 font-medium",
  quiet: "text-mute hover:text-cream font-medium",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[12px] gap-1.5",
  md: "h-11 px-6 text-[13px] gap-2",
  lg: "h-12 px-7 text-[13.5px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-full uppercase tracking-[0.02em] whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/** Round icon button. `tone` picks the fill. */
export function IconButton({
  icon,
  label,
  className,
  size = 18,
  tone = "plain",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconSvgElement; label: string; size?: number; tone?: "plain" | "filled" | "glass" | "white" | "accent" }) {
  const tones = {
    plain: "text-mute hover:bg-char hover:text-cream",
    filled: "bg-char text-cream hover:bg-smoke",
    glass: "glass-dark text-cream hover:bg-black/60",
    white: "bg-cream text-ink hover:bg-cream/85",
    accent: "bg-ember text-ink hover:bg-ember-hi",
  };
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx("grid size-11 shrink-0 place-items-center rounded-full transition-all active:scale-95 disabled:opacity-40", tones[tone], className)}>
      <Icon icon={icon} size={size} stroke={2} />
    </button>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent opacity-80", className)} aria-hidden />;
}

/* ---- forms ---------------------------------------------------------------- */

export function Field({ label, hint, error, children, id, optional }: { label: string; hint?: ReactNode; error?: string; children: (id: string, describedBy?: string) => ReactNode; id?: string; optional?: boolean }) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={fid} className="flex items-baseline justify-between px-1 text-[13px] font-medium text-cream/90">
        {label}
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </label>
      {children(fid, describedBy)}
      {error ? (
        <p id={`${fid}-err`} className="px-1 text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="px-1 text-xs text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-2xl bg-char px-4 text-[15px] text-cream placeholder:text-faint transition-shadow focus:outline-none focus:ring-2 focus:ring-cream/25 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-bad/60 disabled:opacity-50";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(control, "h-13", className)} />;
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(control, "min-h-28 py-3.5 leading-relaxed", className)} />;
}
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cx(control, "h-13 appearance-none bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-11", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1a8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
    >
      {children}
    </select>
  );
}

/** Toggle chip for multi-select lists (interests, intentions, filters). */
export function Chip({ on, onClick, children, disabled, icon }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; icon?: IconSvgElement }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:opacity-35",
        on ? "bg-cream text-ink" : "bg-char text-cream/80 hover:bg-smoke hover:text-cream",
      )}
    >
      {icon && <Icon icon={icon} size={15} stroke={2} />}
      {children}
    </button>
  );
}

/** Static tag, e.g. an interest on a profile. */
export function Tag({ children, icon, className }: { children: ReactNode; icon?: IconSvgElement; className?: string }) {
  return (
    <span className={cx("inline-flex h-9 items-center gap-2 rounded-full bg-char px-3.5 text-[13px] text-cream/85", className)}>
      {icon && <Icon icon={icon} size={14} className="text-cream/60" />}
      {children}
    </span>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40", on ? "bg-ember" : "bg-smoke")}
    >
      <span className={cx("absolute top-1 left-0 size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

/* ---- display -------------------------------------------------------------- */

type Tone = "ok" | "warn" | "bad" | "mute" | "info" | "ember";
const TONES: Record<Tone, string> = {
  ok: "bg-ok/14 text-ok",
  warn: "bg-warn/14 text-warn",
  bad: "bg-bad/14 text-bad",
  info: "bg-info/14 text-info",
  mute: "bg-char text-mute",
  ember: "bg-ember/16 text-ember-hi",
};

export function Badge({ tone = "mute", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>{children}</span>;
}

/** "Active now" style status pill, for use over photos. */
export function LivePill({ children = "Active now", className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cx("glass-dark inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium", className)}>
      <span className="size-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)]" />
      {children}
    </span>
  );
}

const RANK_STYLE: Record<Rank, string> = {
  bronze: "text-bronze bg-bronze/14",
  silver: "text-silver bg-silver/14",
  gold: "text-gold bg-gold/14",
  platinum: "text-platinum bg-platinum/14",
  diamond: "text-diamond bg-diamond/16",
};

export function RankBadge({ rank, size = "md", className }: { rank: Rank; size?: "sm" | "md"; className?: string }) {
  const s = size === "sm" ? "h-6 px-2.5 text-[11px] gap-1" : "h-7 px-3 text-xs gap-1.5";
  return (
    <span className={cx("inline-flex items-center rounded-full font-semibold", RANK_STYLE[rank], s, className)} title={`${rankLabel(rank)} provider`}>
      <RankMark rank={rank} className={size === "sm" ? "size-3" : "size-3.5"} />
      {rankLabel(rank)}
    </span>
  );
}

export function RankMark({ rank, className = "size-3" }: { rank: Rank; className?: string }) {
  const facets = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 }[rank];
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M6 0.8 11 4.4 6 11.2 1 4.4Z" fill="currentColor" opacity={0.25 + facets * 0.15} />
      <path d="M6 0.8 11 4.4 6 11.2 1 4.4Z M1 4.4h10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** Scalloped verification seal. */
export function Verified({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cx("shrink-0", className)} role="img" aria-label="Verified">
      <title>Identity and age verified</title>
      <path
        fill="#3aa4ff"
        d="M12 1.5l2.2 1.6 2.7-.3 1.1 2.5 2.5 1.1-.3 2.7L21.8 12l-1.6 2.2.3 2.7-2.5 1.1-1.1 2.5-2.7-.3L12 21.8l-2.2-1.6-2.7.3-1.1-2.5-2.5-1.1.3-2.7L2.2 12l1.6-2.2-.3-2.7 2.5-1.1 1.1-2.5 2.7.3z"
      />
      <path d="M8 12.2l2.6 2.6L16.2 9.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 text-[13px]", className)}>
      <Icon icon={StarIcon} size={14} className="text-gold" stroke={2.2} />
      <span className="font-semibold tabular">{value ? value.toFixed(1) : "New"}</span>
      {count !== undefined && count > 0 && <span className="text-mute">({count})</span>}
    </span>
  );
}

export function Avatar({ src, name, size = 40, ring, className }: { src?: string; name: string; size?: number; ring?: boolean; className?: string }) {
  const img = src ? (
    // eslint-disable-next-line @next/next/no-img-element -- user photos may be data URLs from the mock adapter
    <img src={src} alt="" width={size} height={size} className={cx("shrink-0 rounded-full object-cover", ring && "ring-[3px] ring-ink", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cx("grid shrink-0 place-items-center rounded-full bg-smoke font-semibold text-mute", className)} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
  if (!ring) return img;
  return <span className="story-ring inline-flex shrink-0 rounded-full p-[2.5px]">{img}</span>;
}

/** A user photo. Plain img: sources can be local files or data URLs from uploads. */
export function Photo({ src, alt, className, focus }: { src: string; alt: string; className?: string; focus?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- see above
  return <img src={src} alt={alt} className={cx("object-cover", className)} style={focus ? { objectPosition: focus } : undefined} draggable={false} />;
}

export function Panel({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={cx("surface rounded-[10px]", className)}>{children}</As>;
}

export function PanelHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHead({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-4 flex items-center justify-between gap-4", className)}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="display text-[32px] md:text-[40px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Segmented control: white pill marks the active item. */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; icon?: IconSvgElement; count?: number }[]; className?: string }) {
  const group = useId();
  return (
    <div role="tablist" className={cx("no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-char p-1", className)}>
      {items.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cx("relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-300 sm:px-5 sm:text-sm", on ? "text-ink" : "text-mute hover:text-cream")}
          >
            {on && <motion.span layoutId={`tab-${group}`} className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-1.5 sm:gap-2">
              {t.icon && (
                <span className={cx(!on && "max-[400px]:hidden")}>
                  <Icon icon={t.icon} size={16} stroke={2} />
                </span>
              )}
              {t.label}
              {!!t.count && <span className={cx("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular", on ? "bg-ember text-ink" : "bg-smoke text-cream")}>{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-[10px] bg-char", className)} aria-hidden />;
}

export function EmptyState({ icon, title, body, action }: { icon: IconSvgElement; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-char text-cream/70">
        <Icon icon={icon} size={26} />
      </span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-mute">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}
export const fieldErrors = (err: unknown): Record<string, string> => (err instanceof ApiError && err.fields) || {};

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-bad/12 text-bad">
        <Icon icon={Alert02Icon} size={26} />
      </span>
      <h3 className="mt-5 text-lg font-semibold">Could not load this</h3>
      <p className="mt-1.5 max-w-sm text-sm text-mute">{errorMessage(error)}</p>
      {retry && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "bad" | "ok"; title?: string; children: ReactNode; className?: string }) {
  const t = { info: "bg-info/10 text-info", warn: "bg-warn/10 text-warn", bad: "bg-bad/10 text-bad", ok: "bg-ok/10 text-ok" }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cx("flex gap-3 rounded-2xl p-4", t, className)}>
      <Icon icon={tone === "info" ? InformationCircleIcon : Alert02Icon} size={18} className="mt-px shrink-0" />
      <div className="text-[13.5px] leading-relaxed text-cream/90">
        {title && <p className="mb-0.5 font-semibold text-cream">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/** Marks screens running on simulated data. Never remove while IS_MOCK is true. */
export function DevNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-2xl bg-warn/8 px-4 py-3 text-xs leading-relaxed">
      <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-semibold text-warn">DEV</span>
      <span className="text-cream/75">{children}</span>
    </p>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("surface rounded-[10px] p-5", className)}>
      <p className="text-[13px] text-mute">{label}</p>
      <p className="display mt-3 text-3xl tabular">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

/* ---- overlays --------------------------------------------------------------- */

/** Modal dialog on desktop, bottom sheet on phones. Uses the native <dialog>. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-0 mt-auto w-full max-w-none rounded-t-[16px] bg-coal p-0 text-cream backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:m-auto sm:rounded-[10px]",
        wide ? "sm:max-w-2xl" : "sm:max-w-md",
      )}
    >
      {open && (
        <div className="max-h-[88dvh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-coal/95 px-6 pt-5 pb-3 backdrop-blur">
            <h2 className="text-lg font-semibold">{title}</h2>
            <IconButton icon={Cancel01Icon} label="Close" tone="filled" onClick={onClose} className="-mr-1 size-9" size={16} />
          </div>
          <div className="px-6 pt-2 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
