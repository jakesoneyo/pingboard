import type { CommentSummary } from "../types";
import { toRelativeTime } from "../utils/relativeTime";

/** DESIGN.md 시안 C — 흰 배경, radius 14px, 말풍선에 가까운 톤. */
export function CommentCard({ comment }: { comment: CommentSummary }) {
  return (
    <div className="rounded-[14px] border border-border-warm bg-card px-4 py-3">
      <p className="mb-1 text-[12.5px] font-bold text-accent">
        {comment.author.nickname}
      </p>
      <p className="text-sm text-ink">{comment.content}</p>
      <p className="mt-1.5 text-xs text-ink/40">
        {toRelativeTime(comment.createdAt)}
      </p>
    </div>
  );
}
