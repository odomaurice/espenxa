/*
 * Chat realtime contract, shared by the socket.io adapter and the simulator.
 *
 * Messages are sent over HTTP (`api.social.send`, with a `clientId` so the
 * echo can replace the optimistic bubble). Everything live arrives here.
 *
 * Server to client events:
 *   message:new     { connectionId, message }
 *   message:status  { connectionId, messageIds, status: "delivered" | "read" }
 *   typing          { connectionId, userId, typing }
 *   presence        { userId, online, lastSeen }
 *
 * Client to server events:
 *   chat:join       { connectionId }   start receiving a chat's typing events
 *   chat:leave      { connectionId }
 *   typing          { connectionId, typing }
 *   chat:read       { connectionId }   the viewer has read everything
 */
import type { ID, ISODate, Message } from "@/lib/api/types";

export type ServerEvents = {
  "message:new": { connectionId: ID; message: Message };
  "message:status": { connectionId: ID; messageIds: ID[]; status: "delivered" | "read" };
  typing: { connectionId: ID; userId: ID; typing: boolean };
  presence: { userId: ID; online: boolean; lastSeen: ISODate | null };
};

export type ServerEvent = keyof ServerEvents;

export interface Realtime {
  /** True when this is the in-browser simulation, not a real chat server. */
  simulated: boolean;
  on<E extends ServerEvent>(event: E, cb: (payload: ServerEvents[E]) => void): () => void;
  join(connectionId: ID): void;
  leave(connectionId: ID): void;
  typing(connectionId: ID, typing: boolean): void;
  read(connectionId: ID): void;
  /** Called after `api.social.send` resolves. The socket server needs nothing; the simulator uses it to play the other side. */
  sent(connectionId: ID, message: Message): void;
}
