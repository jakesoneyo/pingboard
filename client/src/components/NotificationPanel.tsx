import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

/**
 * 3분할 레이아웃의 우측 열(DESIGN.md) — 항상 펼쳐진 알림 패널.
 * `NotificationBell`(헤더 드롭다운)과 같은 쿼리 키를 구독하므로 항상 같은 내용을 보여준다.
 */
export function NotificationPanel() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];

  return (
    <aside data-testid="notification-panel" className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-accent">알림</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs font-medium text-ink/50 hover:text-accent"
          >
            모두 읽음
          </button>
        )}
      </div>

      {isLoading && <p className="text-xs text-ink/40">불러오는 중…</p>}

      {!isLoading && items.length === 0 && (
        <p className="text-xs text-ink/40">읽지 않은 알림이 없습니다.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {items.map((notification) => (
          <li key={notification.id}>
            <NotificationItem
              notification={notification}
              onRead={(id) => markRead.mutate(id)}
            />
          </li>
        ))}
      </ul>
    </aside>
  );
}
