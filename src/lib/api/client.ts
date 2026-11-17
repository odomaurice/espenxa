/*
 * The single API entry point for every screen.
 *
 * Today this is the in-browser mock. When the backend is ready, add an HTTP
 * adapter implementing `MeetApi` (src/lib/api/contract.ts) and export it
 * here instead, behind NEXT_PUBLIC_API_URL. Screens do not change.
 */
import type { MeetApi } from "./contract";
import { mockApi } from "./mock";

export const api: MeetApi = mockApi;

/** True while screens run on simulated data. Shown in the UI. */
export const IS_MOCK = true;

/** Development-only helpers (simulated outbox, data reset). Absent in production. */
export const devTools = IS_MOCK ? mockApi.dev : null;
