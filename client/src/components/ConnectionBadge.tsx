import { usePresenceStore } from "../stores/presence.store";

/**
 * 소켓 연결 상태를 있는 그대로 보여주는 뱃지 — 눈속임 UI 금지(PLAN B-3).
 * `연결됨 · 탭 N`은 `presence:sync`가 보낸 실제 연결 수를 반영하므로,
 * 다중 탭을 열어 보면 이 숫자가 실시간으로 오르내리는 것을 확인할 수 있다(SC-4).
 */
export function ConnectionBadge() {
  const status = usePresenceStore((s) => s.status);
  const connections = usePresenceStore((s) => s.connections);

  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-white px-3 py-1 text-xs font-medium text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        연결됨 · 탭 {connections}
      </span>
    );
  }

  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-white px-3 py-1 text-xs font-medium text-ink/60">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-soft" />
        재연결 중…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-white px-3 py-1 text-xs font-medium text-ink/40">
      <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
      연결 안 됨
    </span>
  );
}
