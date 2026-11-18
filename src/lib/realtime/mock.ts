/*
 * DEVELOPMENT ONLY. Plays the other side of a chat until the socket server
 * exists: your message is delivered, read while they are "in the chat",
 * then they type and reply with a canned line. The UI labels this as
 * simulated. Nothing here is a real person.
 */
import { mockPeer, mockPeerSaw, mockPeerSend } from "@/lib/api/mock";
import type { ID } from "@/lib/api/types";
import type { Realtime, ServerEvent, ServerEvents } from "./types";

type Handler = (p: unknown) => void;

const REPLIES: [RegExp, string][] = [
  [/\b(where|venue|place|restaurant|meet at|location)\b/i, "That place works for me. Shall we meet at the entrance?"],
  [/\b(when|time|pm|am|tomorrow|today|saturday|sunday|friday)\b/i, "That time suits me. I will put it in my calendar."],
  [/\b(price|pay|cost|money|fee)\b/i, "Payment goes through espenxa once we agree on the plan, so we are both covered."],
  [/\b(hi|hello|hey|good (morning|afternoon|evening))\b/i, "Hi! Nice to hear from you. What did you have in mind?"],
  [/\?\s*$/, "Good question. Let me think and I will tell you shortly."],
];
const FALLBACK = ["Sounds good to me.", "Lovely, thank you for letting me know.", "Perfect. Anything else you would like to plan?"];

export function mockRealtime(): Realtime {
  const handlers = new Map<ServerEvent, Set<Handler>>();
  const viewing = new Set<ID>();
  const timers = new Map<ID, ReturnType<typeof setTimeout>[]>();
  let fallback = 0;

  const emit = <E extends ServerEvent>(event: E, payload: ServerEvents[E]) => handlers.get(event)?.forEach((h) => h(payload));
  const clear = (id: ID) => {
    timers.get(id)?.forEach(clearTimeout);
    timers.set(id, []);
  };
  const later = (id: ID, ms: number, fn: () => void) => timers.get(id)!.push(setTimeout(fn, ms));

  return {
    simulated: true,
    on(event, cb) {
      const set = handlers.get(event) ?? new Set();
      set.add(cb as Handler);
      handlers.set(event, set);
      return () => void set.delete(cb as Handler);
    },
    join: (id) => void viewing.add(id),
    leave: (id) => void viewing.delete(id),
    typing() {},
    read() {},
    sent(connectionId, message) {
      const peer = mockPeer(connectionId);
      if (!peer) return;
      // A new message restarts the other side's reaction, like a real person waiting for you to finish.
      clear(connectionId);
      const reply = REPLIES.find(([re]) => re.test(message.body))?.[1] ?? FALLBACK[fallback++ % FALLBACK.length];
      later(connectionId, 700, () => {
        const ids = mockPeerSaw(connectionId, false);
        if (ids.length) emit("message:status", { connectionId, messageIds: ids, status: "delivered" });
        emit("presence", { userId: peer.id, online: true, lastSeen: new Date().toISOString() });
      });
      later(connectionId, 1800, () => {
        const ids = mockPeerSaw(connectionId, true);
        if (ids.length) emit("message:status", { connectionId, messageIds: ids, status: "read" });
      });
      const typeFor = Math.min(4200, 1200 + reply.length * 45);
      later(connectionId, 2600, () => emit("typing", { connectionId, userId: peer.id, typing: true }));
      later(connectionId, 2600 + typeFor, () => {
        emit("typing", { connectionId, userId: peer.id, typing: false });
        const m = mockPeerSend(connectionId, reply);
        if (m) emit("message:new", { connectionId, message: m });
      });
    },
  };
}
