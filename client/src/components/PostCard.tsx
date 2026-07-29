import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import type { PostListItem } from "../types";
import { toRelativeTime } from "../utils/relativeTime";

export function PostCard({ post }: { post: PostListItem }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="block rounded-[14px] border border-border-warm bg-card px-4 py-3.5 transition hover:border-accent-soft"
    >
      <h3 className="mb-1 text-[15px] font-bold text-ink">{post.title}</h3>
      <p className="flex items-center gap-1.5 text-xs text-ink/50">
        {post.author.nickname} · {toRelativeTime(post.createdAt)}
        <span className="ml-2 inline-flex items-center gap-1">
          <MessageCircle size={12} />
          {post.commentCount}
        </span>
      </p>
    </Link>
  );
}
