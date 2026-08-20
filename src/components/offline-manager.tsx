"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import {
  discardQueuedMutation,
  flushQueue,
  queuedMutationsForCurrentUser,
  retryQueuedMutation,
  type QueuedMutation,
} from "@/lib/offline/queue";
export default function OfflineManager() {
  const pathname = usePathname(),
    enabled = [
      "/app",
      "/onboarding",
      "/settings",
      "/community",
      "/tools",
      "/templates",
      "/referrals",
      "/admin",
      "/workspace",
      "/skills/",
      "/activities/",
      "/quests/",
      "/habits/",
      "/journal/",
      "/achievements/",
      "/goals/",
    ].some((path) => pathname.startsWith(path));
  const [online, setOnline] = useState(() =>
      typeof navigator === "undefined" ? true : navigator.onLine,
    ),
    [items, setItems] = useState<QueuedMutation[]>([]);
  useEffect(() => {
    if (!enabled) return;
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const refresh = async () => {
      let reachable = navigator.onLine;
      try {
        const response = await fetch("/health/live", { cache: "no-store" });
        reachable = response.ok;
      } catch {
        reachable = false;
      }
      setOnline(reachable);
      setItems(await queuedMutationsForCurrentUser());
      if (reachable) await flushQueue();
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("skilltree-sync-complete", refresh);
    window.addEventListener("skilltree-sync-changed", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("skilltree-sync-complete", refresh);
      window.removeEventListener("skilltree-sync-changed", refresh);
    };
  }, [enabled]);
  if (!enabled) return null;
  if (online && !items.length) return null;
  const conflicts = items.filter((item) => item.state === "conflict");
  return (
    <div className="offline-status" role="status">
      {online ? <RefreshCw /> : <CloudOff />}
      <span>
        {!online
          ? "Offline — changes remain pending sync"
          : conflicts.length
            ? `${conflicts.length} change${conflicts.length === 1 ? "" : "s"} need review`
            : `${items.length} change${items.length === 1 ? "" : "s"} pending sync`}
      </span>
      {conflicts.length > 0 && (
        <details>
          <summary>Review</summary>
          {conflicts.map((item) => (
            <div key={item.id}>
              <small>
                {item.url.replace("/api/v1/", "")} · {item.lastError}
              </small>
              <button onClick={() => retryQueuedMutation(item.id)}>
                <RefreshCw /> Retry
              </button>
              <button onClick={() => discardQueuedMutation(item.id)}>
                <Trash2 /> Discard
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
