"use client";

/*
 * App-wide confirmation for serious actions (sign out, block, cancel,
 * delete, decline...). Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Sign out?", confirmLabel: "Sign out" }))) return;
 */
import { Alert02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button, cx, Dialog, Icon } from "./ui";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive or irreversible actions. */
  tone?: "danger" | "default";
};

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    resolver.current?.(false);
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const danger = opts?.tone === "danger";
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onClose={() => close(false)} title={opts?.title ?? ""}>
        {opts && (
          <div>
            <div className="flex gap-4">
              <motion.span
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 16 }}
                className={cx("grid size-12 shrink-0 place-items-center rounded-full", danger ? "bg-bad/12 text-bad" : "bg-char text-cream")}
              >
                <Icon icon={danger ? Alert02Icon : InformationCircleIcon} size={22} />
              </motion.span>
              <div className="pt-1 text-[15px] leading-relaxed text-mute">{opts.body ?? "Are you sure you want to continue?"}</div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-2.5">
              <Button variant="secondary" size="lg" onClick={() => close(false)} autoFocus>
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant={danger ? "danger" : "primary"} size="lg" onClick={() => close(true)} className={danger ? "bg-bad! text-white! hover:bg-bad/90!" : undefined}>
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return c;
}
