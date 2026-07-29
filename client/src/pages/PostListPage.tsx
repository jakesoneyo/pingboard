import { useState } from "react";
import { usePosts } from "../hooks/usePosts";
import { PostCard } from "../components/PostCard";

const LIMIT = 20;

export function PostListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePosts(page, LIMIT);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-ink">전체 글</h1>

      {isLoading && <p className="text-sm text-ink/50">불러오는 중…</p>}

      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-ink/50">
          아직 글이 없습니다. 첫 글을 작성해 보세요.
        </p>
      )}

      <ul className="flex flex-col gap-2.5">
        {data?.items.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-border-warm px-3 py-1 text-ink/60 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-ink/50">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-border-warm px-3 py-1 text-ink/60 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
