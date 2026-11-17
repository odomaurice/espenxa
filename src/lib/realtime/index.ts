/*
 * The single realtime entry point. With NEXT_PUBLIC_SOCKET_URL set, chats
 * run on the socket.io server; without it, on the labelled simulator.
 */
import { mockRealtime } from "./mock";
import { socketRealtime } from "./socket";
import type { Realtime } from "./types";

const URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let client: Realtime | null = null;

export function realtime(): Realtime {
  client ??= URL ? socketRealtime(URL) : mockRealtime();
  return client;
}

export type { Realtime, ServerEvents } from "./types";
