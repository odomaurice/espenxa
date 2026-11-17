"use client";

/*
 * Motion primitives. One vocabulary for the whole app:
 *   - Reveal / Stagger: content arrives (fade + rise) when it enters view.
 *   - Lift: springy hover/press on interactive cards.
 *   - Tilt: pointer-following 3D tilt with a moving sheen, for photo cards.
 *   - Spotlight: a soft glow that follows the pointer across a surface.
 *   - Burst: a ring of hearts when someone is liked.
 * Nothing loops or moves on its own. MotionConfig in Providers honours the
 * user's reduced-motion setting.
 */
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type HTMLMotionProps, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cx } from "./ui";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 } as const;

export const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, as = "div", ...rest }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" } & Omit<HTMLMotionProps<"div">, "children">) {
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: rise.hidden, show: { ...(rise.show as object), transition: { duration: 0.7, ease: EASE, delay } } }}
      {...rest}
    >
      {children}
    </M>
  );
}

/** Children marked <StaggerItem> arrive one after another. */
export function Stagger({ children, className, gap = 0.06, delay = 0, inView = true }: { children: ReactNode; className?: string; gap?: number; delay?: number; inView?: boolean }) {
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } };
  return inView ? (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} variants={variants}>
      {children}
    </motion.div>
  ) : (
    <motion.div className={className} initial="hidden" animate="show" variants={variants}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: { children: ReactNode; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div className={className} variants={rise} {...rest}>
      {children}
    </motion.div>
  );
}

/** Spring lift on hover, settle on press. */
export function Lift({ children, className, y = -6, scale = 1.015 }: { children: ReactNode; className?: string; y?: number; scale?: number }) {
  return (
    <motion.div className={className} whileHover={{ y, scale }} whileTap={{ scale: 0.98 }} transition={SPRING}>
      {children}
    </motion.div>
  );
}

/** 3D tilt that follows the pointer, with a light sheen sweeping across. */
export function Tilt({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const sx = useTransform(px, [0, 1], [0, 100]);
  const sy = useTransform(py, [0, 1], [0, 100]);
  const sheen = useMotionTemplate`radial-gradient(60% 50% at ${sx}% ${sy}%, rgb(255 255 255 / 0.16), transparent 60%)`;
  const hover = useMotionValue(0);
  const sheenOpacity = useSpring(hover, { stiffness: 200, damping: 25 });

  return (
    <motion.div
      ref={ref}
      className={cx("[transform-style:preserve-3d]", className)}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        hover.set(1);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        hover.set(0);
      }}
      whileHover={{ scale: 1.02 }}
      transition={SPRING}
    >
      {children}
      <motion.div className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]" style={{ background: sheen, opacity: sheenOpacity }} aria-hidden />
    </motion.div>
  );
}

/** Soft glow that follows the pointer across a dark surface. */
export function Spotlight({ children, className, color = "255 90 54", ...rest }: { children: ReactNode; className?: string; color?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, rgb(${color} / 0.13), transparent 70%)`;
  return (
    <motion.div
      className={cx("relative overflow-hidden", className)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-400);
        y.set(-400);
      }}
      {...rest}
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: bg }} aria-hidden />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/** A ring of hearts bursting outward. Render with a changing `k` to replay. */
export function Burst({ k, className, color = "var(--color-ember)" }: { k: number; className?: string; color?: string }) {
  return (
    <AnimatePresence>
      {k > 0 && (
        <motion.span key={k} className={cx("pointer-events-none absolute inset-0 grid place-items-center", className)} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.55, duration: 0.25 }} aria-hidden>
          <motion.span className="absolute size-10 rounded-full" style={{ border: `2px solid ${color}` }} initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <motion.svg
                key={i}
                viewBox="0 0 24 24"
                className="absolute size-3"
                style={{ color }}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, scale: 1, opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <path fill="currentColor" d="M12 21s-7.5-4.6-9.5-9.3C1 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.7 4.5 7.2C19.5 16.4 12 21 12 21z" />
              </motion.svg>
            );
          })}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export { motion, AnimatePresence };
