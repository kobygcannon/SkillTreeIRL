"use client";
import { createClient } from "../supabase/client";
const DB = "skilltree-offline",
  STORE = "mutations",
  VERSION = 1;
export type QueuedMutation = {
  id: string;
  ownerId?: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  createdAt: string;
  attempts: number;
  state: "pending" | "conflict";
  lastError?: string;
  nextAttemptAt?: string;
};
async function currentUserId() {
  const client = createClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user?.id || null;
}
export function classifySyncResponse(status: number) {
  if (status >= 200 && status < 300) return "confirmed" as const;
  if ([400, 404, 409, 410, 422].includes(status)) return "conflict" as const;
  if ([401, 403].includes(status)) return "authentication" as const;
  return "retry" as const;
}
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function save(item: QueuedMutation) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function queuedMutations() {
  const db = await database();
  const items = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function queuedMutationsForCurrentUser(){const ownerId=await currentUserId();if(!ownerId)return[];return(await queuedMutations()).filter(item=>item.ownerId===ownerId)}
async function remove(id: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function discardQueuedMutation(id: string) {
  await remove(id);
  window.dispatchEvent(new CustomEvent("skilltree-sync-changed"));
}
export async function retryQueuedMutation(id: string) {
  const item = (await queuedMutations()).find((value) => value.id === id);
  if (!item) return;
  await save({
    ...item,
    state: "pending",
    attempts: 0,
    lastError: undefined,
    nextAttemptAt: undefined,
  });
  window.dispatchEvent(new CustomEvent("skilltree-sync-changed"));
  await flushQueue();
}
export async function resilientFetch(url: string, init: RequestInit = {}) {
  try {
    if (!navigator.onLine) throw new TypeError("offline");
    return await fetch(url, init);
  } catch (error) {
    const method = (init.method || "GET").toUpperCase();
    if (!["POST", "PATCH", "PUT"].includes(method)) throw error;
    const ownerId = await currentUserId();
    if (!ownerId) throw error;
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    if (!headers["idempotency-key"])
      headers["idempotency-key"] = crypto.randomUUID();
    await save({
      id: headers["idempotency-key"],
      ownerId,
      url,
      method,
      headers,
      body: typeof init.body === "string" ? init.body : null,
      createdAt: new Date().toISOString(),
      attempts: 0,
      state: "pending",
    });
    window.dispatchEvent(new CustomEvent("skilltree-sync-changed"));
    return new Response(JSON.stringify({ data: { pendingSync: true } }), {
      status: 202,
      headers: {
        "content-type": "application/json",
        "x-skilltree-offline": "queued",
      },
    });
  }
}
export async function flushQueue() {
  if (!navigator.onLine) return;
  const ownerId = await currentUserId();
  if (!ownerId) return;
  let changed = false;
  for (const item of await queuedMutations()) {
    if (
      item.ownerId !== ownerId ||
      item.state === "conflict" ||
      (item.nextAttemptAt && new Date(item.nextAttemptAt) > new Date())
    )
      continue;
    try {
      const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        }),
        classification = classifySyncResponse(response.status);
      if (classification === "confirmed") {
        await remove(item.id);
        changed = true;
        continue;
      }
      if (classification === "authentication") break;
      const payload = await response
          .clone()
          .json()
          .catch(() => null),
        message = String(
          payload?.error?.message || `Sync returned HTTP ${response.status}`,
        ).slice(0, 300),
        attempts = item.attempts + 1;
      if (classification === "conflict") {
        await save({
          ...item,
          state: "conflict",
          attempts,
          lastError: message,
          nextAttemptAt: undefined,
        });
        changed = true;
        continue;
      }
      await save({
        ...item,
        attempts,
        lastError: message,
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600000, 5000 * 2 ** attempts),
        ).toISOString(),
      });
      changed = true;
    } catch (error) {
      const attempts = item.attempts + 1;
      await save({
        ...item,
        attempts,
        lastError:
          error instanceof Error
            ? error.message.slice(0, 300)
            : "Connection failed",
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600000, 5000 * 2 ** attempts),
        ).toISOString(),
      });
      changed = true;
      break;
    }
  }
  if (changed) window.dispatchEvent(new CustomEvent("skilltree-sync-complete"));
}
export async function queuedCount() {
  return (await queuedMutations()).length;
}
export async function clearOfflineData() {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if ("caches" in window)
    for (const key of await caches.keys())
      if (key.startsWith("skilltree-")) await caches.delete(key);
  navigator.serviceWorker?.controller?.postMessage({
    type: "CLEAR_PRIVATE_CACHE",
  });
}
