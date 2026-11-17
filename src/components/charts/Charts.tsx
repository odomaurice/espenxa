"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import type { HierarchyNode } from "@/lib/api/types";

export const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)", "var(--color-series-6)"];
export const OTHER = "var(--color-series-other)";
const SURFACE = "var(--color-coal)";
const EASE = [0.22, 1, 0.36, 1] as const;
const fmt = (n: number) => n.toLocaleString("en");
const pctOf = (v: number, t: number) => (t ? `${((v / t) * 100).toFixed(v / t < 0.1 ? 1 : 0)}%` : "0%");

/** Width of a container, kept in sync with layout. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Width and height of a container. The chart inside is absolutely positioned, so it never feeds back into the size. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size.w, size.h] as const;
}

/* ---- shell ------------------------------------------------------------------------ */

export type TableSpec = { head: string[]; rows: (string | number)[][] };

/** Card with title, optional legend, and a chart/table toggle. */
export function ChartCard({ title, sub, legend, table, children, className, badge }: { title: string; sub?: string; legend?: ReactNode; table: TableSpec; children: ReactNode; className?: string; badge?: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cx("surface flex flex-col rounded-card p-5 sm:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            {title} {badge}
          </h2>
          {sub && <p className="mt-0.5 text-[13px] text-mute">{sub}</p>}
        </div>
        <div role="tablist" aria-label={`${title} view`} className="flex rounded-full bg-char p-0.5 text-[12px] font-medium">
          {(["Chart", "Table"] as const).map((v) => {
            const on = (v === "Table") === asTable;
            return (
              <button key={v} role="tab" aria-selected={on} type="button" onClick={() => setAsTable(v === "Table")} className={cx("rounded-full px-3 py-1.5 transition-colors", on ? "bg-cream text-ink" : "text-mute hover:text-cream")}>
                {v}
              </button>
            );
          })}
        </div>
      </header>
      {asTable ? (
        <div className="mt-4 max-h-105 overflow-auto rounded-card bg-char">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-char text-left text-xs text-mute">
              <tr>
                {table.head.map((h, i) => (
                  <th key={h} className={cx("px-4 py-3 font-medium", i > 0 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={cx("px-4 py-2.5", j > 0 && "text-right tabular")}>
                      {typeof c === "number" ? fmt(c) : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="@container/chart mt-4 flex flex-1 flex-col">{children}</div>
          {legend && <div className="mt-4">{legend}</div>}
        </>
      )}
    </section>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string; shape?: "rect" | "line" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-cream/85">
          {i.shape === "line" ? <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} /> : <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
          {i.value && <span className="text-mute tabular">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

function Tip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <motion.div
      className="glass-dark pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-2xl px-3.5 py-2.5 text-[12.5px] shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)]"
      style={{ left, top: y }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

const TipRow = ({ color, label, value }: { color: string; label: string; value: string }) => (
  <p className="flex items-center gap-2 py-0.5">
    <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
    <span className="flex-1 text-cream/70">{label}</span>
    <span className="font-semibold text-cream tabular">{value}</span>
  </p>
);

/* ---- sunburst ------------------------------------------------------------------------- */

type Arc = { node: HierarchyNode; parent: HierarchyNode | null; depth: 1 | 2; a0: number; a1: number; color: string; value: number };

const sum = (n: HierarchyNode): number => (n.children?.length ? n.children.reduce((a, c) => a + sum(c), 0) : (n.value ?? 0));

function arcPath(a0: number, a1: number, r0: number, r1: number) {
  const span = Math.min(a1 - a0, Math.PI * 2 - 0.0001);
  const e = a0 + span;
  const large = span > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, e)} L${p(r0, e)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

/**
 * Two-ring sunburst: groups on the inner ring (categorical slots, fixed
 * order, "Other" in neutral), their parts on the outer ring in tints of the
 * group's hue. Click a group (or its legend row) to zoom in; click the
 * centre to zoom out.
 */
export function Sunburst({ root, unit = "", size = 300 }: { root: HierarchyNode; unit?: string; size?: number }) {
  const [focus, setFocus] = useState<HierarchyNode | null>(null);
  const [hover, setHover] = useState<Arc | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [box, boxWidth] = useWidth<HTMLDivElement>();

  const groups = useMemo(() => root.children ?? [], [root]);
  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    let slot = 0;
    for (const g of groups) m.set(g.id, g.label === "Other" ? OTHER : SERIES[slot++ % SERIES.length]);
    return m;
  }, [groups]);

  const arcs = useMemo(() => {
    const list: Arc[] = [];
    const tint = (base: string, i: number, n: number) => (base === OTHER ? OTHER : `color-mix(in oklab, ${base} ${100 - Math.round((i / Math.max(1, n)) * 45)}%, #141416)`);
    if (focus) {
      const kids = focus.children ?? [];
      const total = sum(focus);
      let a = 0;
      kids.forEach((k, i) => {
        const v = sum(k);
        const span = (v / total) * Math.PI * 2;
        list.push({ node: k, parent: focus, depth: 1, a0: a, a1: a + span, color: tint(colorOf.get(focus.id)!, i, kids.length), value: v });
        a += span;
      });
      return list;
    }
    const total = sum(root);
    let a = 0;
    for (const g of groups) {
      const gv = sum(g);
      const span = (gv / total) * Math.PI * 2;
      const color = colorOf.get(g.id)!;
      list.push({ node: g, parent: null, depth: 1, a0: a, a1: a + span, color, value: gv });
      let b = a;
      (g.children ?? []).forEach((k, i, all) => {
        const v = sum(k);
        const s2 = (v / gv) * span;
        list.push({ node: k, parent: g, depth: 2, a0: b, a1: b + s2, color: tint(color, i + 1, all.length + 1), value: v });
        b += s2;
      });
      a += span;
    }
    return list;
  }, [focus, groups, root, colorOf]);

  const total = focus ? sum(focus) : sum(root);
  const R = size / 2;
  const ring = focus ? { 1: [R * 0.46, R * 0.98] } : { 1: [R * 0.46, R * 0.72], 2: [R * 0.74, R * 0.98] };
  const centre = hover ? { label: hover.node.label, value: hover.value, share: pctOf(hover.value, total) } : { label: focus ? focus.label : root.label, value: total, share: null };

  return (
    // Legend beside the chart only when the card is wide enough to keep names whole.
    <div className="grid items-center gap-6 @[600px]/chart:grid-cols-[auto_minmax(0,1fr)]">
      <div ref={box} className="relative mx-auto" style={{ width: size, maxWidth: "100%" }}>
        <svg viewBox={`${-R} ${-R} ${size} ${size}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`${root.label} breakdown, ${fmt(total)} in total`}>
          <AnimatePresence mode="popLayout">
            <motion.g key={focus?.id ?? "root"} initial={{ opacity: 0, scale: 0.86, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.55, ease: EASE }}>
              {arcs.map((a, i) => {
                const [r0, r1] = ring[a.depth as 1] ?? ring[1];
                const dim = hover && hover !== a && hover.node !== a.parent && a.node !== hover.parent;
                const zoomable = !focus && a.depth === 1 && !!a.node.children?.length;
                return (
                  <motion.path
                    key={a.node.id}
                    d={arcPath(a.a0, a.a1, r0, r1)}
                    fill={a.color}
                    stroke={SURFACE}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    tabIndex={0}
                    role={zoomable ? "button" : undefined}
                    aria-label={`${a.node.label}: ${fmt(a.value)}${unit}, ${pctOf(a.value, total)}`}
                    className={cx("outline-none", zoomable && "cursor-pointer")}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dim ? 0.28 : 1 }}
                    transition={{ duration: 0.4, delay: hover ? 0 : 0.05 + i * 0.018 }}
                    onPointerMove={(e) => {
                      const r = box.current!.getBoundingClientRect();
                      setHover(a);
                      setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
                    }}
                    onPointerLeave={() => {
                      setHover(null);
                      setTip(null);
                    }}
                    onFocus={() => {
                      const mid = (a.a0 + a.a1) / 2;
                      const rr = (r0 + r1) / 2;
                      const scale = box.current!.getBoundingClientRect().width / size;
                      setHover(a);
                      setTip({ x: (R + rr * Math.sin(mid)) * scale, y: (R - rr * Math.cos(mid)) * scale });
                    }}
                    onBlur={() => {
                      setHover(null);
                      setTip(null);
                    }}
                    onClick={() => zoomable && setFocus(a.node)}
                    onKeyDown={(e) => {
                      if (zoomable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setFocus(a.node);
                      }
                    }}
                  />
                );
              })}
            </motion.g>
          </AnimatePresence>
          <circle r={R * 0.43} fill="transparent" className={cx(focus && "cursor-pointer")} onClick={() => setFocus(null)} />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div key={centre.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="max-w-[40%]">
              <p className="truncate text-[12px] text-mute">{centre.label}</p>
              <p className="display text-[28px] leading-tight sm:text-[32px]">
                {fmt(centre.value)}
                <span className="text-base text-mute">{unit}</span>
              </p>
              {centre.share ? <p className="text-[12px] font-medium text-cream/70">{centre.share}</p> : focus ? <p className="text-[11px] text-faint">Tap centre to go back</p> : null}
            </motion.div>
          </AnimatePresence>
        </div>
        {focus && (
          <button type="button" onClick={() => setFocus(null)} className="absolute top-0 left-0 rounded-full bg-char px-3 py-1.5 text-xs font-medium hover:bg-smoke">
            ← All
          </button>
        )}
        {hover && tip && (
          <Tip x={tip.x} y={tip.y} width={boxWidth || size}>
            <p className="font-semibold text-cream">{fmt(hover.value)}{unit}</p>
            <p className="text-cream/70">
              {hover.parent ? `${hover.parent.label} · ` : ""}
              {hover.node.label}
            </p>
            <p className="mt-0.5 text-[11px] text-mute">{pctOf(hover.value, total)} of {focus ? focus.label.toLowerCase() : root.label.toLowerCase()}</p>
          </Tip>
        )}
      </div>

      <ul className="space-y-1" aria-label={`${root.label} legend`}>
        {(focus ? arcs : arcs.filter((a) => a.depth === 1)).map((a) => {
          const zoomable = !focus && !!a.node.children?.length;
          return (
            <li key={a.node.id}>
              <button
                type="button"
                disabled={!zoomable}
                onClick={() => zoomable && setFocus(a.node)}
                onPointerEnter={() => setHover(a)}
                onPointerLeave={() => setHover(null)}
                className={cx("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors disabled:cursor-default", hover === a ? "bg-char" : zoomable && "hover:bg-char/60")}
              >
                <span className="size-3 shrink-0 rounded-sm" style={{ background: a.color }} />
                <span className="min-w-0 flex-1 truncate">{a.node.label}</span>
                <span className="font-semibold tabular">{fmt(a.value)}</span>
                <span className="w-12 text-right text-xs text-mute tabular">{pctOf(a.value, total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function sunburstTable(root: HierarchyNode, unit = ""): TableSpec {
  const total = sum(root);
  const rows: (string | number)[][] = [];
  for (const g of root.children ?? []) {
    rows.push([g.label, sum(g), pctOf(sum(g), total)]);
    for (const k of g.children ?? []) rows.push([`   ${k.label}`, sum(k), pctOf(sum(k), total)]);
  }
  return { head: ["Group", `Count${unit ? ` (${unit.trim()})` : ""}`, "Share"], rows };
}

/* ---- area / line --------------------------------------------------------------------- */

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1y = Math.min(Math.max(p1[1] + (p2[1] - p0[1]) * t, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    const c2y = Math.min(Math.max(p2[1] - (p3[1] - p1[1]) * t, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${c1y} ${p2[0] - (p3[0] - p1[0]) * t},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Single-series area with a crosshair tooltip. */
export function AreaChart({ points, color = "var(--color-ember)", format = fmt, height: minHeight = 220, label }: { points: { x: string; y: number; tick?: string }[]; color?: string; format?: (n: number) => string; height?: number; label: string }) {
  const [box, width, boxH] = useSize<HTMLDivElement>();
  const height = Math.max(minHeight, boxH);
  const [i, setI] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(...points.map((p) => p.y)) * 1.08);
  const X = (k: number) => pad.l + (points.length < 2 ? 0 : (k / (points.length - 1)) * w);
  const Y = (v: number) => pad.t + h - (v / max) * h;
  const pts = points.map((p, k) => [X(k), Y(p.y)] as [number, number]);
  const line = smooth(pts);
  const area = line && `${line} L${X(points.length - 1)},${pad.t + h} L${X(0)},${pad.t + h} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 70))));

  return (
    <div ref={box} className="relative flex-1" style={{ minHeight }}>
      {width > 0 && (
        <svg width={width} height={height} className="absolute inset-0 block touch-pan-y outline-none" role="img" aria-label={label} tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setI((v) => Math.min(points.length - 1, (v ?? -1) + 1));
            if (e.key === "ArrowLeft") setI((v) => Math.max(0, (v ?? points.length) - 1));
          }}
          onBlur={() => setI(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.32" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={Y(t)} y2={Y(t)} stroke="var(--color-grid)" strokeWidth={1} />
              <text x={pad.l - 8} y={Y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular">
                {format(t)}
              </text>
            </g>
          ))}
          {points.map((p, k) =>
            (k % every === 0 && points.length - 1 - k >= every * 0.7) || k === points.length - 1 ? (
              <text key={k} x={X(k)} y={height - 6} textAnchor={k === 0 ? "start" : k === points.length - 1 ? "end" : "middle"} className="fill-faint text-[11px]">
                {p.tick ?? p.x}
              </text>
            ) : null,
          )}
          <motion.path d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.3 }} />
          <motion.path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
          {i !== null && (
            <g>
              <line x1={X(i)} x2={X(i)} y1={pad.t} y2={pad.t + h} stroke="var(--color-mute)" strokeWidth={1} />
              <circle cx={X(i)} cy={Y(points[i].y)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
            </g>
          )}
          <rect
            x={pad.l}
            y={pad.t}
            width={w}
            height={h}
            fill="transparent"
            onPointerMove={(e) => {
              const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
              setI(Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)));
            }}
            onPointerLeave={() => setI(null)}
          />
        </svg>
      )}
      {i !== null && width > 0 && (
        <Tip x={X(i)} y={Y(points[i].y)} width={width}>
          <p className="text-[15px] font-semibold text-cream tabular">{format(points[i].y)}</p>
          <p className="text-cream/65">{points[i].x}</p>
        </Tip>
      )}
    </div>
  );
}

/* ---- stacked columns -------------------------------------------------------------------- */

export function StackedColumns({ data, keys, height: minHeight = 240, label }: { data: { x: string; tick?: string; values: Record<string, number> }[]; keys: { id: string; label: string; color: string }[]; height?: number; label: string }) {
  const [box, width, boxH] = useSize<HTMLDivElement>();
  const height = Math.max(minHeight, boxH);
  const [i, setI] = useState<number | null>(null);
  const pad = { l: 40, r: 6, t: 10, b: 26 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const totals = data.map((d) => keys.reduce((n, k) => n + (d.values[k.id] ?? 0), 0));
  const max = niceMax(Math.max(...totals) * 1.05);
  const band = data.length ? w / data.length : 0;
  const bw = Math.max(3, Math.min(22, band * 0.64));
  const Y = (v: number) => (v / max) * h;
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 64))));

  return (
    <div ref={box} className="relative flex-1" style={{ minHeight }}>
      {width > 0 && (
        <svg width={width} height={height} className="absolute inset-0 block" role="img" aria-label={label}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={pad.l + w} y1={pad.t + h - f * h} y2={pad.t + h - f * h} stroke="var(--color-grid)" />
              <text x={pad.l - 8} y={pad.t + h - f * h} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular">
                {fmt(f * max)}
              </text>
            </g>
          ))}
          {data.map((d, k) => {
            const cx_ = pad.l + band * k + band / 2;
            let acc = 0;
            const segs = keys.map((key, j) => {
              const v = d.values[key.id] ?? 0;
              const y1 = pad.t + h - Y(acc);
              acc += v;
              const y0 = pad.t + h - Y(acc);
              return { key, v, y0, y1, top: j === keys.length - 1 || keys.slice(j + 1).every((kk) => !(d.values[kk.id] ?? 0)) };
            });
            return (
              <motion.g key={d.x} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6, delay: k * 0.015, ease: EASE }} style={{ originY: `${pad.t + h}px`, transformBox: "view-box" }} opacity={i === null || i === k ? 1 : 0.4}>
                {segs.map(({ key, v, y0, y1, top }) =>
                  v > 0 ? (
                    top ? (
                      <path key={key.id} fill={key.color} d={`M${cx_ - bw / 2},${y1 - 1} V${y0 + Math.min(4, (y1 - y0) / 2)} Q${cx_ - bw / 2},${y0} ${cx_ - bw / 2 + Math.min(4, bw / 2)},${y0} H${cx_ + bw / 2 - Math.min(4, bw / 2)} Q${cx_ + bw / 2},${y0} ${cx_ + bw / 2},${y0 + Math.min(4, (y1 - y0) / 2)} V${y1 - 1} Z`} />
                    ) : (
                      <rect key={key.id} x={cx_ - bw / 2} y={y0} width={bw} height={Math.max(0, y1 - y0 - 2)} fill={key.color} />
                    )
                  ) : null,
                )}
              </motion.g>
            );
          })}
          {data.map((d, k) =>
            k % every === 0 ? (
              <text key={k} x={pad.l + band * k + band / 2} y={height - 6} textAnchor="middle" className="fill-faint text-[11px]">
                {d.tick ?? d.x}
              </text>
            ) : null,
          )}
          {data.map((d, k) => (
            <rect key={`hit${k}`} x={pad.l + band * k} y={pad.t} width={band} height={h} fill="transparent" tabIndex={0} aria-label={`${d.x}: ${keys.map((kk) => `${kk.label} ${d.values[kk.id] ?? 0}`).join(", ")}`} onPointerEnter={() => setI(k)} onPointerLeave={() => setI(null)} onFocus={() => setI(k)} onBlur={() => setI(null)} className="outline-none" />
          ))}
        </svg>
      )}
      {i !== null && width > 0 && (
        <Tip x={pad.l + band * i + band / 2} y={pad.t + h - Y(totals[i])} width={width}>
          <p className="mb-1 font-semibold text-cream">{data[i].x}</p>
          {[...keys].reverse().map((k) => (
            <TipRow key={k.id} color={k.color} label={k.label} value={fmt(data[i].values[k.id] ?? 0)} />
          ))}
          <p className="mt-1 border-t border-white/10 pt-1 text-[11px] text-mute">Total {fmt(totals[i])}</p>
        </Tip>
      )}
    </div>
  );
}

