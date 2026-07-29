import { useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { useParams } from "react-router-dom";
import { usePostDetail } from "../hooks/usePosts";
import { useCreateComment } from "../hooks/useCreateComment";
import { createCommentSchema } from "../lib/validation";
import { CommentCard } from "../components/CommentCard";
import { toRelativeTime } from "../utils/relativeTime";
import type { ApiErrorResponse } from "../types";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading } = usePostDetail(id);
  const createComment = useCreateComment(id ?? "");
  const [content, setContent] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = createCommentSchema.safeParse({ content });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "내용을 확인해 주세요.");
      return;
    }
    setFieldError(null);
    createComment.mutate(result.data, {
      onSuccess: () => setContent(""),
    });
  };

  if (isLoading) return <p className="text-sm text-ink/50">불러오는 중…</p>;
  if (!post)
    return <p className="text-sm text-ink/50">글을 찾을 수 없습니다.</p>;

  const serverMessage = extractErrorMessage(createComment.error);

  return (
    <div>
      <h1 className="mb-1 text-lg font-extrabold text-ink">{post.title}</h1>
      <p className="mb-4 text-xs text-ink/50">
        {post.author.nickname} · {toRelativeTime(post.createdAt)}
      </p>
      <p className="mb-6 whitespace-pre-wrap text-sm text-ink">
        {post.content}
      </p>

      <h2 className="mb-2.5 text-sm font-bold text-accent">
        댓글 {post.comments.length}
      </h2>
      <ul className="mb-5 flex flex-col gap-2.5">
        {post.comments.map((comment) => (
          <li key={comment.id}>
            <CommentCard comment={comment} />
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력해 주세요"
          rows={3}
          className="resize-none rounded-[14px] border border-border-warm bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        {(fieldError || serverMessage) && (
          <p className="text-xs text-red-600">{fieldError ?? serverMessage}</p>
        )}
        <button
          type="submit"
          disabled={createComment.isPending}
          className="self-end rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          댓글 작성
        </button>
      </form>
    </div>
  );
}

function extractErrorMessage(error: unknown): string | null {
  if (!isAxiosError<ApiErrorResponse>(error)) return null;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? "댓글 작성에 실패했습니다.";
}
