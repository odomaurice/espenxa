"use client";

import Gates from "@/components/Gates";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ConfirmProvider } from "./Confirm";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";
import { ApiError, type Account } from "@/lib/api/types";

type Session = {
  account: Account | null;
  loading: boolean;
  /** Re-read the session after login, logout or profile changes. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: qk.me, queryFn: api.auth.me, staleTime: 60_000 });
  const value: Session = {
    account: data ?? null,
    loading: isPending,
    refresh: async () => {
      await qc.invalidateQueries({ queryKey: qk.me });
    },
    signOut: async () => {
      await api.auth.logout();
      qc.clear();
      qc.setQueryData(qk.me, null);
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <Providers>");
  return s;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <SessionProvider>
          <ConfirmProvider>
            <Gates>{children}</Gates>
          </ConfirmProvider>
        </SessionProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
