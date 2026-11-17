/*
 * socket.io adapter. Used when NEXT_PUBLIC_SOCKET_URL is set. Auth rides on
 * the session cookie, so the server must accept credentials from this origin.
 */
import { io, type Socket } from "socket.io-client";
import type { Realtime, ServerEvent, ServerEvents } from "./types";

export function socketRealtime(url: string): Realtime {
  let socket: Socket | null = null;
  const rooms = new Set<string>();
  const get = () => {
    if (!socket) {
      socket = io(url, { withCredentials: true, transports: ["websocket"], reconnection: true });
      // Rejoin open chats after a reconnect.
      socket.on("connect", () => rooms.forEach((connectionId) => socket?.emit("chat:join", { connectionId })));
    }
    return socket;
  };

  return {
    simulated: false,
    on<E extends ServerEvent>(event: E, cb: (payload: ServerEvents[E]) => void) {
      const s = get();
      const handler = (p: ServerEvents[E]) => cb(p);
      s.on(event as string, handler);
      return () => void s.off(event as string, handler);
    },
    join(connectionId) {
      rooms.add(connectionId);
      get().emit("chat:join", { connectionId });
    },
    leave(connectionId) {
      rooms.delete(connectionId);
      get().emit("chat:leave", { connectionId });
    },
    typing(connectionId, typing) {
      get().emit("typing", { connectionId, typing });
    },
    read(connectionId) {
      get().emit("chat:read", { connectionId });
    },
    sent() {},
  };
}
