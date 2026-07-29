import { Link } from "react-router-dom";
import type { NotificationDto } from "../types";
import { toRelativeTime } from "../utils/relativeTime";

interface NotificationItemProps {
  notification: NotificationDto;
  onRead: (id: string) => void;
}

/**
 * 알림 카드 — DESIGN.md 시안 C의 흰 배경·radius 14px 말풍선 톤을 그대로 따른다.
 * 클릭하면 해당 글로 이동함과 동시에 읽음 처리한다(US-11). 이미 목록이
 * "미읽음만" 뷰이므로 클릭 = 곧 그 알림이 사라진다는 게 사용자에게 자연스럽다.
 */
export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  return (
    <Link
      to={`/posts/${notification.post.id}`}
      onClick={() => onRead(notification.id)}
      className="block rounded-[14px] border border-border-warm bg-card px-3.5 py-3 text-sm transition hover:border-accent-soft"
    >
      <p className="mb-1">
        <span className="font-bold text-accent">
          {notification.actor.nickname}
        </span>
        <span className="text-ink"> 님이 댓글을 남겼습니다</span>
      </p>
      <p className="truncate text-ink/70">
        {notification.post.title} · {notification.commentPreview}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/40">
        <span className="inline-block h-[7px] w-[7px] rounded-full bg-accent-soft" />
        {toRelativeTime(notification.createdAt)}
      </p>
    </Link>
  );
}