/* ---- horizontal bars ------------------------------------------------------------------------- */

/** One bar per row, aligned on one baseline. Values printed at the bar end. */
export function BarList({ items, color = "var(--color-series-1)", format = fmt }: { items: { label: string; value: number; color?: string; note?: string; icon?: ReactNode }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ul className="space-y-3">
      {items.map((it, k) => (
        <li key={it.label} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)} className={cx("transition-opacity", hover !== null && hover !== k && "opacity-50")}>
          <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="flex items-center gap-2 font-medium">
              {it.icon}
              {it.label}
            </span>
            <span className="flex items-baseline gap-2">
              {it.note && <span className="text-xs text-mute">{it.note}</span>}
              <span className="font-semibold tabular">{format(it.value)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-char">
            <motion.div className="h-full rounded-full" style={{ background: it.color ?? color }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(1.5, (it.value / max) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1 + k * 0.07, ease: EASE }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Small sparkline for stat tiles. Decorative: the number beside it carries the value. */
export function Spark({ values, color = "var(--color-ember)" }: { values: number[]; color?: string }) {
  const W = 96;
  const H = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - 3 - ((v - min) / Math.max(1, max - min)) * (H - 6)] as [number, number]);
  return (
    <svg width={W} height={H} aria-hidden className="overflow-visible">
      <motion.path d={smooth(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }} />
    </svg>
  );
}
