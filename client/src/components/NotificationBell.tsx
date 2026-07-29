import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

/**
 * 헤더의 종 아이콘 + 미읽음 뱃지 + 드롭다운(PLAN B-3). 우측 `NotificationPanel`과
 * 데이터 소스(`useNotifications`)를 공유하므로 항상 동일한 알림 목록을 보여준다 —
 * 헤더는 스크롤 위치와 무관하게 어디서든 빠르게 열어보는 용도, 우측 패널은 항상 펼쳐진 상시 뷰.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        className="relative rounded-full border border-border-warm bg-white p-2 text-ink hover:border-accent-soft"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-soft px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-bell-dropdown"
          className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border-warm bg-cream p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-xs font-bold text-accent">알림</span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-ink/50 hover:text-accent"
              >
                모두 읽음
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-0.5 py-4 text-center text-xs text-ink/40">
              읽지 않은 알림이 없습니다.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onRead={(id) => {
                      markRead.mutate(id);
                      setOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
