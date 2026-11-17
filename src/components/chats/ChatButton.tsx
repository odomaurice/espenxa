"use client";

import { Message01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, errorMessage, Icon, Spinner } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";

/** Opens (or reuses) a chat with a companion so the plan is agreed before booking. */
export default function ChatButton({ personId, children = "Message", className, variant = "secondary" }: { personId: string; children?: React.ReactNode; className?: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { connectionId } = await api.social.openChat(personId);
            await qc.invalidateQueries({ queryKey: qk.connections });
            router.push(`/chats/${connectionId}`);
          } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
          }
        }}
        className={className ?? buttonClass(variant, "lg")}
      >
        {busy ? <Spinner className="size-4" /> : <Icon icon={Message01Icon} size={19} stroke={2} />} {children}
      </button>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </>
  );
}
